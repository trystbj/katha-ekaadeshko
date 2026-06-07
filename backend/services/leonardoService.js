import { buildLeonardoScenePrompt } from '../utils/visualStyleLock.js'
import { verifySceneCharacterProfilesForLeonardo } from '../utils/leonardoPromptQuality.js'
import {
  buildOptimizedLeonardoScenePrompts,
  prepareLeonardoApiPrompts
} from '../utils/leonardoPromptOptimizer.js'
import { pipelineStageLog, isStrictImagePipeline } from '../utils/pipelineStageLog.js'
import { validateRemoteSceneImageUrl } from '../cinematic/sceneImageFetchValidation.js'
import { buildProfessionalSceneVisualDescription } from '../utils/sceneVisualIntelligence.js'
import { characterReferencePromptBlock } from '../utils/characterReferencePrompt.js'
import {
  buildCharacterIdentityMemory,
  leonardoIdentityBlockForScriptRow
} from '../character/characterIdentityMemory.js'
import { isServerlessRuntime } from '../utils/runtime.js'
import {
  buildSceneVisualBlueprint,
  leonardoPromptFromBlueprint
} from './cinematic/cinematicVisualBlueprint.js'
import {
  tryAcquireSceneGenerationLock,
  markSceneGenerationComplete,
  releaseSceneGenerationLock
} from '../utils/sceneGenerationLock.js'
import { validateSceneImageMatch } from '../cinematic/sceneImageMatchValidation.js'
import { resolveStyleProfile } from '../utils/visualStyleLock.js'
import { TEXT_FREE_NEGATIVE } from '../cinematic/masterStoryContext.js'
import {
  serverlessLeonardoParallelLimit,
  serverlessLeonardoSceneCooldownMs
} from '../utils/serverlessSceneLimits.js'
import { parseLeonardoApiError } from '../utils/leonardoErrors.js'
import { traceVisualScene } from '../utils/visualSceneTrace.js'
import { validateSceneVisualPreflight } from '../utils/sceneVisualPreflight.js'
import { buildScenePlaceholderImageUrl } from '../../shared/scenePlaceholderImage.js'

function sceneImageMaxAttempts() {
  const n = Number(process.env.KATHA_SCENE_MAX_ATTEMPTS || 3)
  return Number.isFinite(n) && n >= 1 ? Math.min(8, Math.floor(n)) : 3
}

function sceneRetryPasses() {
  const n = Number(process.env.KATHA_SCENE_RETRY_PASSES || 1)
  return Number.isFinite(n) && n >= 0 ? Math.min(4, Math.floor(n)) : 1
}

async function generateOneWithRetry(args) {
  const max = Math.min(3, sceneImageMaxAttempts())
  let lastErr = null
  let prompt = args.prompt
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      const started = Date.now()
      const result = await generateOne({ ...args, prompt })
      traceVisualScene('leonardo_ok', {
        scene: args.scene,
        attempt,
        durationMs: Date.now() - started,
        hasUrl: Boolean(result?.imageUrl),
        generationId: result?.leonardoGenerationId,
        status: 200
      })
      return result
    } catch (e) {
      lastErr = e
      const message = e instanceof Error ? e.message : String(e)
      traceVisualScene('leonardo_retry', {
        scene: args.scene,
        attempt,
        failed: true,
        message: message.slice(0, 280)
      })
      if (/prompt|token|moderation|invalid/i.test(message) && prompt) {
        prompt = String(prompt)
          .replace(/[^\w\s.,;:'"()\-–—/]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1400)
        traceVisualScene('prompt_regenerated', { scene: args.scene, attempt, promptLength: prompt.length })
      }
      if (attempt < max) await sleep(900 * Math.pow(2, attempt - 1))
    }
  }
  throw lastErr || new Error('Leonardo: generation failed')
}

const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1'

/** Leonardo-friendly sizes (multiples of 8), matched to the studio aspect control. */
export function leonardoDimensionsForAspectMode(aspectMode) {
  if (aspectMode === 'horizontal_16_9') return { width: 1280, height: 720 }
  return { width: 720, height: 1280 }
}

