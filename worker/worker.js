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

function num(x, fallback) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

/** Narration + bed with compressor-driven ducking (voice prioritized). */
async function duckMixNarrBed(tmp, narrPath, bedPath, totalDurationSec) {
  const out = path.join(tmp, 'mixed_narr_bed_ducked.mp3')
  const td = String(Number(totalDurationSec))
  const fc =
    `[0:a]atrim=0:${td},asetpts=N/SR/TB[na];` +
    `[1:a]atrim=0:${td},asetpts=N/SR/TB[bed];` +
    `[bed][na]sidechaincompress=threshold=0.018:ratio=5:attack=28:release=680[duck];` +
    `[duck][na]amix=inputs=2:duration=longest:normalize=0[a]`
  await run(
    'ffmpeg',
    ['-y', '-i', narrPath, '-i', bedPath, '-filter_complex', fc, '-map', '[a]', '-t', td, '-c:a', 'libmp3lame', '-q:a', '4', out],
    tmp
  )
  return out
}

async function prepareBedSegment(tmp, url, durSec, intensity, musicGain, idx) {
  const raw = path.join(tmp, `seg_raw_${idx}.mp3`)
  await downloadTo(raw, url)
  const out = path.join(tmp, `seg_trim_${idx}.mp3`)
  const d = Number(durSec)
  const fadeOutSt = Math.max(0.06, d - 0.42)
  const vol = Math.min(0.34, Math.max(0.07, musicGain * (0.38 + num(intensity, 0.5) * 0.72)))
  await run(
    'ffmpeg',
    [
      '-y',
      '-i',
      raw,
      '-af',
      `aloop=loop=-1:size=2147483647,atrim=0:${d},afade=t=in:st=0:d=0.38,afade=t=out:st=${fadeOutSt}:d=0.42,volume=${vol}`,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '4',
      out
    ],
    tmp
  )
  return out
}

async function concatMp3Segments(tmp, segmentPaths, totalDurSec) {
  const out = path.join(tmp, 'bed_segmented_concat.mp3')
  const td = String(Number(totalDurSec))
  if (segmentPaths.length === 0) throw new Error('concatMp3Segments: no segments')
  if (segmentPaths.length === 1) {
    await run('ffmpeg', ['-y', '-i', segmentPaths[0], '-t', td, '-c:a', 'libmp3lame', '-q:a', '4', out], tmp)
    return out
  }
  const args = ['-y']
  for (const p of segmentPaths) args.push('-i', p)
  const n = segmentPaths.length
  let fc = ''
  const labs = []
  for (let i = 0; i < n; i++) {
    fc += `[${i}:a]aresample=48000[r${i}];`
    labs.push(`[r${i}]`)
  }
  fc += `${labs.join('')}concat=n=${n}:v=0:a=1[cat];[cat]atrim=0:${td}[bout]`
  args.push('-filter_complex', fc, '-map', '[bout]', '-c:a', 'libmp3lame', '-q:a', '4', out)
  await run('ffmpeg', args, tmp)
  return out
}

