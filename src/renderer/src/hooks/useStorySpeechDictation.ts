import { useCallback, useEffect, useRef, useState } from 'react'
import type { UiTranslateFn } from '../i18n/useAppI18n'
import type { IdeaSpeechRecognition, IdeaSpeechRecognitionEvent } from '../utils/speechInput'
import { getSpeechRecognitionCtor, speechRecognitionAvailable } from '../utils/speechInput'
import { pickSpeechRecognitionLang } from '../utils/speechLang'
import {
  applySpokenPunctuation,
  combineRecognitionResults,
  deleteLastSentence,
  detectVoiceCommand,
  lightDictationFormat,
  mergeDictationIntoIdea,
  type DictationInsertMode,
  type VoiceCommandEffect
} from '../utils/speechDictation'

export type VoiceMicPhase = 'idle' | 'listening' | 'paused' | 'processing' | 'error' | 'complete'

const MAX_IDEA = 500

async function primeSpeechMic(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    stream.getTracks().forEach((tr) => tr.stop())
  } catch {
    /* still try SpeechRecognition */
  }
}

type Props = {
  idea: string
  setIdea: (next: string) => void
  ideaRef: React.RefObject<HTMLTextAreaElement | null>
  storyLanguage: string
  uiLanguage: string
  busy: boolean
  setError: (msg: string | null) => void
  uiText: UiTranslateFn
}

