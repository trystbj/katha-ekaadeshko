/**
 * One-shot codemod: useTranslation + `t` → useUiText/useAppI18n + `uiText`.
 * Skips i18n shell files that legitimately call useTranslation without `t`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src', 'renderer', 'src')

const SKIP_BASENAME = new Set([
  'LanguageProvider.tsx',
  'useSyncUiLanguageToI18n.ts',
  'LocalizedAppRoot.tsx',
  'useAppI18n.ts',
  'uiText.ts',
  'uiTextGlobal.ts'
])

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function importUseAppI18n(fromFile) {
  let rel = path.relative(path.dirname(fromFile), path.join(SRC, 'i18n', 'useAppI18n'))
  rel = rel.split(path.sep).join('/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

function patch(content, absPath) {
  let s = content
  const base = path.basename(absPath)
  if (SKIP_BASENAME.has(base)) return null

  if (!s.includes('useTranslation')) return null

  const before = s

  s = s.replace(/const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\)/g, 'const uiText = useUiText()')
  s = s.replace(/const\s*\{\s*t\s*,\s*i18n\s*\}\s*=\s*useTranslation\(\)/g, 'const { uiText, i18n } = useAppI18n()')
  s = s.replace(/const\s*\{\s*i18n\s*,\s*t\s*\}\s*=\s*useTranslation\(\)/g, 'const { uiText, i18n } = useAppI18n()')

  // Replace translation calls `t(` → `uiText(` after migrating off destructured `t`.
  if (before !== s || /\buiText\s*=\s*useUiText\s*\(\)/.test(s) || /\buiText\s*,\s*i18n/.test(s)) {
    s = s.replace(/\bt\(/g, 'uiText(')
  }

  if (s === before) return null

  const imp = importUseAppI18n(absPath)
  const needsUiText = /\buseUiText\s*\(\)/.test(s)
  const needsApp = /\buseAppI18n\s*\(\)/.test(s)

  const stripReactI18nextImport = () => {
    if (!/\buseTranslation\s*\(/.test(s)) {
      s = s.replace(/import\s*\{\s*([^}]*)\s*\}\s*from\s*['"]react-i18next['"]\s*\n?/g, (line, inner) => {
        const parts = inner
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
          .filter((name) => name !== 'useTranslation')
        if (!parts.length) return ''
        return `import { ${parts.join(', ')} } from 'react-i18next'\n`
      })
      s = s.replace(/\n\n\n+/g, '\n\n')
    }
  }

  if (needsUiText || needsApp) {
    const names = []
    if (needsUiText) names.push('useUiText')
    if (needsApp) names.push('useAppI18n')
    const importLine = `import { ${names.join(', ')} } from '${imp}'`

    if (!s.includes(`from '${imp}'`) && !s.includes(`from "${imp}"`)) {
      const firstImport = s.search(/^import\s/m)
      if (firstImport === -1) s = `${importLine}\n${s}`
      else {
        const lineEnd = s.indexOf('\n', firstImport)
        s = s.slice(0, lineEnd + 1) + `${importLine}\n` + s.slice(lineEnd + 1)
      }
    } else {
      // Merge into existing import from same module
      s = s.replace(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${imp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`), (_, inner) => {
        const set = new Set(
          inner
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        )
        names.forEach((n) => set.add(n))
        return `import { ${[...set].join(', ')} } from '${imp}'`
      })
    }
  }

  stripReactI18nextImport()

  return s
}

let changed = 0
for (const f of walk(SRC)) {
  if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue
  const raw = fs.readFileSync(f, 'utf8')
  const next = patch(raw, f)
  if (next != null && next !== raw) {
    fs.writeFileSync(f, next)
    changed++
    console.log('updated', path.relative(ROOT, f))
  }
}
console.log(`[codemod-useUiText] ${changed} files updated.`)
