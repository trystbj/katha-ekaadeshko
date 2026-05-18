/**
 * Narrator preview from a user click — browser voice starts immediately; MP3 upgrades when ready.
 */

import {
  fetchNarratorPreviewMp3,
  playNarratorBrowserPreview,
  prepareNarratorPreviewAudio,
  unlockHtmlAudioInGesture,
  unlockSpeechInGesture
} from './playNarratorPreviewAudio'
import { getCachedNarratorPreviewBlobUrl } from './narratorPreviewAudioCache'
import { previewLog, previewWarn } from './narratorPreviewDebug'

export type NarratorPreviewClickOpts = {
  narratorId: string
  storyLanguage?: string
  previewUrl: string
  audio: HTMLAudioElement
  isActive: () => boolean
  onLoading?: () => void
  onPlaying: (source: 'browser' | 'openai') => void
  onIdle: () => void
  onError: (detail: string) => void
  bindEnded: (stop: () => void) => void
}

function stopBrowserSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export function runNarratorPreviewOnClick(opts: NarratorPreviewClickOpts): () => void {
  const ac = new AbortController()
  unlockHtmlAudioInGesture(opts.audio)
  unlockSpeechInGesture()
  opts.onLoading?.()
  previewLog('click_start', {
    narratorId: opts.narratorId,
    storyLanguage: opts.storyLanguage,
    previewUrl: opts.previewUrl
  })

  let mp3Won = false

  const stopAll = () => {
    ac.abort()
    opts.audio.pause()
    opts.audio.removeAttribute('src')
    stopBrowserSpeech()
  }

  opts.onPlaying('browser')
  const browserDone = playNarratorBrowserPreview({
    narratorId: opts.narratorId,
    storyLanguage: opts.storyLanguage,
    isCancelled: () => !opts.isActive() || mp3Won,
    skipFirstClause: true
  })

  const playMp3FromSrc = async (src: string, revokeAfter: boolean): Promise<boolean> => {
    if (!opts.isActive()) return false
    prepareNarratorPreviewAudio(opts.audio)
    opts.audio.src = src
    opts.onPlaying('openai')
    previewLog('mp3_play_attempt', { revokeAfter })
    try {
      await opts.audio.play()
      mp3Won = true
      stopBrowserSpeech()
      previewLog('mp3_play_ok', { volume: opts.audio.volume, muted: opts.audio.muted })
      opts.bindEnded(stopAll)
      return true
    } catch (e) {
      opts.audio.pause()
      opts.audio.removeAttribute('src')
      if (revokeAfter) URL.revokeObjectURL(src)
      previewWarn('mp3_play_blocked', { message: e instanceof Error ? e.message : String(e) })
      return false
    }
  }

  const playMp3 = async (blob: Blob): Promise<boolean> => {
    const blobUrl = URL.createObjectURL(blob)
    const ok = await playMp3FromSrc(blobUrl, true)
    if (!ok) URL.revokeObjectURL(blobUrl)
    return ok
  }

  const finish = async () => {
    if (!opts.isActive()) return
    if (mp3Won) return
    try {
      await browserDone
      previewLog('browser_done')
    } catch (e) {
      if (!mp3Won && opts.isActive()) {
        const msg = e instanceof Error ? e.message : 'Browser speech failed'
        previewWarn('browser_failed', { message: msg })
        opts.onError(msg)
      }
      return
    }
    if (!mp3Won && opts.isActive()) opts.onIdle()
  }

  void (async () => {
    try {
      const cachedUrl = getCachedNarratorPreviewBlobUrl(opts.previewUrl)
      if (cachedUrl && opts.isActive()) {
        if (await playMp3FromSrc(cachedUrl, false)) return
      }
      const blob = await fetchNarratorPreviewMp3(opts.previewUrl, ac.signal)
      if (await playMp3(blob)) return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = e instanceof Error ? e.message : String(e)
      previewWarn('mp3_fetch_failed', { message: msg })
    }
    await finish()
  })()

  return stopAll
}

export { buildNarratorPreviewApiUrl } from './playNarratorPreviewAudio'
