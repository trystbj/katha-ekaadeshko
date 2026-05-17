import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src', 'renderer', 'src')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function rel(p) {
  return relative(ROOT, p).split(sep).join('/')
}

/** Dictionary / seed content — literals expected */
function shouldIgnoreFile(path) {
  const r = rel(path)
  if (r.includes('i18n/translations/')) return true
  if (r.endsWith('i18n/resources.ts')) return true
  if (r.includes('content/userGuideSections')) return true
  if (r.includes('constants/narrators')) return true
  if (/\.test\.tsx?$/.test(r)) return true
  return false
}

function looksLikeVisibleTextLiteral(s) {
  if (!s) return false
  if (s.length < 3) return false
  if (/^[\s0-9.,:;!?'"\-–—()[\]{}<>/\\|]+$/.test(s)) return false
  if (/https?:\/\//.test(s)) return false
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return false
  return true
}

function auditFile(path) {
  if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) return []
  if (shouldIgnoreFile(path)) return []
  const text = readFileSync(path, 'utf8')

  const findings = []

  // JSX text-only children: must end at a real closing tag (avoid matching `>` inside `{expr}`)
  const jsxText = [...text.matchAll(/\s*>([^<{}]+?)<\/[\w.-]+\s*>/gs)]
  for (const m of jsxText) {
    const raw = m[1].replace(/\s+/g, ' ').trim()
    if (!looksLikeVisibleTextLiteral(raw)) continue
    if (raw.includes('{t(') || raw.includes('t(') || raw.includes('{uiText(')) continue
    if (/\b(const|let|var|function|return|void|typeof)\b/.test(raw)) continue
    if (/^[a-z_$][\w$]*\s*\(/i.test(raw)) continue
    findings.push({ kind: 'jsx-text', text: raw })
  }

  // UI attributes with string literals
  const attrs = [
    ...text.matchAll(
      /\b(aria-label|title|placeholder|alt)\s*=\s*("([^"]+)"|'([^']+)')/g
    )
  ]
  for (const m of attrs) {
    const raw = (m[3] || m[4] || '').trim()
    if (!looksLikeVisibleTextLiteral(raw)) continue
    if (/^rgba\(/i.test(raw)) continue
    if (raw.includes('{t(') || raw.includes('t(') || raw.includes('{uiText(')) continue
    findings.push({ kind: `attr:${m[1]}`, text: raw })
  }

  return findings
}

const allUiFiles = walk(SRC).filter((p) => p.endsWith('.tsx') || p.endsWith('.jsx'))

let total = 0
for (const f of allUiFiles) {
  const findings = auditFile(f)
  if (!findings.length) continue
  total += findings.length
  console.log(`\n${rel(f)}`)
  for (const x of findings.slice(0, 40)) {
    console.log(`  [UNLOCALIZED_TEXT_BLOCKED] [${x.kind}] ${x.text}`)
  }
  if (findings.length > 40) console.log(`  ... +${findings.length - 40} more`)
}

if (total) {
  console.error(
    `\n[UNLOCALIZED_TEXT_BLOCKED] [i18n-audit] Found ${total} potential hardcoded UI strings under src/renderer/src.`
  )
  process.exit(1)
}
console.log('[i18n-audit] OK (no obvious hardcoded UI strings in scanned TSX/JSX).')
