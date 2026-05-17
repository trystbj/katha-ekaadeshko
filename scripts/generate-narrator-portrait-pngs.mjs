/**
 * Downloads deterministic illustrated PNG avatars for bundled narrator presets.
 * Seeds encode gender / age band / voice role so each face stays distinct offline.
 *
 * Run: node scripts/generate-narrator-portrait-pngs.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'narrators')

/** @type {{ file: string; style: string; seed: string }[]} */
const SPECS = [
  // m2: male, mature, crisp oral-tradition elder energy
  {
    file: 'narrator-m2-crisp.png',
    style: 'adventurer',
    seed: 'katha-m2-male-mature-crisp-south-asian-oral-tradition'
  },
  // m3: male, young adult, calm conversational mentor
  {
    file: 'narrator-m3-calm.png',
    style: 'adventurer',
    seed: 'katha-m3-male-youngadult-calm-silky-conversational'
  },
  // f1: female, adult, broadcast documentary warmth
  {
    file: 'narrator-f1-warm-clear.png',
    style: 'lorelei',
    seed: 'katha-f1-female-adult-broadcast-warm-studio-clear'
  },
  // f2: female, mature, hearth storyteller alto velvet
  {
    file: 'narrator-f2-bright.png',
    style: 'lorelei',
    seed: 'katha-f2-female-mature-hearth-nepali-storyteller-alto'
  },
  // f3: female, teen, upbeat rhythmic YA energy
  {
    file: 'narrator-f3-soft-story.png',
    style: 'lorelei',
    seed: 'katha-f3-female-teen-upbeat-airy-ya-story'
  }
]

const SIZE = 640

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const { file, style, seed } of SPECS) {
    const url = `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(seed)}&size=${SIZE}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`${file}: HTTP ${res.status} ${body.slice(0, 200)}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(join(outDir, file), buf)
    console.log('wrote', file, `(${buf.length} bytes)`)
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
