/**
 * Reliable narrator preview playback — MP3 blob or Web Speech fallback.
 */

import { getCinematicPreviewScript } from '@core/voice/previewScriptLocales.js'
import { resolvePreviewLanguage } from '@core/voice/previewLanguage.js'
import { normalizeNarratorId } from '../constants/narrators'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'
import { storyLanguageToPreviewLang } from '../constants/narratorIntroSamples'
import {
  bcp47FromLangId,
  narrationLangVoiceHints,
  splitPreviewUtterances,
  waitForSpeechVoices
} from './narrationSpeechPreview'
import { pickNarratorBrowserVoice } from './narratorBrowserSpeech'
import { previewLog, previewWarn } from './narratorPreviewDebug'

const CLIENT_FETCH_MS = 28_000

/** Tiny silent WAV — unlock HTMLAudio during the user-gesture turn. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='

/** Call synchronously inside a click handler before any await. */
export function unlockHtmlAudioInGesture(audio: HTMLAudioElement) {
  audio.setAttribute('playsinline', '')
  audio.volume = 0.001
  const prev = audio.src
  audio.src = SILENT_WAV
  void audio
    .play()
    .then(() => {
      audio.pause()
      if (prev) audio.src = prev
      else audio.removeAttribute('src')
    })
    .catch(() => {
      if (prev) audio.src = prev
      else audio.removeAttribute('src')
    })
}

/** Resume / prime speech synthesis during a user gesture. */
export function unlockSpeechInGesture() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const syn = window.speechSynthesis
  if (syn.paused) syn.resume()
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  u.rate = 10
  syn.speak(u)
}

export function buildNarratorPreviewApiUrl(
  narratorId: string,
  storyLanguage: string,
  voiceProfile: string,
  baseUrl = ''
): string {
  const q = new URLSearchParams({
    narratorId: normalizeNarratorId(narratorId),
    storyLanguage: storyLanguage || 'ne',
    voiceProfile
  })
  const root = (baseUrl || '').replace(/\/+$/, '')
  return `${root}/api/narrator-preview?${q.toString()}`
}

export async function blobLooksLikeMp3(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false
  const a = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  if (a[0] === 0x49 && a[1] === 0x44 && a[2] === 0x33) return true
  if (a[0] === 0xff && (a[1] & 0xe0) === 0xe0) return true
  return false
}

export async function fetchNarratorPreviewMp3(url: string, signal?: AbortSignal): Promise<Blob> {
  previewLog('fetch_start', { url })
  const r = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(CLIENT_FETCH_MS),
    headers: { Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8' }
  })
  const ct = (r.headers.get('content-type') || '').toLowerCase()
  const ttsConfigured = r.headers.get('x-katha-tts-configured')
  previewLog('fetch_response', {
    status: r.status,
    contentType: ct,
    ttsConfigured,
    previewBytes: r.headers.get('x-katha-preview-bytes')
  })
  if (!r.ok) {
    let detail = `HTTP ${r.status}`
    let code: string | undefined
    try {
      if (ct.includes('json')) {
        const j = (await r.json()) as { error?: string; code?: string; ttsConfigured?: boolean }
        if (j?.error) detail = j.error
        code = j?.code
        previewWarn('fetch_error_json', { status: r.status, code, ttsConfigured: j?.ttsConfigured })
      }
    } catch {
      // ignore
    }
    const err = new Error(detail)
    ;(err as Error & { status?: number; code?: string }).status = r.status
    ;(err as Error & { code?: string }).code = code
    throw err
  }
  if (ct.includes('application/json') || ct.includes('text/html')) {
    previewWarn('fetch_non_audio', { contentType: ct })
    throw new Error('Preview API returned non-audio response')
  }
  const blob = await r.blob()
  const valid = blob.size >= 64 && (await blobLooksLikeMp3(blob))
  previewLog('fetch_blob', { bytes: blob.size, validMp3: valid })
  if (!valid) {
    throw new Error('Preview API returned invalid audio')
  }
  return blob
}

function resumeSpeechIfPaused() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume()
  }
}

/** Wait until gesture-started speech finishes (avoids cancelling clause 1 when clause 2+ is empty). */
export function waitForSpeechSynthesisIdle(syn: SpeechSynthesis, maxMs = 14_000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (!syn.speaking && !syn.pending) {
        resolve()
        return
      }
      if (Date.now() - start > maxMs) {
        resolve()
        return
      }
      window.setTimeout(tick, 60)
    }
    tick()
  })
}

