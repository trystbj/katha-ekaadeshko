/** Shared Leonardo prompt length guards (API max ~1500 main). */

export const LEONARDO_MAX_PROMPT = 1300
export const LEONARDO_MAX_NEGATIVE = 500

export function truncateLeonardoText(text, max) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return `${sp > max * 0.55 ? cut.slice(0, sp) : cut}…`
}

export function clampLeonardoPromptPair(prompt, negativePrompt = '') {
  return {
    prompt: truncateLeonardoText(prompt, LEONARDO_MAX_PROMPT),
    negativePrompt: truncateLeonardoText(negativePrompt, LEONARDO_MAX_NEGATIVE)
  }
}
