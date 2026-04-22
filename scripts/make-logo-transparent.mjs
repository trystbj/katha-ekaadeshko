import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

function dist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function getPx(data, width, x, y) {
  const i = (y * width + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

async function main() {
  const root = path.resolve(process.cwd())
  const input = process.argv[2]
  const output = process.argv[3]

  if (!input || !output) {
    console.error('Usage: node scripts/make-logo-transparent.mjs <in.png> <out.png>')
    process.exit(1)
  }
  if (!fs.existsSync(input)) {
    console.error(`Missing input: ${input}`)
    process.exit(1)
  }

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height

  // Sample the two checker colors from the corner.
  const c1 = getPx(data, w, 0, 0)
  const c2 = getPx(data, w, 1, 0)
  const b1 = [c1[0], c1[1], c1[2]]
  const b2 = [c2[0], c2[1], c2[2]]

  // Conservative threshold: only remove pixels that are very close
  // to either checker color. This keeps the warm text and glowing lines.
  const threshold = 28

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const rgb = [data[i], data[i + 1], data[i + 2]]
      const d1 = dist(rgb, b1)
      const d2 = dist(rgb, b2)
      if (Math.min(d1, d2) <= threshold) {
        data[i + 3] = 0
      }
    }
  }

  // Remove the tiny watermark/star in the bottom-right corner.
  // This area is outside the logo/text, so it's safe to zero-out.
  const starPad = Math.max(56, Math.floor(Math.min(w, h) * 0.12))
  for (let y = h - starPad; y < h; y++) {
    for (let x = w - starPad; x < w; x++) {
      const i = (y * w + x) * 4
      data[i + 3] = 0
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(output)

  console.log(`Wrote ${output}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

