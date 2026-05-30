/**

 * Scene image quality control — heuristic validation before accepting Leonardo output.

 */



import { TEXT_FREE_NEGATIVE } from './masterStoryContext.js'



const TEXT_ARTIFACT_RE = /\b(subtitle|caption|watermark|logo|©|™|readable text|speech bubble)\b/i

const PROMPT_TEXT_LEAK_RE = /\b(narration beat|dialogue:|subtitle|caption text)\b/i



function characterAlignmentScore(cast, scriptRow) {

  if (!cast?.length) return 1

  const visual = String(scriptRow?.visual_description || scriptRow?.action || '').toLowerCase()

  if (!visual.trim()) return 0.5

  let hits = 0

  for (const m of cast) {

    const label = String(m.label || '').toLowerCase().trim()

    if (label.length > 3 && visual.includes(label)) hits += 1

  }

  return hits / Math.max(1, cast.length)

}



/**

 * @param {object} opts

 * @param {Record<string, unknown>} opts.scriptRow

 * @param {string} opts.prompt

 * @param {string} opts.imageUrl

 * @param {object} [opts.masterContext]

 * @param {object[]} [opts.castMemory]

 */

export function validateSceneImage(opts = {}) {

  const issues = []

  const row = opts.scriptRow || {}

  const prompt = String(opts.prompt || '')

  const promptLower = prompt.toLowerCase()

  const url = String(opts.imageUrl || '').trim()

  const cast = opts.castMemory || []



  if (!url) issues.push('missing_image_url')

  if (PROMPT_TEXT_LEAK_RE.test(promptLower)) issues.push('prompt_text_leak')



  const alignScore = characterAlignmentScore(cast, row)

  if (cast.length && alignScore < 0.2) issues.push('character_alignment_low')



  const emotion = String(row.emotional_tone || row.mood || '').trim()

  if (!emotion && !String(row.visual_description || row.narration || '').trim()) {

    issues.push('weak_scene_emotion')

  }



  if (TEXT_ARTIFACT_RE.test(promptLower)) {

    issues.push('prompt_requests_text')

  }



  const hardFail = issues.some((i) =>

    ['missing_image_url', 'prompt_text_leak', 'character_alignment_low'].includes(i)

  )



  return {

    ok: issues.length === 0,

    issues,

    alignmentScore: alignScore,

    shouldRegenerate: hardFail,

    negativePromptAugment: TEXT_FREE_NEGATIVE

  }

}



export function validationFailureReason(validation) {

  if (!validation?.issues?.length) return 'Scene validation failed'

  return `Scene validation: ${validation.issues.join(', ')}`

}