function requireKey() {
  const key = process.env.LEONARDO_API_KEY
  if (!key) throw new Error('LEONARDO_API_KEY is missing')
  return key
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function leonardoGenerateForScript({
  script,
  input,
  onProgress,
  characters,
  sceneBlueprints,
  projectId,
  strict: strictOpt,
  allowServerlessLeonardo
}) {
  const strict = strictOpt !== false && isStrictImagePipeline()
  const serverlessLeonardoOk =
    process.env.KATHA_SERVERLESS_LEONARDO === '1' || allowServerlessLeonardo === true
  // Serverless-safe: Leonardo returns hosted URLs; no local storage required.
  if (process.env.KATHA_DISABLE_LEONARDO === '1') {
    if (strict) throw new Error('Leonardo is disabled (KATHA_DISABLE_LEONARDO) — scene images are required.')
    return []
  }
  if (isServerlessRuntime() && !serverlessLeonardoOk) {
    if (strict) {
      throw new Error(
        'Scene image generation is unavailable in serverless mode. Set KATHA_SERVERLESS_LEONARDO=1 or use the worker.'
      )
    }
    return []
  }
  if (!process.env.LEONARDO_API_KEY) {
    if (strict) throw new Error('LEONARDO_API_KEY is missing — cannot generate scene images.')
    console.warn('[katha:leonardo]', 'missing_api_key_returning_placeholders', { scenes: script.length })
    return script.map((row, i) => {
      const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
      return {
        scene: sceneNum,
        image_url: buildScenePlaceholderImageUrl(sceneNum, 'API key missing'),
        status: 'placeholder',
        error: 'missing_api_key'
      }
    })
  }
  const modelId = process.env.LEONARDO_MODEL_ID || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'
  const { width, height } = leonardoDimensionsForAspectMode(input.aspectMode)

  const styleProfile = resolveStyleProfile(input)
  const castMemory = buildCharacterIdentityMemory(Array.isArray(characters) ? characters : [])
  const crefPrompt = characterReferencePromptBlock(input.characterReference, characters)
  const inputWithRefs = crefPrompt
    ? { ...input, __characterReferencePrompt: crefPrompt }
    : input
  const out = []
  const failures = []
  const total = script.length
  const parallelLimit = Math.min(total, serverlessLeonardoParallelLimit())
  const sceneCooldownMs = serverlessLeonardoSceneCooldownMs()

  if (onProgress) {
    onProgress({
      stage: 'images_queued',
      progress: 0,
      total,
      message: `Queued ${total} scenes for parallel generation…`
    })
  }

  let completed = 0
  let succeeded = 0
  let cursor = 0

  async function generateSceneRow(s, i) {
    const sceneNum = Number(s.scene)
    const sceneKey = Number.isFinite(sceneNum) && sceneNum > 0 ? sceneNum : i + 1
    const lockId = projectId || input.projectId || 'studio'
    if (!tryAcquireSceneGenerationLock(lockId, sceneKey)) {
      console.info('[katha:leonardo]', 'scene_skip_duplicate_lock', { scene: sceneKey })
      return null
    }
    if (onProgress) {
      onProgress({
        stage: 'scene_generating',
        scene: sceneKey,
        progress: Math.round((completed / Math.max(1, total)) * 100),
        total,
        message: `Generating scene ${sceneKey}…`,
        diagnostic: { scene: sceneKey, status: 'generating', retryCount, provider: 'leonardo' }
      })
    }
    const sceneStarted = Date.now()
    let retryCount = 0
    try {
      let scriptRow = s
      const preflight = validateSceneVisualPreflight(scriptRow, inputWithRefs, sceneKey)
      if (!preflight.ok) {
        scriptRow = {
          ...scriptRow,
          visual_description: buildProfessionalSceneVisualDescription(
            scriptRow,
            inputWithRefs,
            inputWithRefs.__story || {}
          )
        }
        traceVisualScene('preflight_regen_description', {
          scene: sceneKey,
          issues: preflight.issues
        })
      }
      let charVerify = verifySceneCharacterProfilesForLeonardo({
        scriptRow,
        castMemory,
        characters: Array.isArray(characters) ? characters : []
      })
      if (!charVerify.ok) {
        scriptRow = {
          ...scriptRow,
          visual_description: buildProfessionalSceneVisualDescription(
            scriptRow,
            inputWithRefs,
            inputWithRefs.__story || {}
          )
        }
        charVerify = verifySceneCharacterProfilesForLeonardo({
          scriptRow,
          castMemory: charVerify.castMemory,
          characters: Array.isArray(characters) ? characters : []
        })
      }
      if (!charVerify.ok) {
        throw new Error(
          `Character-to-scene verification failed: ${charVerify.issues.join(', ')}`
        )
      }

      const identityBlock = leonardoIdentityBlockForScriptRow(scriptRow, castMemory)
      const bp =
        Array.isArray(sceneBlueprints) && sceneBlueprints[i]
          ? sceneBlueprints[i]
          : buildSceneVisualBlueprint(scriptRow, inputWithRefs, {
              index: i,
              castMemory,
              directives: inputWithRefs.__productionDirectives,
              continuityPack: inputWithRefs.__continuityPack
            })
      pipelineStageLog('visual_description_generated', {
        scene: sceneKey,
        chars: String(scriptRow.visual_description || '').length
      })
      const optimized = buildOptimizedLeonardoScenePrompts(
        {
          input: inputWithRefs,
          scriptRow,
          blueprint: bp,
          identityBlock,
          castMemory,
          sceneIndex: i,
          script
        },
        inputWithRefs
      )
      let prompt = optimized.prompt
      const negativePrompt = optimized.negative_prompt
      pipelineStageLog('prompt_generated', {
        scene: sceneKey,
        mainLen: optimized.meta.mainLen,
        negLen: optimized.meta.negLen
      })
      traceVisualScene('prompt_sent', {
        scene: sceneKey,
        promptLength: prompt.length,
        negativeLength: negativePrompt?.length || 0,
        promptPreview: prompt.slice(0, 240)
      })

      let imageUrl = ''
      let seed
      let leonardoImageId
      let leonardoGenerationId
      let lastValidation = null
      const namesInShot = Array.isArray(scriptRow.characters_in_shot) ? scriptRow.characters_in_shot : []
      const castChar = (Array.isArray(characters) ? characters : []).find((c) =>
        namesInShot.some((n) => String(n).toLowerCase() === String(c.name || '').toLowerCase())
      )
      const castSeed = typeof castChar?.leonardoSeed === 'number' ? castChar.leonardoSeed : undefined

      const maxSceneAttempts = sceneImageMaxAttempts()
      for (let attempt = 1; attempt <= maxSceneAttempts; attempt++) {
        retryCount = attempt - 1
        pipelineStageLog('leonardo_request_sent', { scene: sceneKey, attempt })
        const gen = await generateOneWithRetry({
          prompt,
          negative_prompt: negativePrompt,
          modelId,
          width,
          height,
          scene: sceneKey,
          ...(attempt === 1 && castSeed != null ? { seed: castSeed } : {})
        })
        imageUrl = gen.imageUrl
        seed = gen.seed
        leonardoImageId = gen.leonardoImageId
        leonardoGenerationId = gen.leonardoGenerationId
        pipelineStageLog('leonardo_response_received', {
          scene: sceneKey,
          hasUrl: Boolean(imageUrl),
          generationId: leonardoGenerationId
        })
        lastValidation = validateSceneImageMatch({
          scriptRow,
          prompt,
          imageUrl,
          castMemory,
          styleKey: styleProfile.key
        })
        if (lastValidation.scores) {
          pipelineStageLog('image_match_scored', {
            scene: sceneKey,
            composite: lastValidation.scores.composite,
            story: lastValidation.scores.storyMatch,
            character: lastValidation.scores.characterMatch
          })
        }
        if (imageUrl) {
          const remote = await validateRemoteSceneImageUrl(imageUrl)
          pipelineStageLog('image_downloaded', {
            scene: sceneKey,
            ok: remote.ok,
            bytes: remote.bytes,
            mime: remote.mime,
            issues: remote.issues
          })
          if (!remote.ok) {
            lastValidation = {
              ok: false,
              shouldRegenerate: true,
              issues: [...(lastValidation?.issues || []), ...remote.issues]
            }
          } else {
            pipelineStageLog('image_decoded', { scene: sceneKey, bytes: remote.bytes, mime: remote.mime })
          }
        }
        if (!lastValidation.ok) {
          const failReason =
            lastValidation.failureReason ||
            lastValidation.issues?.join(', ') ||
            'validation_failed'
          console.warn('[katha:leonardo]', 'scene_validation_regen', {
            scene: sceneKey,
            attempt,
            maxAttempts: maxSceneAttempts,
            reason: failReason
          })
          if (attempt >= maxSceneAttempts) {
            throw new Error(`Scene ${sceneKey} validation failed after ${maxSceneAttempts} attempts: ${failReason}`)
          }
        }
        if (lastValidation.ok) break
        if (!lastValidation.shouldRegenerate || attempt >= maxSceneAttempts) break
      }
      if (!imageUrl || (lastValidation && !lastValidation.ok && lastValidation.shouldRegenerate)) {
        throw new Error(
          lastValidation.failureReason || lastValidation.issues?.join(', ') || 'Scene image validation failed'
        )
      }
      pipelineStageLog('image_cached', { scene: sceneKey, url: imageUrl.slice(0, 80) })
      pipelineStageLog('scene_completed', { scene: sceneKey })
      const row = {
        scene: sceneKey,
        image_url: imageUrl,
        prompt,
        leonardoSeed: seed,
        leonardoImageId,
        leonardoGenerationId,
        status: 'complete'
      }
      console.info('[katha:character]', 'leonardo_scene', {
        scene: sceneKey,
        castSlots: castMemory.map((m) => `${m.label}:${m.gender}`).join(', ')
      })
      succeeded += 1
      completed += 1
      markSceneGenerationComplete(lockId, sceneKey)
      if (onProgress) {
        onProgress({
          stage: 'scene_complete',
          scene: sceneKey,
          image: row,
          blueprint: bp,
          progress: Math.round((completed / Math.max(1, total)) * 100),
          total,
          message: `Scene ${sceneKey} complete (${succeeded}/${total})`,
          diagnostic: {
            scene: sceneKey,
            promptLength: prompt.length,
            provider: 'leonardo',
            status: 'complete',
            retryCount: retryCount,
            maxRetries: maxSceneAttempts,
            durationMs: Date.now() - sceneStarted,
            imageUrl: imageUrl.slice(0, 200)
          }
        })
      }
      return row
    } catch (e) {
      releaseSceneGenerationLock(lockId, sceneKey)
      const message = e instanceof Error ? e.message : String(e)
      failures.push({ scene: sceneKey, message, retryCount })
      completed += 1
      traceVisualScene('scene_failed', {
        scene: sceneKey,
        failed: true,
        message: message.slice(0, 320),
        durationMs: Date.now() - sceneStarted,
        retryCount,
        maxRetries: sceneImageMaxAttempts()
      })
      console.warn('[katha:leonardo]', 'scene_failed', {
        scene: sceneKey,
        message,
        retryCount,
        attempts: sceneImageMaxAttempts()
      })
      const failedRow = {
        scene: sceneKey,
        image_url: buildScenePlaceholderImageUrl(sceneKey, `Scene ${sceneKey} — retry`),
        prompt: '',
        status: 'emergency_fallback',
        error: message.slice(0, 400),
        retryCount
      }
      if (onProgress) {
        onProgress({
          stage: 'scene_failed',
          scene: sceneKey,
          image: failedRow,
          progress: Math.round((completed / Math.max(1, total)) * 100),
          total,
          message: `Scene ${sceneKey} failed after ${sceneImageMaxAttempts()} attempts`,
          diagnostic: {
            scene: sceneKey,
            promptLength: 0,
            provider: 'leonardo',
            status: 'failed',
            retryCount,
            maxRetries: sceneImageMaxAttempts(),
            durationMs: Date.now() - sceneStarted,
            errorMessage: message.slice(0, 280)
          }
        })
      }
      return failedRow
    }
  }

  async function worker() {
    while (cursor < script.length) {
      const i = cursor
      cursor += 1
      if (sceneCooldownMs > 0 && i > 0) await sleep(sceneCooldownMs)
      const row = await generateSceneRow(script[i], i)
      if (row) out.push(row)
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallelLimit, total) }, () => worker()))

  const retryPasses = sceneRetryPasses()
  for (let pass = 0; pass < retryPasses && failures.length > 0; pass++) {
    const retryFailures = [...failures]
    failures.length = 0
    for (const f of retryFailures) {
      const idx = script.findIndex((row, i) => {
        const n = Number(row?.scene)
        const key = Number.isFinite(n) && n > 0 ? n : i + 1
        return key === f.scene
      })
      if (idx < 0) continue
      console.info('[katha:leonardo]', 'scene_retry_pass', { scene: f.scene, pass: pass + 1, reason: f.message })
      const row = await generateSceneRow(script[idx], idx)
      if (row && row.status === 'complete') {
        const ix = out.findIndex((o) => Number(o.scene) === Number(row.scene))
        if (ix >= 0) out[ix] = row
        else out.push(row)
      } else if (row?.status === 'failed') {
        failures.push({ scene: row.scene, message: row.error || f.message })
      }
    }
  }

  if (onProgress) {
    onProgress({
      stage: 'images',
      progress: 100,
      total,
      message: `Images complete (${out.length}/${total})${failures.length ? ` — ${failures.length} failed` : ''}`
    })
  }
  if (failures.length) {
    console.warn('[katha:leonardo]', 'batch_partial', {
      ok: out.length,
      failed: failures.length,
      scenes: failures.map((f) => f.scene).join(',')
    })
  }
  if (strict && out.length === 0) {
    const detail = failures.map((f) => `scene ${f.scene}: ${f.message}`).join('; ')
    throw new Error(
      `Scene image generation failed for all scenes${detail ? ` — ${detail}` : ''}`
    )
  }
  if (failures.length) {
    traceVisualScene('batch_partial', {
      ok: out.length,
      failed: failures.length,
      scenes: failures.map((f) => f.scene).join(',')
    })
  }
  pipelineStageLog('generation_completed', { scenes: out.length, total })
  return out
}

