/**
 * Smart Continuity Engine — character, environment, and visual consistency across stages.
 */

import { buildContinuityState } from '../../cinematic/continuityTracker.js'
import { buildCharacterIdentityMemory } from '../../character/characterIdentityMemory.js'

/**
 * @param {object} params
 */
export function buildSmartContinuityPack(params = {}) {
  const {
    story = null,
    script = [],
    images = [],
    priorWorld = null,
    characterReference = null,
    bibleCharacters = []
  } = params

  const world = buildContinuityState(script, priorWorld)
  const castMemory = buildCharacterIdentityMemory(
    Array.isArray(story?.characters) ? story.characters : bibleCharacters
  )

  const sceneContinuity = (Array.isArray(script) ? script : []).map((row, i) => {
    const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
    const img = images.find((im) => Number(im?.scene) === sceneNum)
    return {
      sceneIndex: sceneNum,
      continuityId: `scene:${sceneNum}`,
      characterIds: castMemory.map((c) => c.label).filter(Boolean),
      environment: world.scenes[i]?.location || '',
      weather: world.scenes[i]?.weather || world.weather,
      timeOfDay: world.scenes[i]?.timeOfDay || world.timeOfDay,
      leonardoSeed: img?.leonardoSeed ?? null,
      leonardoImageId: img?.leonardoImageId ?? null,
      imageUrl: img?.image_url || img?.imageUrl || null,
      reviewed: false
    }
  })

  return {
    version: 1,
    world,
    castMemory,
    sceneContinuity,
    characterReference: characterReference || null,
    warnings: world.warnings || []
  }
}

/**
 * @param {object} pack
 * @param {number} sceneIndex 1-based
 */
export function continuityBlockForScene(pack, sceneIndex) {
  const row = pack?.sceneContinuity?.find((s) => s.sceneIndex === sceneIndex)
  if (!row) return ''
  const cast = (row.characterIds || []).slice(0, 4).join(', ')
  return [
    `Continuity ID: ${row.continuityId}`,
    cast ? `Cast locks: ${cast}` : '',
    row.environment ? `Environment: ${row.environment}` : '',
    row.weather ? `Weather: ${row.weather}` : '',
    row.timeOfDay ? `Time: ${row.timeOfDay}` : '',
    row.leonardoSeed != null ? `Visual seed lock: ${row.leonardoSeed}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}
