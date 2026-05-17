import { openaiJson } from '../backend/services/openaiService.js'
import { geminiJson } from '../backend/services/geminiService.js'

const SUPPORTED = new Set(['ne', 'en'])

function pickLng(req) {
  const raw = req.query?.lng || req.query?.lang || (req.body && req.body.lng)
  const s = String(raw || 'en').trim()
  if (SUPPORTED.has(s)) return s
  return 'en'
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function assertBundleShape(base, out) {
  if (!out || typeof out !== 'object') throw new Error('Invalid bundle (not an object)')
  for (const k of Object.keys(base)) {
    const v = out[k]
    if (typeof v !== 'string' || v.trim().length === 0) throw new Error(`Invalid bundle (missing key: ${k})`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).send('Method not allowed')
    return
  }

  const lng = pickLng(req)
  const base = req.body?.base
  if (!base || typeof base !== 'object') {
    res.status(400).json({ error: 'Missing base bundle' })
    return
  }

  // Fast path.
  if (lng === 'en') {
    res.status(200).json({ lng, bundle: { ...base, appTitle: 'कथा एकादेशको' } })
    return
  }

  const schemaHint = 'Record<string, string> with EXACT same keys as base'
  const prompt = `Translate this UI dictionary to target language: ${lng}.

Hard rules:
- Keep the app title EXACTLY as: कथा एकादेशको (do not translate).
- Preserve {{placeholders}} exactly.
- Output must contain EVERY key from base with a non-empty string value.
- Tone: cinematic, premium, native (not literal).
- Return ONLY JSON object (no markdown).

BASE JSON:
${JSON.stringify(base)}`

  try {
    let out = null
    try {
      out = await openaiJson({ purpose: 'localize_ui', schemaHint, prompt })
    } catch {
      out = await geminiJson({ purpose: 'localize_ui', schemaHint, prompt })
    }

    if (!out || typeof out !== 'object') throw new Error('Localization failed')
    out.appTitle = 'कथा एकादेशको'
    assertBundleShape(base, out)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600')
    res.status(200).json({ lng, bundle: out })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ error: msg })
  }
}

