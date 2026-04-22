import { mkdir } from 'fs/promises'

export async function ensurePublicDirs() {
  // Serverless: avoid filesystem writes (use external storage later if needed).
  if (process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1') return
  await mkdir('public', { recursive: true })
  await mkdir('public/audio', { recursive: true })
}

export function publicUrl(req, path) {
  const proto = (req.headers['x-forwarded-proto'] || 'http').toString().split(',')[0].trim()
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').toString()
  const base = `${proto}://${host}`
  const clean = path.startsWith('/') ? path : `/${path}`
  return base + clean
}

