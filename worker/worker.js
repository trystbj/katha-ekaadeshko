import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const APP_BASE_URL_RAW = process.env.APP_BASE_URL // e.g. https://your-app.vercel.app
const WORKER_TOKEN = process.env.WORKER_TOKEN
const WORKER_ID = process.env.WORKER_ID || `pc-${os.hostname()}`
/** Set `WORKER_VERBOSE=1` for startup details and periodic idle heartbeats (default is quiet). */
const WORKER_VERBOSE = process.env.WORKER_VERBOSE === '1' || process.env.DEBUG === '1'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!APP_BASE_URL_RAW || !WORKER_TOKEN) {
  console.error('Missing APP_BASE_URL or WORKER_TOKEN.')
  console.error(
    'Add them to worker/.env (copy worker/.env.example → worker/.env), or set env vars in your shell before node worker.js'
  )
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (needed to upload the MP4 to Supabase Storage).')
  console.error('Same keys as in worker/.env.example — use the service_role key from Supabase → Settings → API.')
  process.exit(1)
}

function normalizeBaseUrl(u) {
  let s = String(u || '').trim()
  // common mistake: https://https://...
  s = s.replace(/^https:\/\/https:\/\//i, 'https://')
  s = s.replace(/^http:\/\/https:\/\//i, 'https://')
  s = s.replace(/\/+$/, '')
  return s
}

const BASE_URL = normalizeBaseUrl(APP_BASE_URL_RAW)
if (!/^https?:\/\//i.test(BASE_URL)) {
  console.error('APP_BASE_URL must start with http:// or https://')
  process.exit(1)
}

// Supabase service role keys are JWTs (usually start with eyJ...). If yours doesn't, it's probably wrong.
if (!SUPABASE_SERVICE_ROLE_KEY.includes('.')) {
  console.warn(
    'WARNING: SUPABASE_SERVICE_ROLE_KEY does not look like a JWT. Copy the full "service_role" key from Supabase → Settings → API.'
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function logVerbose(...args) {
  if (WORKER_VERBOSE) console.log(...args)
}

async function api(method, route, body) {
  const url = `${BASE_URL}${route}`
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
        'x-worker-token': WORKER_TOKEN
      },
      body: method === 'GET' ? undefined : body ? JSON.stringify(body) : undefined
    })
    const text = await res.text()
    if (!res.ok) {
      // If Vercel returns HTML (SPA fallback), surface a clearer message.
      if (text.trimStart().toLowerCase().startsWith('<!doctype')) {
        throw new Error(`HTTP ${res.status}: got HTML instead of JSON (route not deployed yet?)`)
      }
      throw new Error(`HTTP ${res.status}: ${text}`)
    }
    if (!text) return {}
    try {
      return JSON.parse(text)
    } catch {
      if (text.trimStart().toLowerCase().startsWith('<!doctype')) {
        throw new Error(`Got HTML instead of JSON from ${method} ${url} (route not deployed yet?)`)
      }
      throw new Error(`Invalid JSON from ${method} ${url}: ${text.slice(0, 200)}`)
    }
  } catch (e) {
    const cause = e?.cause ? ` cause=${String(e.cause)}` : ''
    throw new Error(`fetch failed for ${method} ${url}${cause} (${e instanceof Error ? e.message : String(e)})`)
  }
}

async function downloadTo(file, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(file, buf)
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit' })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

function writeSrt(file, subtitles = []) {
  const lines = []
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    const mmm = String(ms % 1000).padStart(3, '0')
    return `${hh}:${mm}:${ss},${mmm}`
  }
  subtitles.forEach((sub, i) => {
    lines.push(String(i + 1))
    lines.push(`${fmt(sub.startMs)} --> ${fmt(sub.endMs)}`)
    lines.push(sub.text)
    lines.push('')
  })
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
}

async function uploadMp4(jobId, mp4Path) {
  const key = `renders/${jobId}.mp4`
  const bytes = fs.readFileSync(mp4Path)
  const { error } = await supabase.storage.from('renders').upload(key, bytes, {
    contentType: 'video/mp4',
    upsert: true
  })
  if (error) throw error
  const { data } = supabase.storage.from('renders').getPublicUrl(key)
  return data.publicUrl
}

