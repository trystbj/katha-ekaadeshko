export type VisualFailureCode =
  | 'no_prompt_generated'
  | 'provider_timeout'
  | 'invalid_api_response'
  | 'empty_image_array'
  | 'image_download_failed'
  | 'rate_limit_exceeded'
  | 'authentication_failed'
  | 'leonardo_disabled'
  | 'missing_api_key'
  | 'network_error'
  | 'validation_failed'
  | 'unknown'

export function classifyVisualGenerationError(raw: unknown): {
  code: VisualFailureCode
  message: string
} {
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'message' in raw
          ? String((raw as { message: unknown }).message)
          : String(raw || '')

  const m = msg.toLowerCase()
  if (!m.trim() || m === 'stream_empty_images') {
    return { code: 'empty_image_array', message: 'No scene images were returned from the visual pipeline.' }
  }
  if (/character portraits incomplete|portrait_missing/i.test(m)) {
    return { code: 'missing_api_key', message: msg }
  }
  if (/character profiles incomplete/i.test(m)) {
    return { code: 'no_prompt_generated', message: msg }
  }
  if (/no prompt|prompt.*empty|no_scene_description/i.test(m)) {
    return { code: 'no_prompt_generated', message: msg }
  }
  if (/timeout|timed out|leonardo: timeout/i.test(m)) {
    return { code: 'provider_timeout', message: msg }
  }
  if (/401|403|api key|authentication|rejected/i.test(m)) {
    return { code: 'authentication_failed', message: msg }
  }
  if (/429|rate limit/i.test(m)) {
    return { code: 'rate_limit_exceeded', message: msg }
  }
  if (/leonardo.*disabled|serverless.*unavailable/i.test(m)) {
    return { code: 'leonardo_disabled', message: msg }
  }
  if (/leonardo_api_key|missing.*key/i.test(m)) {
    return { code: 'missing_api_key', message: msg }
  }
  if (/invalid.*response|missing generationid|no response body/i.test(m)) {
    return { code: 'invalid_api_response', message: msg }
  }
  if (/download|http_4|http_5|remote|fetch.*fail|display validation/i.test(m)) {
    return { code: 'image_download_failed', message: msg }
  }
  if (/validation|verification failed|match/i.test(m)) {
    return { code: 'validation_failed', message: msg }
  }
  if (/network|fetch failed|failed to fetch/i.test(m)) {
    return { code: 'network_error', message: msg }
  }
  return { code: 'unknown', message: msg }
}

export function formatVisualFailureForUser(
  code: VisualFailureCode,
  detail?: string,
  ui?: (key: string) => string
): string {
  const t = ui ?? ((k: string) => k)
  const labels: Record<VisualFailureCode, string> = {
    no_prompt_generated: t('visualErrNoPrompt'),
    provider_timeout: t('visualErrProviderTimeout'),
    invalid_api_response: t('visualErrInvalidResponse'),
    empty_image_array: t('visualErrEmptyImages'),
    image_download_failed: t('visualErrDownloadFailed'),
    rate_limit_exceeded: t('visualErrRateLimit'),
    authentication_failed: t('visualErrAuthFailed'),
    leonardo_disabled: t('visualErrLeonardoDisabled'),
    missing_api_key: t('visualErrMissingKey'),
    network_error: t('visualErrNetwork'),
    validation_failed: t('visualErrValidation'),
    unknown: t('visualGenNoResult')
  }
  const head = labels[code] || labels.unknown
  if (detail && detail !== head) return `${head} (${detail.slice(0, 200)})`
  return head
}