export async function leonardoGenerateOne({ prompt, width, height, seed, aspectMode }) {
  if (process.env.KATHA_DISABLE_LEONARDO === '1') return { imageUrl: '', seed }
  if (!process.env.LEONARDO_API_KEY) throw new Error('LEONARDO_API_KEY is missing')
  const modelId = process.env.LEONARDO_MODEL_ID || '7b592283-e8a7-4c5a-9ba6-d18c31f258b9'
  const dims =
    typeof width === 'number' && typeof height === 'number'
      ? { width, height }
      : leonardoDimensionsForAspectMode(aspectMode)
  const prepared = prepareLeonardoApiPrompts({ prompt, negativePrompt: TEXT_FREE_NEGATIVE })
  const r = await generateOne({
    prompt: prepared.prompt,
    negative_prompt: prepared.negative_prompt,
    modelId,
    width: dims.width,
    height: dims.height,
    seed
  })
  return { imageUrl: r.imageUrl, seed: r.seed ?? seed }
}

async function generateOne({ prompt, negative_prompt, modelId, width, height, seed, scene }) {
  const prepared = prepareLeonardoApiPrompts({ prompt, negativePrompt: negative_prompt, scene })
  prompt = prepared.prompt
  negative_prompt = prepared.negative_prompt

  const key = requireKey()
  const modelName = String(process.env.LEONARDO_MODEL_NAME || '').toLowerCase().trim()
  // Some Leonardo models (e.g. Kino 2.1) don't support Alchemy.
  const allowAlchemy = !(modelName.includes('kino') && modelName.includes('2.1'))
  const alchemy = process.env.LEONARDO_ALCHEMY
    ? process.env.LEONARDO_ALCHEMY === '1'
    : allowAlchemy

  const create = async (alchemyFlag) => {
    const createRes = await fetch(`${LEONARDO_API}/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative_prompt || TEXT_FREE_NEGATIVE,
        modelId,
        num_images: 1,
        width,
        height,
        alchemy: alchemyFlag,
        contrast: 3.5,
        ...(typeof seed === 'number' ? { seed } : {})
      })
    })
    const txt = await createRes.text()
    return { ok: createRes.ok, status: createRes.status, txt }
  }

  let createdTxt = null
  let createdJson = null
  {
    const r1 = await create(alchemy)
    if (!r1.ok) {
      traceVisualScene('leonardo_create_error', {
        scene,
        status: r1.status,
        bodyPreview: r1.txt.slice(0, 200),
        failed: true
      })
      // If the model rejects Alchemy (e.g. Kino 2.1), retry once with alchemy disabled.
      const isAlchemyUnsupported =
        r1.status === 400 && r1.txt.toLowerCase().includes('alchemy is not enabled')
      if (alchemy && isAlchemyUnsupported) {
        const r2 = await create(false)
        if (!r2.ok) throw new Error(parseLeonardoApiError(r2.status, r2.txt))
        createdTxt = r2.txt
      } else {
        throw new Error(parseLeonardoApiError(r1.status, r1.txt))
      }
    } else {
      createdTxt = r1.txt
    }
    createdJson = JSON.parse(createdTxt)
  }

  const created = createdJson
  const generationId = created?.sdGenerationJob?.generationId
  if (!generationId) throw new Error('Leonardo: missing generationId')

  const maxPollMs = isServerlessRuntime() ? 22_000 : 120_000
  const deadline = Date.now() + maxPollMs
  while (Date.now() < deadline) {
    await sleep(2500)
    const gRes = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (!gRes.ok) continue
    const g = await gRes.json()
    const root = g?.generations_by_pk || g?.generation || g
    const status = root?.status
    const imgs = root?.generated_images
    if (status === 'COMPLETE' && imgs?.[0]?.url) {
      const imageUrl = imgs[0].url
      traceVisualScene('leonardo_poll_complete', {
        scene,
        status: 200,
        imageUrl: imageUrl.slice(0, 200),
        generationId
      })
      return {
        imageUrl,
        generationId,
        leonardoImageId: imgs[0].id || imgs[0].generated_image_id || null,
        leonardoGenerationId: generationId,
        seed: root?.seed
      }
    }
    if (status === 'FAILED') throw new Error('Leonardo: generation failed')
  }
  throw new Error('Leonardo: timeout')
}

