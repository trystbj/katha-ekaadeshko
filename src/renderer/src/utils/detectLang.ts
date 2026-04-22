/** Lightweight script inference for UI language suggestion (not translation). */
export function suggestUiLanguageFromText(text: string): string | null {
  const t = text.trim()
  if (t.length < 2) return null
  if (/[\u0E00-\u0E7F]/.test(t)) return 'th'
  if (/[\u0600-\u06FF]/.test(t)) return 'ar'
  if (/[\u0590-\u05FF]/.test(t)) return 'he'
  if (/[\u0400-\u04FF]/.test(t)) return 'ru'
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(t)) return /[\u3040-\u30FF]/.test(t) ? 'ja' : 'zh-CN'
  if (/[\uAC00-\uD7AF]/.test(t)) return 'ko'
  if (/[\u0900-\u097F]/.test(t)) return 'ne'
  if (/[\u0980-\u09FF]/.test(t)) return 'bn'
  if (/[\u0B80-\u0BFF]/.test(t)) return 'ta'
  if (/[\u060C\u067E\u0686\u0698\u06A9\u06AF\u06CC]/.test(t) || /[\uFB50-\uFDFF]/.test(t)) return 'fa'
  if (/[\u0750-\u077F\uFB50-\uFDFF]/.test(t)) return 'ur'
  return null
}
