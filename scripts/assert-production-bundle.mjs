/**
 * Fails CI/Vercel if the web build looks like the old stub (single ~250KB chunk)
 * instead of the full studio (code-split, large CSS, kathaWebBridge chunk).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'web-dist')
const assets = path.join(dist, 'assets')

function fail(msg) {
  console.error(`[assert-production-bundle] ${msg}`)
  process.exit(1)
}

if (!fs.existsSync(dist)) fail(`Missing ${dist} — run npm run web:build first.`)

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!html.includes('कथा एकादेशको') && !html.includes('Katha')) {
  fail('index.html does not look like Katha Ekadeshko.')
}

if (!fs.existsSync(assets)) fail('web-dist/assets missing — build did not complete.')

const files = fs.readdirSync(assets)
const js = files.filter((f) => f.endsWith('.js'))
const css = files.filter((f) => f.endsWith('.css'))

const totalJs = js.reduce((n, f) => n + fs.statSync(path.join(assets, f)).size, 0)
const totalCss = css.reduce((n, f) => n + fs.statSync(path.join(assets, f)).size, 0)

// Stub deploy (GitHub main before web/ migration): ~1 JS ~257KB, ~1 CSS ~8KB
if (js.length < 4) {
  fail(
    `Only ${js.length} JS chunk(s) in web-dist — expected full studio build (4+). ` +
      'Push the latest code (web/ entry + vite.web.config.ts) before deploying.'
  )
}
if (totalJs < 400_000) {
  fail(`Total JS ${totalJs} bytes is too small — likely stub build, not full studio.`)
}
if (totalCss < 100_000) {
  fail(`Total CSS ${totalCss} bytes is too small — studio styles missing from bundle.`)
}
if (!js.some((f) => /kathaWebBridge|main-|vendor-react/i.test(f))) {
  fail('Expected kathaWebBridge or vendor chunks in assets — check vite.web.config.ts root: web')
}

console.log(
  `[assert-production-bundle] OK — ${js.length} JS chunks (${Math.round(totalJs / 1024)} KiB), ` +
    `${css.length} CSS files (${Math.round(totalCss / 1024)} KiB)`
)
