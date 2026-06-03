/**
 * OutfitLock — wardrobe consistency across portraits and scenes.
 */

function extractColors(blob = '') {
  const t = String(blob)
  const colors = []
  for (const c of ['red', 'blue', 'green', 'gold', 'white', 'black', 'crimson', 'saffron', 'maroon', 'navy', 'brown']) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(t)) colors.push(c)
  }
  return colors.slice(0, 4).join(', ') || 'locked palette from scene 1'
}

/**
 * @param {Record<string, unknown>} character
 * @param {object} [dna]
 */
export function buildOutfitLock(character = {}, dna = {}) {
  const visual = String(character.visualIdentity || character.appearance || '').trim()
  const primary = String(dna.clothing || character.clothing || '').trim() || 'primary story wardrobe'
  const lock = {
    locked: true,
    primaryOutfit: primary.slice(0, 200),
    secondaryOutfit: String(character.secondaryOutfit || '').trim().slice(0, 160),
    colors: extractColors(`${visual} ${primary}`),
    accessories: String(dna.accessories || character.accessories || 'same accessories every scene').trim(),
    sceneDefault: primary
  }
  return Object.freeze(lock)
}

/**
 * @param {ReturnType<typeof buildOutfitLock>} lock
 * @param {Record<string, unknown>} [scriptRow]
 */
export function outfitLockPromptBlock(lock, scriptRow = {}) {
  if (!lock?.locked) return ''
  const change = String(scriptRow.outfit_change || scriptRow.costume_note || scriptRow.wardrobe_note || '').trim()
  if (change) {
    return `OUTFIT CHANGE (story-authorized only): ${change.slice(0, 180)}.`
  }
  return (
    `OUTFIT LOCK: primary ${lock.primaryOutfit}; colors ${lock.colors}; accessories ${lock.accessories}; ` +
    `reuse exact wardrobe — no random clothing swap, no modern unrelated fashion unless story says so.`
  ).slice(0, 420)
}

/**
 * @param {Array<Record<string, unknown>>} characters
 * @param {object[]} dnaList
 */
export function buildAllOutfitLocks(characters = [], dnaList = []) {
  return characters.map((c, i) => ({
    name: c.name,
    lock: buildOutfitLock(c, dnaList[i] || c.characterDNA)
  }))
}
