/** Parse API / SSE / fetch errors into human-readable studio messages. */

function messageFromObject(o: Record<string, unknown>): string | null {
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
  if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
  const err = o.error
  if (err && typeof err === 'object') {
    const nested = messageFromObject(err as Record<string, unknown>)
    if (nested) return nested
  }
  if (typeof o.detail === 'string' && o.detail.trim()) return o.detail.trim()
  return null
}

export function formatApiError(err: unknown, fallback = 'Request failed'): string {
  if (err instanceof Error && err.message.trim()) {
    if (err.message === '[object Object]') return fallback
    return err.message
  }
  if (typeof err === 'string' && err.trim()) {
    if (err === '[object Object]') return fallback
    return err
  }
  if (err && typeof err === 'object') {
    const parsed = messageFromObject(err as Record<string, unknown>)
    if (parsed) return parsed
    try {
      const raw = JSON.stringify(err)
      if (raw && raw !== '{}' && raw !== '[object Object]') return raw.slice(0, 360)
    } catch {
      /* ignore */
    }
  }
  return fallback
}

export async function readHttpErrorResponse(res: Response, fallback: string): Promise<string> {
  const text = await res.text()
  if (!text.trim()) return `${fallback} (HTTP ${res.status})`
  try {
    const json = JSON.parse(text) as Record<string, unknown>
    return formatApiError(json.error ?? json, text)
  } catch {
    return formatApiError(text, fallback)
  }
}
