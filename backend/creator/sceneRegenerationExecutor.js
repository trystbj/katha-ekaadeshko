/**
 * Executes selective scene regeneration jobs (Leonardo, TTS, cinematic patches).
 */

import { leonardoGenerateOne } from '../services/leonardoService.js'
import { ttsGenerateForScene } from '../services/ttsService.js'
import { buildLeonardoScenePrompt } from '../utils/visualStyleLock.js'
import { characterReferencePromptBlock } from '../utils/characterReferencePrompt.js'
import {
  buildCharacterIdentityMemory,
  leonardoIdentityBlockForScriptRow
} from '../../shared/characterNamingPolicy.js'

/**
 * @param {object} plan from buildRegenerationPlan
 * @param {object} episode
 * @param {object} studioInput narratorId, styleId, etc.
 */
export async function executeRegenerationPlan(plan, episode, studioInput = {}) {
  const jobs = Array.isArray(plan?.jobs) ? plan.jobs : []
  const sceneIndex = Number(plan?.sceneIndex ?? 0)
  const scene = episode?.scenes?.[sceneIndex]
  const planRow = episode?.cinematicDirectorPlan?.scenes?.[sceneIndex]
  const results = []

  for (const job of jobs) {
    const slot = String(job?.slot || '')
    try {
      if (slot === 'leonardo:scene') {
        const visual = scene?.visualDescription || planRow?.visualDescription || ''
        if (!visual) {
          results.push({ slot, status: 'skipped', reason: 'no_visual_description' })
          continue
        }
        const memory = buildCharacterIdentityMemory(studioInput.characters || [])
        const identity = leonardoIdentityBlockForScriptRow({ visual_description: visual }, memory)
        const crefPrompt = characterReferencePromptBlock(
          studioInput.characterReference,
          studioInput.characters || []
        )
        const prompt = buildLeonardoScenePrompt(
          { visual_description: visual, scene: scene?.index ?? sceneIndex + 1 },
          crefPrompt ? { ...studioInput, __characterReferencePrompt: crefPrompt } : studioInput,
          identity
        )
        const { imageUrl } = await leonardoGenerateOne({
          prompt,
          aspectMode: studioInput.aspectMode || 'vertical_9_16'
        })
        results.push({ slot, status: imageUrl ? 'ok' : 'empty', imageUrl: imageUrl || null })
      } else if (slot === 'tts:scene') {
        const scriptRow = {
          scene: scene?.index ?? sceneIndex + 1,
          narration: scene?.narrationText || scene?.text || '',
          composed_narration: scene?.text || '',
          dialogue: (scene?.dialogueLines || []).map((d) => ({
            character: d.character,
            line: d.line
          }))
        }
        const audio_url = await ttsGenerateForScene({ scriptRow, input: studioInput })
        results.push({ slot, status: audio_url ? 'ok' : 'empty', audio_url: audio_url || null })
      } else if (slot.startsWith('cinematic:')) {
        results.push({
          slot,
          status: 'patched',
          patch: { sceneIndex: sceneIndex + 1, kind: slot.replace('cinematic:', '') }
        })
      } else if (slot.startsWith('audio:') || slot.startsWith('subtitles:')) {
        results.push({ slot, status: 'planned', note: 'client_retime' })
      } else {
        results.push({ slot, status: 'unknown' })
      }
    } catch (e) {
      results.push({
        slot,
        status: 'error',
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }

  return {
    architectureVersion: 1,
    target: plan?.target,
    sceneIndex: sceneIndex + 1,
    results,
    status: results.some((r) => r.status === 'ok') ? 'executed' : 'partial'
  }
}
