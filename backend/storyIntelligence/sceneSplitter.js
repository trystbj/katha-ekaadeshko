/**
 * Split long seeds into planned cinematic scene units (pre-script outline).
 */

import { classifySceneBeat } from '../cinematic/pipeline/sceneBreakdownEngine.js'

/**
 * @param {string} rawSeed
 * @param {object} structure
 * @param {object} analysis
 */
export function splitSeedIntoScenes(rawSeed, structure, analysis) {
  const text = String(rawSeed || '').trim()
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim().length > 8)
  const target = structure?.targetSceneCount || 8

  let chunks = paragraphs
  if (chunks.length < target && text.length > 1_500) {
    chunks = splitBySentences(text, target)
  }
  if (chunks.length > target * 1.5) {
    chunks = mergeChunks(chunks, target)
  }

  const scenes = []
  for (let i = 0; i < chunks.length && scenes.length < target; i++) {
    const excerpt = chunks[i].trim().slice(0, 900)
    const beatType = classifySceneBeat(excerpt, excerpt, i, Math.max(chunks.length, target))
    const prev = scenes[scenes.length - 1]
    scenes.push({
      sceneNumber: scenes.length + 1,
      beatType,
      excerpt,
      locationShift: detectLocationShift(excerpt, prev?.excerpt),
      timeShift: /\b(later|next|years|morning|night|suddenly)\b/i.test(excerpt),
      emotionalTone: toneForBeat(beatType, analysis),
      continuityNote: buildContinuityNote(scenes.length, beatType, analysis),
      dialogueHeavy: beatType === 'dialogue' || /[""「」]/.test(excerpt)
    })
  }

  while (scenes.length < Math.min(target, 6) && text.length > 400) {
    scenes.push({
      sceneNumber: scenes.length + 1,
      beatType: 'general',
      excerpt: text.slice(0, 400),
      locationShift: false,
      timeShift: false,
      emotionalTone: analysis.dominantEmotion || 'neutral',
      continuityNote: 'Opening establishment',
      dialogueHeavy: false
    })
    break
  }

  return scenes
}

function splitBySentences(text, target) {
  const sentences = text.split(/(?<=[.!?।])\s+/).filter((s) => s.trim().length > 12)
  const per = Math.max(2, Math.ceil(sentences.length / target))
  const out = []
  for (let i = 0; i < sentences.length; i += per) {
    out.push(sentences.slice(i, i + per).join(' '))
  }
  return out
}

function mergeChunks(paragraphs, target) {
  const out = []
  const size = Math.ceil(paragraphs.length / target)
  for (let i = 0; i < paragraphs.length; i += size) {
    out.push(paragraphs.slice(i, i + size).join('\n\n'))
  }
  return out
}

function detectLocationShift(excerpt, prevExcerpt) {
  if (!prevExcerpt) return false
  const loc = excerpt.match(/\b(in|at|inside)\s+([a-z]+)/i)
  const prevLoc = prevExcerpt.match(/\b(in|at|inside)\s+([a-z]+)/i)
  return Boolean(loc && prevLoc && loc[2] !== prevLoc[2])
}

function toneForBeat(beat, analysis) {
  if (beat === 'emotional') return 'grief'
  if (beat === 'suspense') return 'fear'
  if (beat === 'action') return 'tension'
  return analysis.dominantEmotion || 'neutral'
}

function buildContinuityNote(index, beat, analysis) {
  if (index === 0) return 'Establish characters and world tone'
  const chars = analysis.characters?.slice(0, 3).join(', ')
  if (beat === 'dialogue' && chars) return `Preserve voices for ${chars}`
  if (beat === 'climax') return 'Pay off prior emotional setup; no tonal reset'
  return 'Carry forward prior scene consequences'
}
