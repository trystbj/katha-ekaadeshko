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

const SCENE_IMAGE_MAX_ATTEMPTS = 3

async function generateOneWithRetry(args) {
  let lastErr = null
  for (let attempt = 1; attempt <= SCENE_IMAGE_MAX_ATTEMPTS; attempt++) {
    try {
      return await generateOne(args)
    } catch (e) {
      lastErr = e
      console.warn('[katha:leonardo]', 'scene_retry', {
        attempt,
        message: e instanceof Error ? e.message : String(e)
      })
      if (attempt < SCENE_IMAGE_MAX_ATTEMPTS) await sleep(1200)
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
    return []
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
        message: `Generating scene ${sceneKey}…`
      })
    }
    try {
      let scriptRow = s
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
          sceneIndex: i
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

      for (let attempt = 1; attempt <= SCENE_IMAGE_MAX_ATTEMPTS; attempt++) {
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
        if (lastValidation.ok) break
        if (!lastValidation.shouldRegenerate || attempt >= SCENE_IMAGE_MAX_ATTEMPTS) break
        console.warn('[katha:leonardo]', 'scene_validation_regen', {
          scene: sceneKey,
          attempt,
          issues: lastValidation.issues
        })
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
          message: `Scene ${sceneKey} complete (${completed}/${total})`
        })
      }
      return row
    } catch (e) {
      releaseSceneGenerationLock(lockId, sceneKey)
      const message = e instanceof Error ? e.message : String(e)
      failures.push({ scene: sceneKey, message })
      console.warn('[katha:leonardo]', 'scene_failed', { scene: sceneKey, message })
      completed += 1
      if (onProgress) {
        onProgress({
          stage: 'scene_failed',
          scene: sceneKey,
          progress: Math.round((completed / Math.max(1, total)) * 100),
          total,
          message: `Scene ${sceneKey} failed`
        })
      }
      return null
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
  if (strict && out.length < total) {
    const detail = failures.map((f) => `scene ${f.scene}: ${f.message}`).join('; ')
    throw new Error(
      `Scene image generation incomplete (${out.length}/${total})${detail ? ` — ${detail}` : ''}`
    )
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
      // If the model rejects Alchemy (e.g. Kino 2.1), retry once with alchemy disabled.
      const isAlchemyUnsupported =
        r1.status === 400 && r1.txt.toLowerCase().includes('alchemy is not enabled')
      if (alchemy && isAlchemyUnsupported) {
        const r2 = await create(false)
        if (!r2.ok) throw new Error(`Leonardo create ${r2.status}: ${r2.txt}`)
        createdTxt = r2.txt
      } else {
        throw new Error(`Leonardo create ${r1.status}: ${r1.txt}`)
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
      return {
        imageUrl: imgs[0].url,
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

