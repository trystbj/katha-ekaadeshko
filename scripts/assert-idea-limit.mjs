/**
 * Ensures production bundle uses 2000-char story idea limit (not legacy 500/1000).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(root, 'web-dist', 'assets')

function fail(msg) {
  console.error(`[assert-idea-limit] ${msg}`)
  process.exit(1)
}

if (!fs.existsSync(assets)) fail('Missing web-dist/assets — run npm run web:build first.')

const bridge = fs.readdirSync(assets).find((f) => /^kathaWebBridge-.*\.js$/.test(f))
if (!bridge) fail('Missing kathaWebBridge chunk.')

const text = fs.readFileSync(path.join(assets, bridge), 'utf8')

if (/maxLength:\s*500\b|maxlength:\s*500\b|maxLength=500/.test(text)) {
  fail('Bundle still contains maxLength 500 for story idea.')
}

if (!/\b2e3\b/.test(text) && !/\b2000\b/.test(text)) {
  fail('Bundle missing 2000 (2e3) story idea limit constant.')
}

const sharedLimits = fs.readFileSync(path.join(root, 'shared', 'storyIdeaLimits.js'), 'utf8')
if (!/STORY_IDEA_MAX_CHARS\s*=\s*2000/.test(sharedLimits)) {
  fail('shared/storyIdeaLimits.js must set STORY_IDEA_MAX_CHARS = 2000.')
}

if (!text.includes('data-idea-max')) {
  fail('Bundle missing data-idea-max attribute on char counter.')
}

console.log('[assert-idea-limit] OK — story idea limit is 2000 in production bundle.')
