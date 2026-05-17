/**
 * Vercel dashboard / Vite preset often expect `dist/`.
 * We build to `web-dist/` (Tauri); mirror to `dist/` for deploy.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'web-dist')
const dest = path.join(root, 'dist')

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, ent.name)
    const d = path.join(to, ent.name)
    if (ent.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(src)) {
  console.error('[sync-vercel-output] Missing web-dist — run vite build first.')
  process.exit(1)
}

rmDir(dest)
copyDir(src, dest)
console.log('[sync-vercel-output] Copied web-dist → dist for Vercel')
