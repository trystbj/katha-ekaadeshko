/**
 * Lip sync & speech performance foundation — provider slot architecture.
 */

/**
 * @param {object} [story]
 * @param {Array<object>} [multiCharacterVoices]
 */
export function buildLipSyncFoundation(story, multiCharacterVoices = []) {
  const perCharacterSlots = []
  const chars = Array.isArray(story?.characters) ? story.characters : []
  for (const c of chars) {
    if (!c?.name) continue
    const cast = multiCharacterVoices.find(
      (v) => String(v.characterName || '').toLowerCase() === String(c.name).toLowerCase()
    )
    perCharacterSlots.push({
      characterName: String(c.name).trim(),
      slot: cast?.providerSlot || `lipsync:${String(c.name).toLowerCase().replace(/\s+/g, '_')}`
    })
  }

  return {
    architectureVersion: 1,
    providerSlot: 'lipsync:default',
    emotionalLipSync: true,
    perCharacterSlots: perCharacterSlots.slice(0, 12)
  }
}
