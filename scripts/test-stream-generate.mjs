/**
 * Local smoke test for jobs-stream-generate (run: node scripts/test-stream-generate.mjs)
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import handler from '../api/_routes/jobs-stream-generate.js'

const envPath = resolve('backend/.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

process.env.KATHA_SERVERLESS = '1'
process.env.VERCEL = '1'

const chunks = []
const res = {
  statusCode: 200,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v
  },
  flushHeaders() {},
  flush() {},
  write(c) {
    chunks.push(String(c))
  },
  end() {
    chunks.push('[END]')
  }
}

const req = {
  method: 'POST',
  body: JSON.stringify({
    theme: 'Test seed lantern',
    country: 'Nepal',
    genre: 'Drama',
    length: 'short',
    aspectMode: 'vertical_9_16',
    narratorId: 'tryst_bj',
    storyLanguage: 'en',
    styleId: 'soft_anime_fantasy',
    seedLine: 'A child finds a magic lantern in Kathmandu valley',
    scriptOnly: true
  })
}

try {
  await handler(req, res)
  const text = chunks.join('')
  const events = []
  for (const m of text.matchAll(/data: (\{[\s\S]*?\})\n\n/g)) {
    try {
      events.push(JSON.parse(m[1]))
    } catch {
      /* skip */
    }
  }
  const err = events.find((e) => e.type === 'error')
  const ok = events.find((e) => e.type === 'result')
  console.log('events', events.length, 'stages', events.filter((e) => e.type === 'progress').map((e) => e.stage))
  if (err) console.log('ERROR:', err.error)
  if (ok) console.log('OK scenes', ok.result?.script?.length)
  if (!err && !ok) console.log('RAW_TAIL', text.slice(-800))
} catch (e) {
  console.error('HANDLER_CRASH', e?.message)
  console.error(e?.stack)
}
