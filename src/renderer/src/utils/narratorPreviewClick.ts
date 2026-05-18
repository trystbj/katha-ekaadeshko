/**
 * Narrator preview from a user click — browser voice starts immediately; MP3 upgrades when ready.
 */

import {
  fetchNarratorPreviewMp3,
  playNarratorBrowserPreview,
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  opts.onPlaying('browser')
  const browserDone = playNarratorBrowserPreview({
    narratorId: opts.narratorId,
    storyLanguage: opts.storyLanguage,
    isCancelled: () => !opts.isActive() || mp3Won,
    skipFirstClause: true
  })

  const playMp3 = async (blob: Blob): Promise<boolean> => {
    if (!opts.isActive()) return false
    mp3Won = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    const blobUrl = URL.createObjectURL(blob)
    opts.audio.src = blobUrl
    opts.onPlaying('openai')
    previewLog('mp3_play_attempt', { bytes: blob.size })
    try {
      await opts.audio.play()
      previewLog('mp3_play_ok')
      opts.bindEnded(stopAll)
      return true
    } catch (e) {
      mp3Won = false
      opts.audio.pause()
      opts.audio.removeAttribute('src')
      URL.revokeObjectURL(blobUrl)
      previewWarn('mp3_play_blocked', { message: e instanceof Error ? e.message : String(e) })
      return false
    }
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
        mp3Won = true
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        opts.audio.src = cachedUrl
        opts.onPlaying('openai')
        try {
          await opts.audio.play()
          previewLog('cached_mp3_play_ok')
          opts.bindEnded(stopAll)
          return
        } catch (e) {
          mp3Won = false
          opts.audio.removeAttribute('src')
          previewWarn('cached_mp3_play_blocked', {
            message: e instanceof Error ? e.message : String(e)
          })
        }
      }
      const blob = await fetchNarratorPreviewMp3(opts.previewUrl, ac.signal)
      if (await playMp3(blob)) return
      mp3Won = false
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
