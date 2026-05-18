import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import { getNarratorIntroSampleDisplay } from '../constants/narratorIntroSamples'
import {
  PREVIEW_CACHE_GEN,
  prefetchNarratorPreviewMp3
} from '../utils/narratorPreviewAudioCache'
import { buildNarratorPreviewApiUrl, runNarratorPreviewOnClick } from '../utils/narratorPreviewClick'
import { speakNarratorBrowserPreview } from '../utils/narratorBrowserSpeech'
import {
  prepareNarratorPreviewAudio,
  speakFirstBrowserPreviewClauseInGesture
} from '../utils/playNarratorPreviewAudio'
import { previewLog } from '../utils/narratorPreviewDebug'
import { VoiceReactiveBars } from './VoiceReactiveBars'

const PREVIEW_EVENT = 'katha-narrator-preview'

type PreviewMode = 'idle' | 'loading' | 'playing'

type Props = {
  narratorId: string
  disabled?: boolean
  compact?: boolean
}

export function NarratorPlaySample({ narratorId, disabled, compact = false }: Props) {
  const uiText = useUiText()
  const [mode, setMode] = useState<PreviewMode>('idle')
  const [err, setErr] = useState(false)
  const [errDetail, setErrDetail] = useState('')
  const [usedBrowser, setUsedBrowser] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [previewSource, setPreviewSource] = useState<'openai' | 'browser' | null>(null)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)

  const sessionRef = useRef(0)
  const stopRef = useRef<(() => void) | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unbindProgressRef = useRef<(() => void) | null>(null)

  const base = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')
  const previewUrl = useMemo(
    () => buildNarratorPreviewApiUrl(narratorId, storyLanguage || 'ne', PREVIEW_CACHE_GEN, base),
    [base, narratorId, storyLanguage]
  )

  const spokenLine =
    getNarratorIntroSampleDisplay(narratorId, storyLanguage) || uiText('narratorSampleSpokenLine')
  const showIntro = !compact && mode === 'playing'

  const bindAudioProgress = useCallback((audio: HTMLAudioElement) => {
    unbindProgressRef.current?.()
    const onTime = () => {
      if (audio.duration > 0 && Number.isFinite(audio.duration)) {
        setPlayProgress(Math.min(1, audio.currentTime / audio.duration))
      }
    }
    const onEnd = () => setPlayProgress(0)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    unbindProgressRef.current = () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const stopPlayback = useCallback(() => {
    sessionRef.current += 1
    stopRef.current?.()
    stopRef.current = null
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.pause()
      audio.removeAttribute('src')
      audioRef.current = null
    }
    unbindProgressRef.current?.()
    unbindProgressRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setPlayProgress(0)
    setMode('idle')
    setUsedBrowser(false)
    setPreviewSource(null)
  }, [])

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string }>).detail
      if (!d?.id || d.id === narratorId) return
      stopPlayback()
      setErr(false)
      setErrDetail('')
    }
    window.addEventListener(PREVIEW_EVENT, on as EventListener)
    return () => window.removeEventListener(PREVIEW_EVENT, on as EventListener)
  }, [narratorId, stopPlayback])

  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [narratorId, stopPlayback])

  useEffect(() => {
    if (disabled || !previewUrl) return
    void prefetchNarratorPreviewMp3(previewUrl)
  }, [disabled, previewUrl])

  const startPreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return

    if (mode === 'playing' || mode === 'loading') {
      stopPlayback()
      return
    }

    setErr(false)
    setErrDetail('')
    window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { id: narratorId } }))

    const session = ++sessionRef.current
    const audio = new Audio()
    prepareNarratorPreviewAudio(audio)
    audioRef.current = audio
    bindAudioProgress(audio)

    const spokeSync = speakFirstBrowserPreviewClauseInGesture(narratorId, storyLanguage)
    setMode(spokeSync ? 'playing' : 'loading')
    setUsedBrowser(true)
    setPreviewSource('browser')
    previewLog('ui_play_start', { narratorId, spokeSync })

    stopRef.current = runNarratorPreviewOnClick({
      narratorId,
      storyLanguage,
      previewUrl,
      audio,
      isActive: () => session === sessionRef.current,
      onLoading: () => {
        if (session !== sessionRef.current) return
        setMode((m) => (m === 'playing' ? m : 'loading'))
      },
      onPlaying: (source) => {
        if (session !== sessionRef.current) return
        setPreviewSource(source)
        setUsedBrowser(source === 'browser')
        setMode('playing')
      },
      onIdle: () => {
        if (session !== sessionRef.current) return
        stopPlayback()
      },
      onError: (detail) => {
        if (session !== sessionRef.current) return
        let recovered = false
        void speakNarratorBrowserPreview({
          narratorId,
          storyLanguage,
          isCancelled: () => session !== sessionRef.current || recovered,
          onError: () => {
            if (session !== sessionRef.current) return
            setErr(true)
            setErrDetail(detail || uiText('narratorSampleErrorShort'))
            setMode('idle')
            stopPlayback()
          },
          onEnd: () => {
            if (session !== sessionRef.current) return
            recovered = true
            stopPlayback()
          }
        })
      },
      bindEnded: (stop) => {
        if (session !== sessionRef.current) return
        audio.onended = () => {
          if (session === sessionRef.current) stop()
        }
      }
    })
  }

  const loading = mode === 'loading'
  const playing = mode === 'playing'

  const playBtnTitle = err
    ? errDetail || uiText('narratorSampleError')
    : loading
      ? uiText('narratorSampleGenerating')
      : playing
        ? uiText('narratorPlayStop')
        : uiText('narratorPlaySample')

  return (
    <div
      className={`narrator-list__play ${compact ? 'narrator-list__play--compact' : ''} ${!compact && (showIntro || err) ? 'narrator-list__play--wide' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="narrator-list__play-top">
        <button
          type="button"
          className={`narrator-list__play-btn ${playing || loading ? 'narrator-list__play-btn--on' : ''}`}
          disabled={Boolean(disabled)}
          onClick={startPreview}
          title={playBtnTitle}
          aria-label={playing || loading ? uiText('narratorPlayStop') : uiText('narratorPlaySample')}
          aria-busy={loading}
        >
          {loading ? (
            <span className="narrator-list__play-skel" aria-hidden>
              {uiText('narratorSampleLoadingDots')}
            </span>
          ) : playing ? (
            <span className="narrator-list__play-icon" aria-hidden>
              ▮
            </span>
          ) : (
            <span className="narrator-list__play-icon" aria-hidden>
              ▶
            </span>
          )}
        </button>
        {compact ? null : <VoiceReactiveBars active={playing} />}
        {!compact && playing ? (
          <div
            className="narrator-list__play-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(playProgress * 100)}
            aria-label={uiText('narratorPlaySample')}
          >
            <span
              className="narrator-list__play-progress-fill"
              style={{ width: `${Math.round(playProgress * 100)}%` }}
            />
          </div>
        ) : null}
        {loading && !compact ? (
          <span className="narrator-list__play-loading" aria-live="polite">
            {uiText('narratorSampleGenerating')}
          </span>
        ) : null}
        {err ? (
          <>
            <span className="narrator-list__play-err" title={errDetail || uiText('narratorSampleError')}>
              {uiText('narratorSampleErrorShort')}
            </span>
            <button
              type="button"
              className="narrator-list__play-retry btn btn-small"
              onClick={(e) => {
                e.stopPropagation()
                setErr(false)
                setErrDetail('')
                startPreview(e)
              }}
            >
              {uiText('narratorSampleRetry')}
            </button>
          </>
        ) : null}
      </div>
      {showIntro ? (
        <div className="narrator-list__play-intro" aria-live="polite">
          <span className="narrator-list__play-intro-kicker">{uiText('narratorSampleIntroWhilePlay')}</span>
          <p className="narrator-list__play-intro-text">{spokenLine}</p>
          {usedBrowser ? (
            <p className="narrator-list__play-intro-hint narrator-list__play-intro-hint--warn">
              {uiText('narratorSampleUsingBrowserVoice')}
            </p>
          ) : null}
          {previewSource === 'openai' ? (
            <p className="narrator-list__play-intro-hint">{uiText('narratorSampleCinematicVoice')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
