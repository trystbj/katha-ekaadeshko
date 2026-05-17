import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const fp = path.join(root, 'src/renderer/src/i18n/resources.ts')
const text = fs.readFileSync(fp, 'utf8')

function sliceBetween(startPat, endPat) {
  const i = text.indexOf(startPat)
  if (i < 0) throw new Error('missing ' + startPat)
  const j = text.indexOf(endPat, i + startPat.length)
  if (j < 0) throw new Error('missing end ' + endPat)
  return text.slice(i, j).trimEnd()
}

const outDir = path.join(root, 'src/renderer/src/i18n/translations')
fs.mkdirSync(outDir, { recursive: true })

const enRaw = sliceBetween('const en = {', '\n\nconst ne:')
const enBody = enRaw.replace(/^const en\s*=\s*/, 'export const en = ')
fs.writeFileSync(
  path.join(outDir, 'en.ts'),
  `/** Primary UI locale — fallback source for all languages */\n${enBody}\n`
)

function innerBlock(raw, headerRe) {
  return raw.replace(headerRe, '').replace(/\}\s*$/, '').trim()
}

const neRaw = sliceBetween('const ne: typeof en = {', '\n\nconst hi:')
const neInner = innerBlock(neRaw, /^const ne:\s*typeof en\s*=\s*\{/)
fs.writeFileSync(
  path.join(outDir, 'ne.ts'),
  `import { en } from './en'\n\nexport const ne: typeof en = {\n${neInner}\n}\n`
)

function writeFullLocale(name, raw, headerRe) {
  const inner = innerBlock(raw, headerRe)
  fs.writeFileSync(
    path.join(outDir, `${name}.ts`),
    `import { en } from './en'\n\nexport const ${name}: typeof en = {\n${inner}\n}\n`
  )
}

writeFullLocale('hi', sliceBetween('const hi: typeof en = {', '\n\nconst ko:'), /^const hi:\s*typeof en\s*=\s*\{/)

function writePartial(name, raw, headerRe) {
  const inner = innerBlock(raw, headerRe)
  fs.writeFileSync(
    path.join(outDir, `${name}.ts`),
    `import type { en } from './en'\n\nexport const ${name}: Partial<typeof en> = {\n${inner}\n}\n`
  )
}

writePartial('ko', sliceBetween('const ko: Partial<typeof en> = {', '\n\nconst ja:'), /^const ko:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('ja', sliceBetween('const ja: Partial<typeof en> = {', '\n\nconst zh:'), /^const ja:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('zh', sliceBetween('const zh: Partial<typeof en> = {', '\n\nconst ar:'), /^const zh:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('ar', sliceBetween('const ar: Partial<typeof en> = {', '\n\nconst es:'), /^const ar:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('es', sliceBetween('const es: Partial<typeof en> = {', '\n\nconst fr:'), /^const es:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('fr', sliceBetween('const fr: Partial<typeof en> = {', '\n\nconst de:'), /^const fr:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('de', sliceBetween('const de: Partial<typeof en> = {', '\n\nconst ru:'), /^const de:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('ru', sliceBetween('const ru: Partial<typeof en> = {', '\n\nconst th:'), /^const ru:\s*Partial<typeof en>\s*=\s*\{/)
writePartial('th', sliceBetween('const th: Partial<typeof en> = {', '\n\nfunction merge'), /^const th:\s*Partial<typeof en>\s*=\s*\{/)

console.log('OK:', outDir)
