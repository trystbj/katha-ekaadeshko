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
export function analyzeDialogueInNarration(text) {
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
