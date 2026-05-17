/** Combine finals + trailing interim chunk(s) from a recognition event */
export function combineRecognitionResults(results: SpeechRecognitionResultList): {
  finals: string
  interim: string
} {
  let finals = ''
  const interimChunks: string[] = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const t = r[0]?.transcript ?? ''
    if (r.isFinal) finals += t
    else if (t.trim()) interimChunks.push(t)
  }
  const interim = interimChunks.join(' ').trim()
  return { finals, interim }
}

export type DictationInsertMode = 'append_cursor' | 'append_end' | 'overwrite'

/** Light formatting: normalize spaces; capitalize after . ! ? (ASCII + danda) */
export function lightDictationFormat(text: string): string {
  let s = text.replace(/\s+/g, ' ').trim()
  if (!s) return s
  const cap = (frag: string) => {
    const m = frag.match(/^(\s*)([\S\s])/)
    if (!m) return frag
    const pre = m[1] || ''
    const ch = m[2]
    return pre + (ch && /[a-z\u00e0-\u024f]/.test(ch) ? ch.toUpperCase() : ch) + frag.slice(pre.length + 1)
  }
  s = cap(s)
  s = s.replace(/([.!?।])\s+([a-z\u00e0-\u024f])/g, (_, p: string, l: string) => `${p} ${l.toUpperCase()}`)
  return s
}

export type VoiceCommandEffect =
  | { kind: 'none' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'clear_buffers' }
  | { kind: 'toggle_insert_mode' }
  | { kind: 'toggle_overwrite_mode' }
  | { kind: 'trigger_polish' }
  | { kind: 'undo' }
  | { kind: 'delete_last_sentence' }

const COMMAND_PATTERNS: { re: RegExp; effect: VoiceCommandEffect }[] = [
  { re: /^\s*(pause\s+listening|stop\s+listening)\s*[.!?？।]?\s*$/i, effect: { kind: 'pause' } },
  { re: /^\s*(resume|continue\s+listening)\s*[.!?？।]?\s*$/i, effect: { kind: 'resume' } },
  { re: /^\s*(clear\s+(recording|dictation)\s+text|clear\s+dictation)\s*[.!?？।]?\s*$/i, effect: { kind: 'clear_buffers' } },
  { re: /^\s*(insert\s+at\s+cursor\s+mode|cursor\s+insert\s+mode)\s*[.!?？।]?\s*$/i, effect: { kind: 'toggle_insert_mode' } },
  { re: /^\s*(append\s+mode)\s*[.!?？।]?\s*$/i, effect: { kind: 'toggle_insert_mode' } },
  { re: /^\s*(overwrite\s+mode)\s*[.!?？।]?\s*$/i, effect: { kind: 'toggle_overwrite_mode' } },
  { re: /^\s*(polish\s+dictation|clean\s+up\s+dictation|grammar\s+clean)\s*[.!?？।]?\s*$/i, effect: { kind: 'trigger_polish' } },
  { re: /^\s*(undo)\s*[.!?？।]?\s*$/i, effect: { kind: 'undo' } },
  { re: /^\s*(delete\s+last\s+sentence)\s*[.!?？।]?\s*$/i, effect: { kind: 'delete_last_sentence' } }
]

/** Detect standalone voice commands (final utterances only recommended). */
export function detectVoiceCommand(utterance: string): VoiceCommandEffect {
  const t = utterance.trim()
  if (!t) return { kind: 'none' }
  for (const row of COMMAND_PATTERNS) {
    if (row.re.test(t)) return row.effect
  }
  return { kind: 'none' }
}

/** Replace spoken punctuation phrases with symbols (English + a few Nepali/Hindi cues). */
export function applySpokenPunctuation(text: string): string {
  let s = text
  const reps: [RegExp, string][] = [
    [/\b(new\s+paragraph)\b/gi, '\n\n'],
    [/\b(start\s+new\s+line)\b/gi, '\n'],
    [/\b(full\s+stop|period)\b/gi, '.'],
    [/\b(comma)\b/gi, ','],
    [/\b(question\s+mark)\b/gi, '?'],
    [/\b(exclamation\s+mark)\b/gi, '!'],
    [/\b(quote\s+open)\b/gi, '"'],
    [/\b(quote\s+close)\b/gi, '"'],
    [/\b(नयाँ\s+अनुच्छेद|नया\s+प्याराग्राफ)\b/giu, '\n\n']
  ]
  for (const [re, rep] of reps) s = s.replace(re, rep)
  return s
}

export function deleteLastSentence(text: string): string {
  const t = text.trimEnd()
  const punctIx: number[] = []
  for (let i = 0; i < t.length; i++) if ('.!?।'.includes(t[i]!)) punctIx.push(i)
  if (punctIx.length === 0) return ''
  if (punctIx.length === 1) return t.slice(0, punctIx[0]! + 1).trimEnd()
  const cut = punctIx[punctIx.length - 2]!
  return t.slice(0, cut + 1).trimEnd()
}

export function mergeDictationIntoIdea(params: {
  idea: string
  spokenProcessed: string
  mode: DictationInsertMode
  anchorStart: number
  anchorEnd: number
  maxLen: number
}): string {
  const { idea, spokenProcessed, mode, anchorStart, anchorEnd, maxLen } = params
  const spoken = spokenProcessed.trim()
  if (!spoken) return idea.slice(0, maxLen)

  const safeStart = Math.max(0, Math.min(anchorStart, idea.length))
  const safeEnd = Math.max(safeStart, Math.min(anchorEnd, idea.length))

  let next: string
  if (mode === 'overwrite') {
    next = spoken
  } else if (mode === 'append_end') {
    const sep = idea.length && !idea.endsWith(' ') && !idea.endsWith('\n') ? ' ' : ''
    next = `${idea.trimEnd()}${sep}${spoken}`
  } else {
    const left = idea.slice(0, safeStart)
    const right = idea.slice(safeEnd)
    const sepLeft = left.length && !left.endsWith(' ') && !left.endsWith('\n') ? ' ' : ''
    const sepRight = right.length && !spoken.endsWith(' ') && !right.startsWith(' ') && !right.startsWith('\n') ? ' ' : ''
    next = `${left.trimEnd()}${sepLeft}${spoken}${sepRight}${right}`
  }

  return next.length <= maxLen ? next : next.slice(0, maxLen)
}
