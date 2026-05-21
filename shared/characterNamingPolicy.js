/**
 * Detect and enforce user naming preferences from story seed text.
 * Shared by API pipeline and studio UI.
 */

const PRONOUN_ONLY_PATTERNS = [
  /\bno\s+(character\s+)?names?\b/i,
  /\bwithout\s+(character\s+)?names?\b/i,
  /\bdo\s+not\s+(use|give|assign|create)\s+(any\s+)?(character\s+)?names?\b/i,
  /\bnever\s+(use|give|name)\s+(character\s+)?names?\b/i,
  /\bunnamed\s+characters?\b/i,
  /\bnameless\s+(characters?|cast)\b/i,
  /\bpronoun[\s-]?only\b/i,
  /\bonly\s+(use\s+)?(he|she|they|him|her|them)\b/i,
  /\b(he\/she|husband\s+and\s+wife|wife\s+and\s+husband|boy\s+and\s+girl|man\s+and\s+woman)\b/i,
  /\bno\s+proper\s+names?\b/i,
  /\bavoid\s+(character\s+)?names?\b/i,
  /\brefer\s+to\s+(them|characters)\s+only\s+as\b/i
]

const ANONYMOUS_PATTERNS = [/\banonymous\s+characters?\b/i, /\bgeneric\s+labels?\s+only\b/i]

/**
 * @param {string} seedLine
 * @param {string} [theme]
 * @returns {{ mode: 'names' | 'pronoun_only' | 'anonymous', label: string, blueprintLines: string[] }}
 */
export function analyzeNamingPolicy(seedLine = '', theme = '') {
  const blob = `${seedLine}\n${theme}`.trim()
  if (!blob) {
    return { mode: 'names', label: 'names allowed', blueprintLines: [] }
  }
  if (PRONOUN_ONLY_PATTERNS.some((re) => re.test(blob))) {
    return {
      mode: 'pronoun_only',
      label: 'pronoun-only (no invented names)',
      blueprintLines: [
        'NAMING LOCK — PRONOUN / RELATIONSHIP ONLY (USER SEED):',
        '- Do NOT invent, translate, or assign proper personal names (no "Ravi", "Sita", "John", etc.).',
        '- Refer to people ONLY with pronouns and relationship words: he, she, they, him, her, the husband, the wife, the boy, the girl, the man, the woman, the stranger, the elder, etc.',
        '- In JSON `characters[].name` use role labels only (e.g. "the husband", "the wife") — never given names.',
        '- Script narration and dialogue must follow the same rule unless the USER SEED explicitly lists a name to keep.',
        '- Character field in script dialogue lines: use "Narration" or relationship labels, not personal names.'
      ]
    }
  }
  if (ANONYMOUS_PATTERNS.some((re) => re.test(blob))) {
    return {
      mode: 'anonymous',
      label: 'anonymous labels',
      blueprintLines: [
        'NAMING LOCK — ANONYMOUS CAST:',
        '- Use generic role labels only (the traveler, the shopkeeper) — no proper names unless USER SEED lists them.'
      ]
    }
  }
  return { mode: 'names', label: 'names allowed', blueprintLines: [] }
}

function inferGenderFromText(text = '') {
  const t = String(text).toLowerCase()
  if (/\b(woman|female|girl|wife|mother|sister|daughter|queen|lady|bride|widow|goddess)\b/.test(t)) return 'female'
  if (/\b(man|male|boy|husband|father|brother|son|king|lord|gentleman|groom|widower)\b/.test(t)) return 'male'
  if (/\b(nonbinary|non-binary|they\/them)\b/.test(t)) return 'neutral'
  return 'unknown'
}

/**
 * @param {Array<{ name?: string, role?: string, traits?: string }>} characters
 * @param {{ mode: string }} policy
 */
