function isWordChar(ch: string): boolean {
  if (ch.length !== 1) return false
  if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) return true
  const c = ch.codePointAt(0) ?? 0
  if (c >= 0x0900 && c <= 0x0fff) return true // Devanagari (Nepali/Hindi range use — coarse block slice)
  if (c >= 0xac00 && c <= 0xd7af) return true // Hangul syllables (subset)
  if (c >= 0x3040 && c <= 0x30ff) return true // Hiragana/Katakana (subset)
  if (c >= 0x4e00 && c <= 0x9fff) return true // CJK Unified Ideographs (subset)
  return false
}

/** Variable typing cadence: bursts for letters, pauses at punctuation & newlines. */
export function nextRevealVisibleLength(full: string, cur: number): number {
  if (cur >= full.length) return full.length
  const ch = full[cur]

  if (isWordChar(ch)) {
    let j = cur + 1
    while (j < full.length && j - cur < 7) {
      const c = full[j]
      if (!isWordChar(c)) break
      j++
    }
    let add = Math.max(1, j - cur)
    if (Math.random() < 0.35) add = Math.min(add, 2 + Math.floor(Math.random() * 3))
    return Math.min(full.length, cur + add)
  }

  if (/\s/.test(ch)) {
    let j = cur + 1
    while (j < full.length && /\s/.test(full[j]) && j - cur < 4) j++
    return Math.min(full.length, j)
  }

  return Math.min(full.length, cur + 1)
}

export function delayMsBeforeNextChar(full: string, cur: number): number {
  if (cur >= full.length) return 0
  const ch = full[cur]
  const prev = cur > 0 ? full[cur - 1] : ''

  let base = 14 + Math.floor(Math.random() * 26)

  if (ch === '\n') base += 45 + Math.floor(Math.random() * 90)
  else if (prev === '\n' && ch === '#') base += 120 + Math.floor(Math.random() * 140)
  else if (ch === '#' || ch === '*') base += 35 + Math.floor(Math.random() * 55)
  else if ('.!?।॥'.includes(ch)) base += 70 + Math.floor(Math.random() * 120)
  else if (ch === ',' || ch === '—') base += 28 + Math.floor(Math.random() * 55)
  else if (isWordChar(ch)) {
    base -= 4
    if (Math.random() < 0.08) base += 140 + Math.floor(Math.random() * 180)
    if (Math.random() < 0.12) base -= 10
  }

  return Math.max(8, Math.min(520, base))
}

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

export function playLiveTypingTick(volume = 0.04): void {
  const ctx = getAudioCtx()
  if (!ctx || volume <= 0) return
  try {
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 880 + Math.random() * 120
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    osc.start(now)
    osc.stop(now + 0.028)
  } catch {
    /* ignore */
  }
}
