export function createHttpClient({ timeoutMs = 60_000, retries = 2 } = {}) {
  return async function httpJson(url, { method = 'POST', headers = {}, body } = {}) {
    let lastErr = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method,
          headers,
          body,
          signal: ac.signal
        })
        const text = await res.text()
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}: ${text.slice(0, 2000)}`)
          err.status = res.status
          throw err
        }
        return text
      } catch (e) {
        lastErr = e
        const retryable =
          e?.name === 'AbortError' || (typeof e?.status === 'number' && (e.status === 429 || e.status >= 500))
        if (attempt < retries && retryable) {
          await sleep(400 * (attempt + 1))
          continue
        }
        throw e
      } finally {
        clearTimeout(t)
      }
    }
    throw lastErr || new Error('HTTP failed')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