async function processJob(job) {
  const id = String(job.id)
  const p = job.payload || {}
  const images = Array.isArray(p.images) ? p.images : []
  const audio = p.audio || null
  const subtitles = Array.isArray(p.subtitles) ? p.subtitles : []
  const fps = Number.isFinite(p.fps) ? p.fps : 30
  const secondsPerImage = Number.isFinite(p.secondsPerImage) ? p.secondsPerImage : 4

  await api('POST', '/api/worker-claim', { id, workerId: WORKER_ID })
  console.log(`Job ${id} claimed (${images.length} images)`)
  await api('POST', '/api/worker-progress', { id, progress: 5, stage: 'downloading' })

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'katha-render-'))
  const imgDir = path.join(tmp, 'imgs')
  fs.mkdirSync(imgDir, { recursive: true })

  for (let i = 0; i < images.length; i++) {
    const file = path.join(imgDir, `${String(i + 1).padStart(4, '0')}.jpg`)
    await downloadTo(file, images[i])
    const prog = 5 + Math.round(((i + 1) / Math.max(1, images.length)) * 20)
    await api('POST', '/api/worker-progress', { id, progress: prog, stage: `image ${i + 1}/${images.length}` })
  }

  let audioFile = null
  if (audio) {
    audioFile = path.join(tmp, 'audio.mp3')
    await downloadTo(audioFile, audio)
  }

  const srtFile = path.join(tmp, 'captions.srt')
  if (subtitles.length) writeSrt(srtFile, subtitles)

  const out1080 = path.join(tmp, 'out_1080.mp4')
  const out4k = path.join(tmp, 'out_4k.mp4')
  const totalDuration = images.length * secondsPerImage
  const imgRate = String(1 / secondsPerImage)

  await api('POST', '/api/worker-progress', { id, progress: 30, stage: 'ffmpeg 1080p' })

  const vf1080 = [
    'scale=1920:1080:force_original_aspect_ratio=decrease',
    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    `fps=${fps}`,
    subtitles.length ? `subtitles=${srtFile.replace(/\\/g, '\\\\')}` : null
  ]
    .filter(Boolean)
    .join(',')

  const args1080 = [
    '-y',
    '-framerate',
    imgRate,
    '-i',
    path.join(imgDir, '%04d.jpg'),
    ...(audioFile ? ['-i', audioFile] : []),
    '-t',
    String(totalDuration),
    '-vf',
    vf1080,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'slow',
    '-b:v',
    '20M',
    '-maxrate',
    '25M',
    '-bufsize',
    '50M',
    ...(audioFile ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    out1080
  ]
  await run('ffmpeg', args1080, tmp)

  await api('POST', '/api/worker-progress', { id, progress: 70, stage: 'upscale 4K' })
  const args4k = [
    '-y',
    '-i',
    out1080,
    '-vf',
    'scale=3840:2160:flags=lanczos',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'slow',
    '-b:v',
    '35M',
    '-maxrate',
    '45M',
    '-bufsize',
    '90M',
    '-c:a',
    'copy',
    out4k
  ]
  await run('ffmpeg', args4k, tmp)

  await api('POST', '/api/worker-progress', { id, progress: 92, stage: 'uploading' })
  const videoUrl = await uploadMp4(id, out4k)

  await api('POST', '/api/worker-complete', { id, videoUrl })
}

async function main() {
  console.log(`Worker ${WORKER_ID} started (WORKER_VERBOSE=1 for idle logs)`)
  logVerbose('APP_BASE_URL:', BASE_URL)

  let idlePolls = 0
  while (true) {
    try {
      const pending = await api('GET', '/api/worker-pending')
      const job = pending?.job
      if (!job) {
        idlePolls++
        if (WORKER_VERBOSE && idlePolls % 20 === 0) {
          console.log(`[${new Date().toISOString()}] idle… no queued jobs (poll #${idlePolls})`)
        }
        await sleep(3000)
        continue
      }
      idlePolls = 0
      await processJob(job)
    } catch (e) {
      console.error('Worker error:', e?.message || e)
      await sleep(3000)
    }
  }
}

main()
