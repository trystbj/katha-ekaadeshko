/**
 * Ensures production bundle uses 10000-char story idea limit (not legacy 500/2000).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function fail(msg) {
  console.error(`[assert-idea-limit] ${msg}`)
  process.exit(1)
}

function readBridgeChunk(dirLabel, baseDir) {
  const assets = path.join(root, baseDir, 'assets')
  if (!fs.existsSync(assets)) fail(`Missing ${dirLabel}/assets — run npm run web:build first.`)
  const bridge = fs.readdirSync(assets).find((f) => /^kathaWebBridge-.*\.js$/.test(f))
  if (!bridge) fail(`Missing kathaWebBridge chunk in ${dirLabel}.`)
  return fs.readFileSync(path.join(assets, bridge), 'utf8')
}

const text = readBridgeChunk('web-dist', 'web-dist')
const distText = fs.existsSync(path.join(root, 'dist', 'assets'))
  ? readBridgeChunk('dist', 'dist')
  : null

if (/maxLength:\s*500\b|maxlength:\s*500\b|maxLength=500/.test(text)) {
  fail('Bundle still contains maxLength 500 for story idea.')
}

if (!/\b1e4\b/.test(text) && !/\b10000\b/.test(text)) {
  fail('Bundle missing 10000 (1e4) story idea limit constant.')
}

const sharedLimits = fs.readFileSync(path.join(root, 'shared', 'storyIdeaLimits.js'), 'utf8')
if (!/STORY_IDEA_MAX_CHARS\s*=\s*10_?000/.test(sharedLimits)) {
  fail('shared/storyIdeaLimits.js must set STORY_IDEA_MAX_CHARS = 10000.')
}
if (!/STORY_IDEA_SOFT_WARN_CHARS\s*=\s*6_?000/.test(sharedLimits)) {
  fail('shared/storyIdeaLimits.js must set STORY_IDEA_SOFT_WARN_CHARS = 6000.')
}

function assertNoVisibleSeedCounter(bundleText, label) {
  if (bundleText.includes('id:"studio-story-seed-count"')) {
    fail(`${label} still renders story-seed character counter — run npm run web:build.`)
  }
  if (bundleText.includes('ideaFieldWireframe",{max:')) {
    fail(`${label} still uses character-limit placeholder — run npm run web:build.`)
  }
  if (/studio-mock-char-count\$\{/.test(bundleText)) {
    fail(`${label} still renders story-seed character counter — run npm run web:build.`)
  }
}

assertNoVisibleSeedCounter(text, 'web-dist')
if (distText) assertNoVisibleSeedCounter(distText, 'dist')

console.log('[assert-idea-limit] OK — story idea limit is 10000; seed UI has no counter or limit hint.')
