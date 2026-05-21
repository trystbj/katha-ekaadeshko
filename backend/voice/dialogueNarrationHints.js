/**
 * Dialogue intelligence — storyteller transitions when quoted speech appears in narration text.
 * Does NOT switch to full character voice acting.
 */

const QUOTE_RE = /["'«""„]([^"'»"""]{2,120})["'»""]/g
const DIALOGUE_VERB_RE = /\b(said|asked|whispered|shouted|replied|murmured|called|cried|exclaimed)\b/i

/**
 * @param {string} [text]
 * @returns {{ hasDialogue: boolean, instruction: string }}
 */
function analyzeDialogueInNarrationCore(text) {
  const raw = String(text || '')
  if (!raw.trim()) return { hasDialogue: false, instruction: '' }

  const quotes = [...raw.matchAll(QUOTE_RE)]
  const hasQuotes = quotes.length > 0
  const hasDialogueVerbs = DIALOGUE_VERB_RE.test(raw)

  if (!hasQuotes && !hasDialogueVerbs) {
    return { hasDialogue: false, instruction: '' }
  }

  const parts = [
    'Dialogue mode: remain the storyteller — slight emotional tint when voicing quoted lines, then smooth return to narration.',
    'Do not perform separate character voices; one consistent narrator identity throughout.',
    'Quoted speech: gentle forward emphasis, micro-pause before and after quotes, conversational immersion.'
  ]

  if (quotes.length > 1) {
    parts.push('Multiple speakers in text: differentiate only by subtle energy shifts, not pitch-shift acting.')
  }

  return { hasDialogue: true, instruction: parts.join(' ') }
}

/**
 * Structured screenplay dialogue[] from script JSON.
 * @param {unknown} dialogue
 * @returns {{ hasDialogue: boolean, instruction: string, lineCount: number }}
 */
export function analyzeStructuredDialogue(dialogue) {
  if (!Array.isArray(dialogue) || !dialogue.length) {
    return { hasDialogue: false, instruction: '', lineCount: 0 }
  }
  const lines = dialogue
    .map((d) => ({
      who: String(d?.character || '').trim(),
      line: String(d?.line || '').trim()
    }))
    .filter((d) => d.line.length > 0)

  if (!lines.length) return { hasDialogue: false, instruction: '', lineCount: 0 }

  const speakers = [...new Set(lines.map((l) => l.who).filter(Boolean))]
  const parts = [
    'Structured dialogue: storyteller performs quoted lines with subtle emotional tint per speaker — still ONE narrator voice, not full voice acting.',
    'Before each quoted line: micro-pause; after: gentle return to narration rhythm.',
    'Conversational realism: lines sound improvised, not written-by-committee; allow hesitation and emotional color.'
  ]
  if (speakers.length > 1) {
    parts.push(
      `Multiple speakers (${speakers.slice(0, 4).join(', ')}): differentiate only by energy and pacing, not pitch-shift characters.`
    )
  }
  if (lines.length >= 2) {
    parts.push('Exchange pacing: natural turn-taking — brief beat between replies, not rushed stacking.')
  }

  return { hasDialogue: true, instruction: parts.join(' '), lineCount: lines.length }
}

/**
 * @param {string} [text]
 * @param {{ hasDialogue?: boolean, instruction?: string }} [structured]
 */
export function analyzeDialogueInNarration(text, structured) {
  const base = analyzeDialogueInNarrationCore(text)
  if (!structured?.hasDialogue || !structured.instruction) return base
  return {
    hasDialogue: true,
    instruction: [structured.instruction, base.instruction].filter(Boolean).join(' ')
  }
}
