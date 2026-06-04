/**
 * Mandatory character portrait generation + validation before scene images.
 */

import { leonardoGenerateOne, leonardoDimensionsForAspectMode } from '../services/leonardoService.js'
import { buildCharacterPortraitPromptFromDNA } from '../utils/characterPortraitPrompt.js'
import { validateRemoteSceneImageUrl } from './sceneImageFetchValidation.js'
import { pipelineStageLog } from '../utils/pipelineStageLog.js'
import { buildAllCharacterDNA } from './characterDNA.js'
import { isServerlessRuntime } from '../utils/runtime.js'

function portraitMaxAttempts() {
  const n = Number(process.env.KATHA_PORTRAIT_MAX_ATTEMPTS || 4)
  return Number.isFinite(n) && n >= 1 ? Math.min(6, Math.floor(n)) : 4
}

/**
 * @param {string} url
 */
async function validatePortraitUrl(url) {
  if (!url) return { ok: false, reason: 'missing_url' }
  const remote = await validateRemoteSceneImageUrl(url)
  return remote.ok ? { ok: true } : { ok: false, reason: remote.issues?.join(',') || 'invalid' }
}

/**
 * @param {Array<Record<string, unknown>>} characters
 * @param {object} input
 * @param {(p: object) => void} [onProgress]
 */
export async function ensureCharacterPortraits(characters = [], input = {}, onProgress) {
  if (!Array.isArray(characters) || !characters.length) return []
  const skipNewPortraits =
    input.skipCharacterPortraits === true ||
    (isServerlessRuntime() && process.env.KATHA_SERVERLESS_PORTRAITS !== '1')
  if (skipNewPortraits) {
    pipelineStageLog('character_portraits_skipped', {
      reason: 'serverless_scene_priority',
      count: characters.length
    })
    const dnaList = buildAllCharacterDNA(characters, {
      country: input.country,
      theme: input.theme || input.seedLine
    })
    return characters.map((c, i) => ({
      ...c,
      characterDNA: c.characterDNA || dnaList[i]
    }))
  }
  const dnaList = buildAllCharacterDNA(characters, {
    country: input.country,
    theme: input.theme || input.seedLine
  })
  const out = []
  let i = 0
  for (const raw of characters) {
    i += 1
    const dna = dnaList[i - 1] || raw.characterDNA
    let row = { ...raw, characterDNA: dna }
    const existing = String(row.baseImageUrl || '').trim()
    if (existing) {
      const check = await validatePortraitUrl(existing)
      if (check.ok) {
        out.push(row)
        continue
      }
      pipelineStageLog('character_portrait_invalid', { name: row.name, reason: check.reason })
    }

    if (onProgress) {
      onProgress({
        stage: 'character_portrait',
        progress: Math.round((i / characters.length) * 12),
        message: `Generating portrait for ${row.name || 'character'}…`
      })
    }

    const prompt = buildCharacterPortraitPromptFromDNA(row, input)
    const { width, height } = leonardoDimensionsForAspectMode(input.aspectMode)
    let imageUrl = ''
    let seed = row.leonardoSeed
    const max = portraitMaxAttempts()

    for (let attempt = 1; attempt <= max; attempt++) {
      try {
        const gen = await leonardoGenerateOne({
          prompt,
          width,
          height,
          seed: typeof seed === 'number' ? seed : undefined,
          aspectMode: input.aspectMode
        })
        imageUrl = String(gen.imageUrl || '').trim()
        seed = gen.seed ?? seed
        const valid = await validatePortraitUrl(imageUrl)
        if (valid.ok) break
        pipelineStageLog('character_portrait_retry', {
          name: row.name,
          attempt,
          reason: valid.reason
        })
        imageUrl = ''
      } catch (e) {
        pipelineStageLog('character_portrait_failed', {
          name: row.name,
          attempt,
          message: e instanceof Error ? e.message : String(e)
        })
      }
    }

    if (imageUrl) {
      row = { ...row, baseImageUrl: imageUrl, ...(seed != null ? { leonardoSeed: seed } : {}) }
      pipelineStageLog('character_portrait_ready', { name: row.name })
    } else {
      console.warn('[katha:character]', 'portrait_missing', { name: row.name })
    }
    out.push(row)
  }
  return out
}

/**
 * @param {Array<Record<string, unknown>>} characters
 */
export function assertCharacterPortraitsReady(characters = []) {
  const missing = characters.filter((c) => !String(c.baseImageUrl || '').trim()).map((c) => c.name)
  if (missing.length) {
    throw new Error(`Character portraits incomplete — missing: ${missing.join(', ')}`)
  }
}
