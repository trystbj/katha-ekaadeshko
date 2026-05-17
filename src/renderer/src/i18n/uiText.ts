import type { TFunction } from 'i18next'
import i18n from 'i18next'
/**
 * Mandatory path for visible UI copy (use instead of raw `t()` where practical).
 * DEV: warns when key missing from active bundle or key looks like a literal sentence.
 */
export function uiText(
  t: TFunction,
  key: string,
  options?: Record<string, string | number | boolean | null>
): string {
  if (import.meta.env.DEV) {
    const rawKey = String(key)
    if (rawKey.includes(' ') || rawKey.length > 48) {
      console.error('[UNLOCALIZED_TEXT_BLOCKED] uiText key must be a dictionary key, not a sentence.', {
        key: rawKey
      })
    }
    const lng = i18n.resolvedLanguage || i18n.language
    const exists =
      i18n.exists(rawKey, { ns: 'translation', lng }) ||
      i18n.exists(rawKey, { ns: 'translation' }) ||
      i18n.exists(rawKey)
    if (!exists) {
      console.error('[UNLOCALIZED_TEXT_BLOCKED] missing translation key', { key: rawKey, lng })
    }
  }
  const out = options ? t(key, options as never) : t(key)
  return typeof out === 'string' ? out : String(out)
}