function speakOne(utt: SpeechSynthesisUtterance, syn: SpeechSynthesis): Promise<void> {
  return new Promise((resolve, reject) => {
    utt.onend = () => resolve()
    utt.onerror = (ev) => reject(ev.error ?? new Error('speech synthesis failed'))
    syn.speak(utt)
    resumeSpeechIfPaused()
  })
}

function utteranceForPart(
  part: string,
  voice: SpeechSynthesisVoice | undefined,
  utterLang: string,
  rate: number,
  pitch: number
) {
  const u = new SpeechSynthesisUtterance(part)
  if (voice) u.voice = voice
  u.lang = utterLang
  u.rate = rate
  u.pitch = pitch
  return u
}

/** Speak the first clause synchronously inside a click handler (Chrome gesture). */
export function speakFirstBrowserPreviewClauseInGesture(
  narratorId: string,
  storyLanguage?: string
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  const id = normalizeNarratorId(narratorId)
  const lang = resolvePreviewLanguage({ storyLanguage })
  const text = getCinematicPreviewScript(id, lang, { forApi: true })
  const parts = splitPreviewUtterances(text)
  const first = parts[0]?.trim()
  if (!first) return false

  const syn = window.speechSynthesis
  syn.cancel()
  const voices = syn.getVoices()
  const voice = pickNarratorBrowserVoice(id, voices) ?? voices[0]
  const identity = narratorIdentityForId(id)
  const langId = storyLanguage ? storyLanguageToPreviewLang(storyLanguage) : 'ne'
  const hints = narrationLangVoiceHints(langId)
  const utterLang =
    voice?.lang && hints.some((h) => voice.lang.toLowerCase().startsWith(h.toLowerCase().slice(0, 2)))
      ? voice.lang
      : bcp47FromLangId(langId)
  const male = id === 'tryst_bj'
  const rate = identity?.browserTts.rate ?? (male ? 1.0 : 1.02)
  const pitch = identity?.browserTts.pitch ?? (male ? 0.82 : 1.14)

  syn.speak(utteranceForPart(first, voice, utterLang, rate, pitch))
  resumeSpeechIfPaused()
  return true
}

export type BrowserPreviewOpts = {
  narratorId: string
  storyLanguage?: string
  isCancelled?: () => boolean
  /** Skip first clause if already spoken in gesture. */
  skipFirstClause?: boolean
}

/** Guaranteed audible fallback using system voices. */
export async function playNarratorBrowserPreview(opts: BrowserPreviewOpts): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('Browser speech not available')
  }
  const narratorId = normalizeNarratorId(opts.narratorId)
  const lang = resolvePreviewLanguage({ storyLanguage: opts.storyLanguage })
  const text = getCinematicPreviewScript(narratorId, lang, { forApi: true })
  const identity = narratorIdentityForId(narratorId)
  const syn = window.speechSynthesis
  if (!opts.skipFirstClause) {
    syn.cancel()
    await new Promise((r) => setTimeout(r, 50))
  }

  const voices = await waitForSpeechVoices(syn)
  if (opts.isCancelled?.()) return

  const voice = pickNarratorBrowserVoice(narratorId, voices) ?? voices[0]
  if (!voice) throw new Error('No system voice available')

  const langId = opts.storyLanguage ? storyLanguageToPreviewLang(opts.storyLanguage) : 'ne'
  const hints = narrationLangVoiceHints(langId)
  const utterLang =
    voice.lang && hints.some((h) => voice.lang.toLowerCase().startsWith(h.toLowerCase().slice(0, 2)))
      ? voice.lang
      : bcp47FromLangId(langId)

  const male = narratorId === 'tryst_bj'
  const rate = identity?.browserTts.rate ?? (male ? 1.0 : 1.02)
  const pitch = identity?.browserTts.pitch ?? (male ? 0.82 : 1.14)

  let parts = splitPreviewUtterances(text)
  if (opts.skipFirstClause) {
    if (parts.length > 1) parts = parts.slice(1)
    else {
      await waitForSpeechSynthesisIdle(syn)
      return
    }
  }

  for (const part of parts) {
    if (opts.isCancelled?.()) return
    await speakOne(utteranceForPart(part, voice, utterLang, rate, pitch), syn)
  }
}