/** Sparse SFX on silence pad — stays under narration post-duck (mixed into bed bus first). */
async function buildSfxLayer(tmp, cues, totalDurSec, gainScale) {
  const out = path.join(tmp, 'sfx_bus.mp3')
  const td = num(totalDurSec, 0)
  if (!Array.isArray(cues) || cues.length === 0) return null

  const args = ['-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo:d=${td}`]
  const paths = []
  for (let i = 0; i < cues.length; i++) {
    const p = path.join(tmp, `sfx_dl_${i}.mp3`)
    await downloadTo(p, cues[i].url)
    paths.push(p)
    args.push('-i', p)
  }

  let fc = ''
  const tail = ['[0:a]']
  for (let i = 0; i < cues.length; i++) {
    const dm = Math.round(Math.max(0, num(cues[i].startSec, 0)) * 1000)
    const vol = Math.min(0.18, num(cues[i].gain, 0.07) * num(gainScale, 1))
    fc += `[${i + 1}:a]aresample=48000,adelay=${dm}|${dm},volume=${vol}[sx${i}];`
    tail.push(`[sx${i}]`)
  }
  fc += `${tail.join('')}amix=inputs=${cues.length + 1}:duration=longest:normalize=0[sfxmix];[sfxmix]atrim=0:${td}[out]`
  args.push('-filter_complex', fc, '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '6', out)
  await run('ffmpeg', args, tmp)
  return out
}

async function mixLowBedAndSfx(tmp, bedPath, sfxPath, totalDurSec) {
  const out = path.join(tmp, 'bed_plus_sfx.mp3')
  const td = String(Number(totalDurSec))
  await run(
    'ffmpeg',
    [
      '-y',
      '-i',
      bedPath,
      '-i',
      sfxPath,
      '-filter_complex',
      `[0:a][1:a]amix=inputs=2:duration=longest:normalize=0[out]`,
      '-map',
      '[out]',
      '-t',
      td,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '4',
      out
    ],
    tmp
  )
  return out
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit' })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

/** Bed only: loop + level to fill video duration (used when there is no narration). */
async function loopBedToDuration(tmp, bedPath, totalDurationSec) {
  const out = path.join(tmp, 'bed_looped.mp3')
  const td = Number(totalDurationSec)
  const fc = `[0:a]volume=0.34,aloop=loop=-1:size=2147483647,atrim=0:${td}[a]`
  await run(
    'ffmpeg',
    ['-y', '-i', bedPath, '-filter_complex', fc, '-map', '[a]', '-t', String(td), '-c:a', 'libmp3lame', '-q:a', '4', out],
    tmp
  )
  return out
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
  const backgroundMusic = p.backgroundMusic || null
  const storyAudioPlan = p.storyAudioPlan && typeof p.storyAudioPlan === 'object' ? p.storyAudioPlan : null
  const subtitles = Array.isArray(p.subtitles) ? p.subtitles : []
  const fps = Number.isFinite(p.fps) ? p.fps : 30
  let secondsPerImage = Number.isFinite(p.secondsPerImage) ? p.secondsPerImage : 4
  const assembly = p.renderAssemblyPlan && typeof p.renderAssemblyPlan === 'object' ? p.renderAssemblyPlan : null
  if (assembly && Number.isFinite(assembly.secondsPerScene)) {
    secondsPerImage = assembly.secondsPerScene
  }
  if (p.renderMode === 'trailer' && Number.isFinite(p.secondsPerImage)) {
    secondsPerImage = Math.min(secondsPerImage, p.secondsPerImage)
  }

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

  let narrFile = null
  if (audio) {
    narrFile = path.join(tmp, 'narration.mp3')
    await downloadTo(narrFile, audio)
  }

  let bedRaw = null
  if (backgroundMusic) {
    bedRaw = path.join(tmp, 'bed_download.mp3')
    await downloadTo(bedRaw, backgroundMusic)
  }

  const totalDuration = images.length * secondsPerImage

  const musicOn = storyAudioPlan ? storyAudioPlan.musicEnabled !== false : true
  const sfxOn = storyAudioPlan ? storyAudioPlan.sfxEnabled !== false : true
  const autoMix = storyAudioPlan ? storyAudioPlan.autoMix !== false : true
  const musicGain = storyAudioPlan && typeof storyAudioPlan.musicGain === 'number' ? storyAudioPlan.musicGain : 0.22
  const sfxGainScale = storyAudioPlan && typeof storyAudioPlan.sfxGain === 'number' ? storyAudioPlan.sfxGain : 0.085

  let bedTimelinePath = null

  if (musicOn && autoMix && Array.isArray(storyAudioPlan?.segments) && storyAudioPlan.segments.length) {
    try {
      const nImg = images.length
      const spi = secondsPerImage
      const fallbackBedUrl = backgroundMusic || storyAudioPlan.segments[0]?.bedUrl
      if (!fallbackBedUrl) throw new Error('storyAudioPlan segments need bedUrl or payload.backgroundMusic')
      let segs = storyAudioPlan.segments.slice(0, nImg)
      while (segs.length < nImg) {
        segs.push({
          bedUrl: fallbackBedUrl,
          intensity: 0.45,
          durationSec: spi
        })
      }
      const segPaths = []
      for (let i = 0; i < nImg; i++) {
        const row = segs[i] || {}
        const url = row.bedUrl || fallbackBedUrl
        segPaths.push(await prepareBedSegment(tmp, url, spi, row.intensity, musicGain, i))
      }
      bedTimelinePath = await concatMp3Segments(tmp, segPaths, totalDuration)
    } catch (e) {
      console.warn('Segmented bed failed, falling back to single loop:', e?.message || e)
      bedTimelinePath = null
    }
  }

  if (musicOn && !bedTimelinePath && bedRaw) {
    bedTimelinePath = await loopBedToDuration(tmp, bedRaw, totalDuration)
  }

  let sfxPath = null
  if (sfxOn && autoMix && Array.isArray(storyAudioPlan?.sfxCues) && storyAudioPlan.sfxCues.length) {
    try {
      sfxPath = await buildSfxLayer(tmp, storyAudioPlan.sfxCues, totalDuration, sfxGainScale)
    } catch (e) {
      console.warn('SFX layer failed:', e?.message || e)
      sfxPath = null
    }
  }

  let richBedPath = bedTimelinePath
  if (bedTimelinePath && sfxPath) {
    richBedPath = await mixLowBedAndSfx(tmp, bedTimelinePath, sfxPath, totalDuration)
  } else if (!bedTimelinePath && sfxPath) {
    richBedPath = sfxPath
  }

  let audioFile = null
  if (narrFile && richBedPath) {
    audioFile = await duckMixNarrBed(tmp, narrFile, richBedPath, totalDuration)
  } else if (narrFile) {
    audioFile = narrFile
  } else if (richBedPath) {
    audioFile = richBedPath
  }

  const srtFile = path.join(tmp, 'captions.srt')
  if (subtitles.length) writeSrt(srtFile, subtitles)

  const out1080 = path.join(tmp, 'out_1080.mp4')
  const out4k = path.join(tmp, 'out_4k.mp4')
  const imgRate = String(1 / secondsPerImage)
  /** Quality-first master encodes (CRF). Override via env without changing job payload. */
  const MASTER_CRF = num(process.env.KATHA_MASTER_CRF, 17)
  const UPSCALE_CRF = num(process.env.KATHA_4K_CRF, 17)
  const ENCODE_PRESET = process.env.KATHA_ENCODE_PRESET || 'slow'

  await api('POST', '/api/worker-progress', { id, progress: 30, stage: 'ffmpeg 1080p' })

  // Subtitles path must not be an absolute Windows path in -vf: `C:` is parsed as a filter option
  // separator. `run(..., tmp)` sets cwd to tmp, where captions.srt is written.
  const vf1080 = [
    'scale=1920:1080:force_original_aspect_ratio=decrease',
    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    `fps=${fps}`,
    subtitles.length ? `subtitles=${path.basename(srtFile)}` : null
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
    ENCODE_PRESET,
    '-crf',
    String(MASTER_CRF),
    '-profile:v',
    'high',
    '-movflags',
    '+faststart',
    ...(audioFile
      ? ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest']
      : []),
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
    ENCODE_PRESET,
    '-crf',
    String(UPSCALE_CRF),
    '-profile:v',
    'high',
    '-movflags',
    '+faststart',
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
