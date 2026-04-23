/**
 * TTS service (pluggable).
 *
 * Default: OpenAI TTS (requires TTS_API_KEY or OPENAI_API_KEY).
 * You can swap provider later by changing TTS_PROVIDER and implementing its client.
 */

import { randomUUID } from 'crypto'
import { writeFile } from 'fs/promises'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function ttsGenerateForScript({ script, input, req }) {
  // Serverless default: no local file writes; keep free tier simple.
  if (process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1') return []
  const provider = (process.env.TTS_PROVIDER || 'openai').toLowerCase()
  if (provider === 'disabled') return []

  const out = []
  for (const s of script) {
    const narration = String(s.narration || '').trim()
    if (!narration) continue
    try {
      const audio_url = await ttsOne({ text: narration, input, req, scene: s.scene })
      if (audio_url) out.push({ scene: s.scene, audio_url })
    } catch (e) {
      // TTS is optional. If the provider is quota-limited or blocked, skip audio instead of failing the whole pipeline.
      const msg = e instanceof Error ? e.message : String(e)
      if (
        msg.includes(' 401:') ||
        msg.includes(' 403:') ||
        msg.includes(' 429:') ||
        msg.includes('insufficient_quota') ||
        msg.toLowerCase().includes('quota')
      ) {
        return out
      }
      throw e
    }
    await sleep(50)
  }
  return out
}

async function ttsOne({ text, req, scene }) {
  const provider = (process.env.TTS_PROVIDER || 'openai').toLowerCase()
  if (provider === 'openai') return await openaiTts(text)
  // Placeholder: you can add ElevenLabs / Azure / Google later.
  throw new Error(`Unsupported TTS_PROVIDER: ${provider}`)
}

async function openaiTts(text) {
  const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return ''

  // NOTE: Save to local /public/audio and serve as a URL.
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      format: 'mp3',
      input: text
    })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`OpenAI TTS ${res.status}: ${t}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const id = randomUUID()
  const file = `public/audio/${id}.mp3`
  await writeFile(file, buf)
  // If no req (internal calls), return relative URL
  return `/public/audio/${id}.mp3`
}

