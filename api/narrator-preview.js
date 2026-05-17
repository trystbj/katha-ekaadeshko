import { normalizeNarratorId } from '../backend/utils/narratorPresets.js'
import { generateNarratorPreviewMp3 } from '../backend/services/narratorPreviewTts.js'
import { PREVIEW_UI_LANGS } from '../backend/utils/narratorPreviewI18n.js'
import { setSecurityHeaders } from './_lib/http.js'
import { checkRateLimit, clientIp } from './_lib/rateLimit.js'
import { publicErrorMessage, safeLog } from './_lib/log.js'

function pickNarratorId(req) {
  const raw =
    req.query?.narratorId ||
    req.query?.id ||
    (req.method === 'POST' && req.body && typeof req.body === 'object' && req.body.narratorId
      ? req.body.narratorId
      : null)
  if (typeof raw === 'string' && raw.trim()) return normalizeNarratorId(raw)
  if (req.method === 'POST' && typeof req.body === 'string') {
    try {
      const p = JSON.parse(req.body)
      if (p?.narratorId != null && String(p.narratorId).trim())
        return normalizeNarratorId(String(p.narratorId))
    } catch {
      // ignore
    }
  }
  return null
}

function pickUiLang(req) {
  const a = req.query?.uiLang || req.query?.lang
  if (!a) return 'en'
  const l = String(a).trim().toLowerCase().slice(0, 2)
  return PREVIEW_UI_LANGS.includes(l) ? l : 'en'
}

export default async function handler(req, res) {
  setSecurityHeaders(res)
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    res.status(405).send('Method not allowed')
    return
  }

  const rl = checkRateLimit(`narrator-preview:${clientIp(req)}`, { max: 40, windowMs: 60_000 })
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec))
    res.status(429).json({ error: 'Too many preview requests' })
    return
  }

  const narratorId = pickNarratorId(req)
  if (!narratorId) {
    res.status(400).json({ error: 'Invalid or missing narratorId' })
    return
  }
  const uiLang = pickUiLang(req)
  try {
    const buf = await generateNarratorPreviewMp3(narratorId, { uiLang })
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=300')
    res.status(200).send(buf)
  } catch (e) {
    safeLog('warn', 'narrator-preview failed', { message: e instanceof Error ? e.message : String(e) })
    const status = e?.status && typeof e.status === 'number' ? e.status : 500
    if (res.headersSent) return
    res.status(status).json({ error: publicErrorMessage(e) })
  }
}
