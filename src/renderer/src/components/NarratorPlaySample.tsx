import { useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { getNarratorIntroSampleDisplay } from '../constants/narratorIntroSamples'
import {
  getCachedNarratorPreviewBlobUrl,
  prefetchNarratorPreviewMp3
} from '../utils/narratorPreviewAudioCache'
import { speakNarratorBrowserPreview } from '../utils/narratorBrowserSpeech'
import { VoiceReactiveBars } from './VoiceReactiveBars'

const PREVIEW_EVENT = 'katha-narrator-preview'
const PREVIEW_STOP_EVENT = 'katha-narrator-preview-stop'
let currentFetch: AbortController | null = null
let globalStop: (() => void) | null = null

type Props = { narratorId: string; disabled?: boolean; /** Icon-only + no intro copy (e.g. column-1 wireframe) */ compact?: boolean }

async function blobLooksLikeMp3(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false
  const a = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  if (a[0] === 0x49 && a[1] === 0x44 && a[2] === 0x33) return true
  if (a[0] === 0xff && (a[1] & 0xe0) === 0xe0) return true
  return false
}

/** TTS from /api/narrator-preview; validates MP3; shows intro while loading/playing; Web Speech fallback. */
export function NarratorPlaySample({ narratorId, disabled, compact = false }: Props) {
  const uiText = useUiText()
  const [mode, setMode] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [err, setErr] = useState(false)
  const [usedBrowser, setUsedBrowser] = useState(false)
  /** Only object URLs we created from fetch — never revoke cached shared blobs */
  const ownedRevocableUrl = useRef<string | null>(null)
  const ownStop = useRef<(() => void) | null>(null)
  const speechPlanned = useRef(false)
  const browserCancel = useRef(false)

  const base = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')
  /** Intro audio is narrator-specific only (same MP3 regardless of UI language). */
  const previewUrl = useMemo(
    () => `${base || ''}/api/narrator-preview?narratorId=${encodeURIComponent(narratorId)}`,
    [base, narratorId]
  )
  const spokenLine = getNarratorIntroSampleDisplay(narratorId) || uiText('narratorSampleSpokenLine')
  const showIntro = !compact && (mode === 'loading' || mode === 'playing')

  const revokeOwnedBlobUrl = () => {
    if (ownedRevocableUrl.current) {
      URL.revokeObjectURL(ownedRevocableUrl.current)
      ownedRevocableUrl.current = null
    }
  }

  const resetStopRefs = () => {
    ownStop.current = null
  }

  const playWithBrowserTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErr(true)
      setMode('idle')
      setUsedBrowser(false)
      return
    }
    setUsedBrowser(true)
    setMode('playing')
    window.speechSynthesis.cancel()
    browserCancel.current = false
    const stop = () => {
      browserCancel.current = true
      window.speechSynthesis.cancel()
      speechPlanned.current = false
      setMode('idle')
      setUsedBrowser(false)
      resetStopRefs()
      if (globalStop === stop) globalStop = null
      window.dispatchEvent(new CustomEvent(PREVIEW_STOP_EVENT, { detail: { id: narratorId } }))
    }
    ownStop.current = stop
    globalStop = stop
    speechPlanned.current = true
    void speakNarratorBrowserPreview({
      narratorId,
      isCancelled: () => browserCancel.current,
      onError: () => setErr(true)
    })
      .catch(() => setErr(true))
      .finally(() => {
        speechPlanned.current = false
        if (!browserCancel.current) {
          setMode('idle')
          setUsedBrowser(false)
        }
        resetStopRefs()
        if (globalStop === stop) globalStop = null
      })
  }

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ id: string }>).detail
      if (!d?.id || d.id === narratorId) return
      setErr(false)
      if (ownStop.current) {
        ownStop.current()
        return
      }
      currentFetch?.abort()
      revokeOwnedBlobUrl()
      if (speechPlanned.current && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        speechPlanned.current = false
      }
      setMode('idle')
      setUsedBrowser(false)
    }
    window.addEventListener(PREVIEW_EVENT, on as EventListener)
    return () => window.removeEventListener(PREVIEW_EVENT, on as EventListener)
  }, [narratorId])

  useEffect(() => {
    if (disabled || !previewUrl) return
    void prefetchNarratorPreviewMp3(previewUrl)
  }, [disabled, previewUrl])

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    setErr(false)
    if (ownStop.current) {
      ownStop.current()
      return
    }
    window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { id: narratorId } }))

    if (globalStop) {
      globalStop()
      globalStop = null
    }
    void (async () => {
      currentFetch?.abort()
      const ac = new AbortController()
      currentFetch = ac
      let usedFallback = false
      setUsedBrowser(false)

      const runFallback = () => {
        if (usedFallback || ac.signal.aborted) return
        usedFallback = true
        revokeOwnedBlobUrl()
        playWithBrowserTts()
      }

      const cachedBlobUrl = getCachedNarratorPreviewBlobUrl(previewUrl)
      if (cachedBlobUrl && !ac.signal.aborted) {
        if (currentFetch === ac) currentFetch = null
        const audio = new Audio(cachedBlobUrl)

        const stop = () => {
          audio.pause()
          audio.removeAttribute('src')
          setMode('idle')
          setUsedBrowser(false)
          resetStopRefs()
          if (globalStop === stop) globalStop = null
          window.dispatchEvent(new CustomEvent(PREVIEW_STOP_EVENT, { detail: { id: narratorId } }))
        }
        ownStop.current = stop
        globalStop = stop

        audio.onplay = () => {
          if (!ac.signal.aborted) setMode('playing')
        }
        audio.onended = stop
        audio.onerror = () => {
          if (!ac.signal.aborted) {
            stop()
            runFallback()
          } else {
            stop()
          }
        }
        try {
          setMode('playing')
          await audio.play()
        } catch {
          stop()
          if (!ac.signal.aborted) runFallback()
        }
        return
      }

      setMode('loading')
      try {
        const r = await fetch(previewUrl, {
          method: 'GET',
          signal: ac.signal,
          headers: { Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8' }
        })
        if (ac.signal.aborted) return
        if (currentFetch === ac) currentFetch = null

        const ct = (r.headers.get('content-type') || '').toLowerCase()
        if (!r.ok) {
          setErr(true)
          runFallback()
          return
        }
        if (ct.includes('application/json') || ct.includes('text/html')) {
          setErr(true)
          runFallback()
          return
        }

        const blob = await r.blob()
        if (ct && !ct.includes('audio') && !ct.includes('octet-stream')) {
          if (!(await blobLooksLikeMp3(blob))) {
            runFallback()
            return
          }
        }
        if (ac.signal.aborted) return
        if (blob.size < 64 || !(await blobLooksLikeMp3(blob))) {
          runFallback()
          return
        }

        setUsedBrowser(false)
        const url = URL.createObjectURL(blob)
        ownedRevocableUrl.current = url
        const audio = new Audio(url)

        const stop = () => {
          audio.pause()
          audio.removeAttribute('src')
          revokeOwnedBlobUrl()
          setMode('idle')
          setUsedBrowser(false)
          resetStopRefs()
          if (globalStop === stop) globalStop = null
          window.dispatchEvent(new CustomEvent(PREVIEW_STOP_EVENT, { detail: { id: narratorId } }))
        }
        ownStop.current = stop
        globalStop = stop

        audio.onplay = () => {
          if (!ac.signal.aborted) setMode('playing')
        }
        audio.onended = stop
        audio.onerror = () => {
          if (!ac.signal.aborted) {
            stop()
            runFallback()
          } else {
            stop()
          }
        }
        try {
          await audio.play()
        } catch {
          stop()
          if (!ac.signal.aborted) runFallback()
        }
      } catch (x) {
        if ((x as Error).name === 'AbortError' || (x as { name?: string })?.name === 'AbortError') {
          if (currentFetch === ac) currentFetch = null
          setMode('idle')
          return
        }
        if (currentFetch === ac) currentFetch = null
        if (!ac.signal.aborted) {
          revokeOwnedBlobUrl()
          runFallback()
        } else {
          setMode('idle')
        }
      }
    })()
  }

  const playing = mode === 'playing'
  const loading = mode === 'loading'
  /** Wide layout grows the strip — never use it in compact (wireframe narrator row stays fixed height). */
  const wideLayout = !compact && (showIntro || err)

  const playBtnTitle = err
    ? uiText('narratorSampleError')
    : playing
      ? uiText('narratorPlayStop')
      : uiText('narratorPlaySample')

  return (
    <div
      className={`narrator-list__play ${compact ? 'narrator-list__play--compact' : ''} ${wideLayout ? 'narrator-list__play--wide' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="narrator-list__play-top">
        <button
          type="button"
          className={`narrator-list__play-btn ${playing ? 'narrator-list__play-btn--on' : ''}`}
          disabled={Boolean(disabled)}
          onClick={onClick}
          title={playBtnTitle}
          aria-label={playing ? uiText('narratorPlayStop') : uiText('narratorPlaySample')}
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
        {compact ? null : <VoiceReactiveBars active={loading || playing} />}
        {err && !showIntro && !compact ? (
          <span className="narrator-list__play-err" title={uiText('narratorSampleError')}>
            {uiText('narratorSampleErrorShort')}
          </span>
        ) : null}
      </div>
      {showIntro ? (
        <div className="narrator-list__play-intro" aria-live="polite">
          <span className="narrator-list__play-intro-kicker">{uiText('narratorSampleIntroWhilePlay')}</span>
          <p className="narrator-list__play-intro-text">{spokenLine}</p>
          {loading ? <p className="narrator-list__play-intro-hint">{uiText('narratorSampleLoading')}</p> : null}
          {usedBrowser && !loading ? (
            <p className="narrator-list__play-intro-hint">{uiText('narratorSampleUsingBrowserVoice')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
