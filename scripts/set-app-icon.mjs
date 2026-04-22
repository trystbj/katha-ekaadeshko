import path from 'node:path'
import fs from 'node:fs'
import sharp from 'sharp'

/**
 * Usage:
 *   node scripts/set-app-icon.mjs <input.png>
 *
 * Writes:
 *   build/icon.png
 *
 * Goal: remove any solid/near-solid black background (common in exported icons),
 * while keeping the rounded square artwork intact.
 */

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/set-app-icon.mjs <input.png>')
  process.exit(1)
}

const root = path.resolve(process.cwd())
const outPng = path.join(root, 'build', 'icon.png')
fs.mkdirSync(path.dirname(outPng), { recursive: true })

const img = sharp(input).ensureAlpha()
const meta = await img.metadata()
const w = meta.width || 1024
const h = meta.height || 1024
const { data } = await img.raw().toBuffer({ resolveWithObject: true })

// Remove near-black pixels that are connected to the edges (background).
// This preserves internal dark tones inside the icon artwork.
const alpha = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3]

const isNearBlack = (i) => {
  const r = data[i * 4 + 0]
  const g = data[i * 4 + 1]
  const b = data[i * 4 + 2]
  const a = data[i * 4 + 3]
  if (a < 8) return true
  return r < 20 && g < 20 && b < 20
}

const visited = new Uint8Array(w * h)
const qx = new Int32Array(w * h)
const qy = new Int32Array(w * h)
let qh = 0
let qt = 0

const push = (x, y) => {
  qx[qt] = x
  qy[qt] = y
  qt++
}

// Seed queue from border pixels that look like background.
for (let x = 0; x < w; x++) {
  const top = x
  const bottom = (h - 1) * w + x
  if (!visited[top] && isNearBlack(top)) {
    visited[top] = 1
    push(x, 0)
  }
  if (!visited[bottom] && isNearBlack(bottom)) {
    visited[bottom] = 1
    push(x, h - 1)
  }
}
for (let y = 0; y < h; y++) {
  const left = y * w
  const right = y * w + (w - 1)
  if (!visited[left] && isNearBlack(left)) {
    visited[left] = 1
    push(0, y)
  }
  if (!visited[right] && isNearBlack(right)) {
    visited[right] = 1
    push(w - 1, y)
  }
}

const idx = (x, y) => y * w + x
while (qh < qt) {
  const x = qx[qh]
  const y = qy[qh]
  qh++
  const i = idx(x, y)
  // Knock out alpha for background pixels.
  data[i * 4 + 3] = 0
  const n = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1]
  ]
  for (const [nx, ny] of n) {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
    const ni = idx(nx, ny)
    if (visited[ni]) continue
    if (!isNearBlack(ni)) continue
    visited[ni] = 1
    push(nx, ny)
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(outPng)

console.log(`Wrote ${outPng}`)

