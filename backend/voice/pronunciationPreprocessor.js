/**
 * Multilingual pronunciation preprocessing — normalize text + emit pacing hints for TTS.
 */

function baseLang(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0] || 'en'
}

/**
 * @param {string} text
 * @param {string} [storyLanguage]
 * @returns {{ text: string, hints: string }}
 */
export function preprocessNarrationForTts(text, storyLanguage) {
  let t = String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()

  if (!t) return { text: '', hints: '' }

  t = t.replace(/\.{3,}/g, '…')
  t = t.replace(/([।.!?])\s*([^\s])/g, '$1 $2')

  const hints = []
  const lang = baseLang(storyLanguage)

  if (/[«""„"']/.test(t)) {
    hints.push('Honor quotation marks with brief dramatic pauses; keep narrator voice consistent.')
  }
  if (t.length > 180) {
    hints.push('Long passage: paragraph-aware breathing — vary pace across clauses, not monotone.')
  }
  if (lang === 'ne' || lang === 'hi') {
    hints.push('Devanagari: pronounce compound words and chandrabindu clearly; natural native clause linking.')
  }
  if (lang === 'ja' || lang === 'ko' || lang === 'zh') {
    hints.push('East Asian rhythm: respect mora/syllable timing; avoid English stress on every word.')
  }

  return { text: t, hints: hints.join(' ') }
}