export function sanitizeStoryCharacters(characters, policy) {
  if (!Array.isArray(characters) || policy.mode === 'names') return characters
  const slots = ['the husband', 'the wife', 'the man', 'the woman', 'the boy', 'the girl', 'the elder', 'the stranger']
  return characters.map((c, i) => {
    const traits = String(c.traits || c.role || '').trim()
    const g = inferGenderFromText(`${c.role} ${traits} ${c.name}`)
    let label = slots[i] || 'the figure'
    if (g === 'female' && (label.includes('husband') || label.includes('man') || label.includes('boy'))) {
      label = i === 1 ? 'the wife' : 'the woman'
    }
    if (g === 'male' && (label.includes('wife') || label.includes('woman') || label.includes('girl'))) {
      label = i === 0 ? 'the husband' : 'the man'
    }
    if (g === 'female') label = label.includes('wife') ? label : 'the woman'
    if (g === 'male') label = label.includes('husband') ? label : 'the man'
    return {
      ...c,
      name: label,
      role: String(c.role || label).replace(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/g, label).trim() || label
    }
  })
}

/**
 * @param {Array<{ name?: string, role?: string, traits?: string, visualIdentity?: string, baseImagePrompt?: string }>} characters
 */
export function buildCharacterIdentityMemory(characters = []) {
  return characters.map((c, i) => {
    const label = String(c.name || `Character ${i + 1}`).trim()
    const traits = String(c.traits || c.role || '').trim()
    const visual = String(c.visualIdentity || traits).trim()
    const gender = inferGenderFromText(`${label} ${traits} ${visual}`)
    return {
      slot: i + 1,
      label,
      gender,
      role: String(c.role || '').trim(),
      visualIdentity: visual,
      baseImagePrompt: String(c.baseImagePrompt || `${label}, ${traits}`).trim().slice(0, 520),
      hair: (visual.match(/\b(hair|braid|bun|locks|curly|straight hair)[^.]{0,80}/i) || [''])[0],
      clothing: (visual.match(/\b(dress|sari|kurta|coat|shirt|robe|jacket|shawl)[^.]{0,80}/i) || [''])[0]
    }
  })
}

/**
 * Pick cast slot for a script scene from visual description + narration.
 * @param {Record<string, unknown>} scriptRow
 * @param {ReturnType<typeof buildCharacterIdentityMemory>} memory
 */
export function pickCastSlotsForScriptRow(scriptRow, memory) {
  const blob = `${scriptRow?.visual_description || ''} ${scriptRow?.narration || ''}`.toLowerCase()
  const hits = []
  for (const m of memory) {
    const labelLow = m.label.toLowerCase()
    if (labelLow.length > 3 && blob.includes(labelLow)) hits.push(m.slot)
    if (m.gender === 'female' && /\b(she|her|woman|wife|girl|mother)\b/.test(blob)) hits.push(m.slot)
    if (m.gender === 'male' && /\b(he|him|man|husband|boy|father)\b/.test(blob)) hits.push(m.slot)
  }
  const sceneNum = Number(scriptRow?.scene)
  if (Number.isFinite(sceneNum) && sceneNum > 0 && memory[sceneNum - 1]) hits.push(memory[sceneNum - 1].slot)
  const uniq = [...new Set(hits)]
  if (uniq.length) return uniq
  const idx = Number(scriptRow?.scene)
  if (Number.isFinite(idx) && idx > 0 && memory[idx - 1]) return [memory[idx - 1].slot]
  return memory.length ? [(((Number(scriptRow?.scene) || 1) - 1) % memory.length) + 1] : [1]
}

/**
 * Leonardo identity paragraph for one scene.
 */
export function leonardoIdentityBlockForScriptRow(scriptRow, memory) {
  const slots = pickCastSlotsForScriptRow(scriptRow, memory)
  const lines = slots
    .map((s) => memory.find((m) => m.slot === s))
    .filter(Boolean)
    .map(
      (m) =>
        `${m.label} (${m.gender}): SAME person every shot — ${m.visualIdentity}. Wardrobe/hair/age/ethnicity LOCKED: ${m.baseImagePrompt}`
    )
  if (!lines.length && memory[0]) {
    const m = memory[0]
    lines.push(`${m.label} (${m.gender}): ${m.baseImagePrompt}`)
  }
  return [
    'CHARACTER IDENTITY LOCK (non-negotiable — same cast in every frame):',
    ...lines,
    'Do NOT swap genders. Do NOT introduce new faces. Male stays male; female stays female.'
  ].join(' ')
}