export function useStorySpeechDictation({
  idea,
  setIdea,
  ideaRef,
  storyLanguage,
  uiLanguage,
  busy,
  setError,
  uiText
}: Props) {
  const canUseSpeech = speechRecognitionAvailable()
  const [voiceMicPhase, setVoiceMicPhase] = useState<VoiceMicPhase>('idle')

  const ideaLiveRef = useRef(idea)
  useEffect(() => {
    ideaLiveRef.current = idea
  }, [idea])

  const speechRef = useRef<{
    rec: IdeaSpeechRecognition | null
    listeningIntent: boolean
    pausedByVoice: boolean
    restartCount: number
    clearingBuffers: boolean
  }>({ rec: null, listeningIntent: false, pausedByVoice: false, restartCount: 0, clearingBuffers: false })

  const insertModeRef = useRef<DictationInsertMode>('append_cursor')
  const polishOnStopRef = useRef(false)
  const undoStackRef = useRef<string[]>([])
  const phaseResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushUndo = useCallback((snapshot: string) => {
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-24)
  }, [])

  const schedulePhase = useCallback((phase: VoiceMicPhase, ms: number) => {
    if (phaseResetTimerRef.current) clearTimeout(phaseResetTimerRef.current)
    setVoiceMicPhase(phase)
    phaseResetTimerRef.current = setTimeout(() => {
      phaseResetTimerRef.current = null
      setVoiceMicPhase('idle')
    }, ms)
  }, [])

  const stopRecognitionHard = useCallback(() => {
    const rec = speechRef.current.rec
    if (!rec) return
    try {
      rec.abort?.()
      rec.stop()
    } catch {
      /* ignore */
    }
  }, [])

  const runPolishIfNeeded = useCallback(async () => {
    if (!polishOnStopRef.current) {
      setVoiceMicPhase('idle')
      return
    }
    polishOnStopRef.current = false
    const raw = ideaLiveRef.current.trim()
    if (!raw) {
      setVoiceMicPhase('idle')
      return
    }
    const k = window.katha
    if (!k?.aiComplete) {
      setVoiceMicPhase('idle')
      return
    }
    setVoiceMicPhase('processing')
    try {
      const r = await k.aiComplete({
        system:
          'You polish story seed dictation. Preserve meaning and any language mixing (e.g. Nepali + English). ' +
          'Fix grammar lightly; keep tone. Output ONLY the polished text, no quotes.',
        user: raw,
        preferProvider: 'gemini',
        maxTokens: 900
      })
      const text = String(r.text || '').trim().slice(0, MAX_IDEA)
      if (text) {
        pushUndo(ideaLiveRef.current)
        setIdea(text)
        ideaLiveRef.current = text
      }
      schedulePhase('complete', 900)
    } catch {
      schedulePhase('complete', 600)
    }
  }, [pushUndo, schedulePhase, setIdea])

  const handleVoiceSideEffect = useCallback(
    (effect: VoiceCommandEffect): boolean => {
      switch (effect.kind) {
        case 'none':
          return false
        case 'pause': {
          speechRef.current.pausedByVoice = true
          stopRecognitionHard()
          setVoiceMicPhase('paused')
          return true
        }
        case 'resume': {
          speechRef.current.pausedByVoice = false
          try {
            speechRef.current.rec?.start()
            setVoiceMicPhase('listening')
          } catch {
            setError(uiText('voiceResumeErr'))
            setVoiceMicPhase('error')
            schedulePhase('idle', 1600)
          }
          return true
        }
        case 'clear_buffers': {
          speechRef.current.clearingBuffers = true
          stopRecognitionHard()
          speechRef.current.restartCount = 0
          return true
        }
        case 'toggle_insert_mode': {
          insertModeRef.current =
            insertModeRef.current === 'append_end' ? 'append_cursor' : 'append_end'
          return true
        }
        case 'toggle_overwrite_mode': {
          insertModeRef.current =
            insertModeRef.current === 'overwrite' ? 'append_cursor' : 'overwrite'
          return true
        }
        case 'trigger_polish': {
          polishOnStopRef.current = true
          return true
        }
        case 'undo': {
          const prev = undoStackRef.current.pop()
          if (prev !== undefined) {
            setIdea(prev)
            ideaLiveRef.current = prev
          }
          return true
        }
        case 'delete_last_sentence': {
          pushUndo(ideaLiveRef.current)
          const next = deleteLastSentence(ideaLiveRef.current).slice(0, MAX_IDEA)
          setIdea(next)
          ideaLiveRef.current = next
          return true
        }
        default:
          return false
      }
    },
    [pushUndo, schedulePhase, setError, setIdea, stopRecognitionHard, uiText]
  )

  const onResultRef = useRef<(event: IdeaSpeechRecognitionEvent) => void>(() => {})

  useEffect(() => {
    onResultRef.current = (event: IdeaSpeechRecognitionEvent) => {
      if (speechRef.current.pausedByVoice) return

      const { finals, interim } = combineRecognitionResults(event.results)
      const hasInterim = interim.length > 0
      const combinedRaw = `${finals}${finals && interim ? ' ' : ''}${interim}`.trim()

      if (!hasInterim && combinedRaw) {
        const cmd = detectVoiceCommand(combinedRaw)
        if (cmd.kind !== 'none') {
          handleVoiceSideEffect(cmd)
          return
        }
      }

      let spoken = applySpokenPunctuation(combinedRaw)
      spoken = lightDictationFormat(spoken)
      if (!spoken) return

      const el = ideaRef.current
      const mode = insertModeRef.current
      const anchorStart =
        mode === 'overwrite' ? 0 : mode === 'append_end' ? ideaLiveRef.current.length : el?.selectionStart ?? ideaLiveRef.current.length
      const anchorEnd =
        mode === 'overwrite'
          ? ideaLiveRef.current.length
          : mode === 'append_end'
            ? ideaLiveRef.current.length
            : el?.selectionEnd ?? anchorStart

      const merged = mergeDictationIntoIdea({
        idea: ideaLiveRef.current,
        spokenProcessed: spoken,
        mode:
          mode === 'overwrite' ? 'overwrite' : mode === 'append_end' ? 'append_end' : 'append_cursor',
        anchorStart,
        anchorEnd,
        maxLen: MAX_IDEA
      })

      setIdea(merged)
      ideaLiveRef.current = merged

      requestAnimationFrame(() => {
        const ta = ideaRef.current
        if (!ta) return
        try {
          ta.selectionStart = ta.selectionEnd = Math.min(merged.length, ta.value.length)
        } catch {
          /* ignore */
        }
      })
    }
  }, [handleVoiceSideEffect, ideaRef, setIdea])

  const ensureRecognition = useCallback(() => {
    const SR = getSpeechRecognitionCtor()
    if (!SR) return null
    if (speechRef.current.rec) return speechRef.current.rec

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = pickSpeechRecognitionLang(navigator.language, storyLanguage, uiLanguage)

    rec.onresult = (e: IdeaSpeechRecognitionEvent) => onResultRef.current(e)

    rec.onerror = (e) => {
      speechRef.current.listeningIntent = false
      speechRef.current.pausedByVoice = false
      setVoiceMicPhase('error')
      setError(e.error ? `${uiText('voiceFabAria')}: ${e.error}` : uiText('voiceErrGeneric'))
      schedulePhase('idle', 2200)
    }

    rec.onend = () => {
      if (speechRef.current.clearingBuffers) {
        speechRef.current.clearingBuffers = false
        window.setTimeout(() => {
          try {
            if (speechRef.current.listeningIntent && !speechRef.current.pausedByVoice) {
              rec.start()
              setVoiceMicPhase('listening')
            }
          } catch {
            speechRef.current.listeningIntent = false
            void runPolishIfNeeded()
          }
        }, 160)
        return
      }
      if (speechRef.current.pausedByVoice) {
        setVoiceMicPhase('paused')
        return
      }
      if (!speechRef.current.listeningIntent) {
        void runPolishIfNeeded()
        return
      }
      if (speechRef.current.restartCount > 10) {
        speechRef.current.listeningIntent = false
        void runPolishIfNeeded()
        return
      }
      speechRef.current.restartCount++
      window.setTimeout(() => {
        try {
          if (speechRef.current.listeningIntent && !speechRef.current.pausedByVoice) {
            rec.start()
          }
        } catch {
          speechRef.current.listeningIntent = false
          void runPolishIfNeeded()
        }
      }, 140)
    }

    speechRef.current.rec = rec
    return rec
  }, [runPolishIfNeeded, schedulePhase, setError, storyLanguage, uiText, uiLanguage])

  const toggleVoiceToIdea = useCallback(async () => {
    setError(null)
    if (busy || !canUseSpeech) {
      setError(uiText('voiceFabUnsupportedHint'))
      return
    }

    const activeRec = ensureRecognition()
    if (!activeRec) {
      setError(uiText('voiceFabUnsupportedHint'))
      return
    }

    if (voiceMicPhase === 'listening') {
      speechRef.current.listeningIntent = false
      speechRef.current.pausedByVoice = false
      speechRef.current.restartCount = 0
      stopRecognitionHard()
      return
    }

    if (voiceMicPhase === 'paused') {
      speechRef.current.pausedByVoice = false
      speechRef.current.listeningIntent = true
      speechRef.current.restartCount = 0
      try {
        activeRec.lang = pickSpeechRecognitionLang(navigator.language, storyLanguage, uiLanguage)
        activeRec.start()
        setVoiceMicPhase('listening')
      } catch {
        setError(uiText('voiceResumeErr'))
        setVoiceMicPhase('error')
        schedulePhase('idle', 1600)
      }
      return
    }

    await primeSpeechMic()
    speechRef.current.listeningIntent = true
    speechRef.current.pausedByVoice = false
    speechRef.current.restartCount = 0

    try {
      activeRec.lang = pickSpeechRecognitionLang(navigator.language, storyLanguage, uiLanguage)
      activeRec.start()
      setVoiceMicPhase('listening')
    } catch (e) {
      speechRef.current.listeningIntent = false
      setError(e instanceof Error ? e.message : String(e))
      setVoiceMicPhase('error')
      schedulePhase('idle', 1600)
    }
  }, [
    busy,
    canUseSpeech,
    ensureRecognition,
    schedulePhase,
    setError,
    stopRecognitionHard,
    storyLanguage,
    uiText,
    uiLanguage,
    voiceMicPhase
  ])

  useEffect(() => {
    const speech = speechRef.current
    return () => {
      speech.listeningIntent = false
      stopRecognitionHard()
      if (phaseResetTimerRef.current) clearTimeout(phaseResetTimerRef.current)
    }
  }, [stopRecognitionHard])

  const voiceMicTitle = !canUseSpeech
    ? uiText('voiceFabUnsupportedHint')
    : voiceMicPhase === 'listening'
      ? uiText('voiceFabStopHint')
      : voiceMicPhase === 'paused'
        ? uiText('voiceFabPausedHint')
        : voiceMicPhase === 'processing'
          ? uiText('voiceFabProcessingHint')
          : voiceMicPhase === 'error'
            ? uiText('voiceFabErrorHint')
            : voiceMicPhase === 'complete'
              ? uiText('voiceFabCompleteHint')
              : uiText('voiceFabHint')

  return {
    voiceMicPhase,
    voiceMicTitle,
    toggleVoiceToIdea,
    canUseSpeech
  }
}
