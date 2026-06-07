import { formatApiError } from './formatApiError'

export async function fetchStoryTranslation(payload: {
  text: string
  targetLanguage: string
  sourceLanguage?: string
}): Promise<string> {
  const res = await fetch('/api/story-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = (await res.json().catch(() => ({}))) as {
    translatedText?: string
    error?: string
  }
  if (!res.ok) {
    throw new Error(formatApiError(data.error || data, 'Translation failed'))
  }
  const translated = String(data.translatedText || '').trim()
  if (!translated) throw new Error('Translation returned empty text')
  return translated
}
