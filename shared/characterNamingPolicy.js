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
  if (/\b(woman|female|girl|wife|mother|sister|daughter|queen|lady|bride|widow|goddess|she|her)\b/.test(t))
    return 'female'
  if (/\b(man|male|boy|husband|father|brother|son|king|lord|gentleman|groom|widower|he|him)\b/.test(t))
    return 'male'
  if (/\b(nonbinary|non-binary|they\/them)\b/.test(t)) return 'neutral'
  return 'unknown'
}

function inferGenderFromNameAndRole(name = '', role = '') {
  const blob = `${name} ${role}`.toLowerCase()
  const fromText = inferGenderFromText(blob)
  if (fromText !== 'unknown') return fromText
  if (/\b(mysterious caller|stranger|figure|voice)\b/.test(blob)) return 'neutral'
  const first = String(name).trim().split(/\s+/)[0] || ''
  if (/^(maya|sita|priya|anita|devi|lakshmi|kavya|meera|nisha|radha|geeta|aisha|sara|emma|mia)/i.test(first))
    return 'female'
  if (/^(anil|arjun|ravi|raj|amit|vikram|mohan|rahul|dev|omar|liam|noah|james|john)/i.test(first))
    return 'male'
  return 'neutral'
}

function inferAgeFromText(text = '') {
  const t = String(text).toLowerCase()
  if (/\b(child|kid|boy|girl|teen|teenager|youth)\b/.test(t)) return 'teen'
  if (/\b(elder|elderly|old man|old woman|grandfather|grandmother)\b/.test(t)) return 'elder'
  if (/\b(young man|young woman|young adult)\b/.test(t)) return 'young adult'
  if (/\b(\d{1,2})\s*years?\s*old\b/.test(t)) {
    const m = t.match(/\b(\d{1,2})\s*years?\s*old\b/)
    return m ? `${m[1]} years` : 'adult'
  }
  return 'adult'
}

function inferEthnicityFromContext(blob = '', country = '') {
  const t = `${blob} ${country}`.toLowerCase()
  if (/\b(nepal|nepali|kathmandu|himalaya|himalayan)\b/.test(t)) return 'Nepali / Himalayan South Asian'
  if (/\b(india|indian|delhi|mumbai|kolkata|sari|kurta)\b/.test(t)) return 'South Asian'
  if (/\b(japan|japanese|tokyo)\b/.test(t)) return 'East Asian'
  if (/\b(korea|korean|seoul)\b/.test(t)) return 'East Asian'
  if (/\b(china|chinese|beijing)\b/.test(t)) return 'East Asian'
  if (/\b(africa|african|nigeria|kenya)\b/.test(t)) return 'African'
  if (/\b(middle east|arab|persian|turkish)\b/.test(t)) return 'Middle Eastern'
  if (/\b(europe|european|british|french|german)\b/.test(t)) return 'European'
  if (/\b(latin|hispanic|mexico|brazil)\b/.test(t)) return 'Latin American'
  return 'regionally authentic to the story setting'
}

function defaultVisualIdentityForCharacter(name, gender, role, traits, ethnicity = '') {
  const figure =
    gender === 'female' ? 'woman' : gender === 'male' ? 'man' : 'person'
  const roleBit = role ? `${role}, ` : ''
  const traitBit = traits ? `${traits}, ` : ''
  const regionalDress =
    ethnicity.includes('Nepali') || ethnicity.includes('Himalayan')
      ? 'culturally appropriate Nepali/Himalayan clothing and accessories, '
      : ethnicity.includes('South Asian')
        ? 'region-appropriate South Asian dress, '
        : ''
  return (
    `${name}, ${figure}, ${ethnicity ? `${ethnicity}, ` : ''}${roleBit}${traitBit}${regionalDress}` +
    `distinct face matching regional origin, locked hairstyle and hair color, consistent eye color, ` +
    `fixed primary outfit and accessories, same proportions in every scene`
  ).slice(0, 480)
}

/**
 * Fill missing gender, age, and visual identity before image generation (no "unknown" cast).
 * @param {Array<Record<string, unknown>>} characters
 * @param {{ country?: string, theme?: string }} [opts]
 */
export function enrichStoryCharacterProfiles(characters = [], opts = {}) {
  if (!Array.isArray(characters)) return []
  const regionHint = String(opts.country || opts.theme || '').trim()
  return characters.map((c, i) => {
    const name = String(c?.name || `Character ${i + 1}`).trim()
    const role = String(c?.role || c?.storyRole || '').trim()
    const traits = String(c?.traits || c?.personality || role || 'expressive, story-driven').trim()
    let visual = String(c?.visualIdentity || c?.appearance || '').trim()
    const blob = `${name} ${role} ${traits} ${visual}`

    let gender = String(c?.gender || '').toLowerCase()
    if (!gender || gender === 'unknown') {
      gender = inferGenderFromNameAndRole(name, role)
    }

    const ethnicity =
      String(c?.ethnicity || '').trim() || inferEthnicityFromContext(blob, regionHint)

    if (!visual || visual.length < 24) {
      visual = defaultVisualIdentityForCharacter(name, gender, role, traits, ethnicity)
    }

    const profile = buildCharacterAppearanceProfile(name, traits, visual)
    const age = c?.age ? String(c.age) : inferAgeFromText(blob) || profile.age

    return {
      ...c,
      name,
      gender,
      ethnicity,
      storyRole: role || 'lead character',
      role: role || name,
      occupation: String(c?.occupation || role || 'story character').trim(),
      traits,
      personality: String(c?.personality || traits).trim(),
      emotionalTraits: String(c?.emotionalTraits || traits).trim(),
      speakingStyle: String(c?.speakingStyle || 'natural, character-specific').trim(),
      visualDistinguishingFeatures: String(c?.visualDistinguishingFeatures || visual).trim().slice(0, 280),
      visualIdentity: visual,
      appearance: visual,
      age,
      hairStyle: profile.hair,
      hairColor: profile.hairColor || profile.hair,
      eyeColor: profile.eyeColor,
      clothing: profile.clothing,
      accessories: profile.accessories,
      facialFeatures: profile.facialFeatures,
      bodyType: profile.bodyType,
      personalityTraits: profile.identityTraits
    }
  })
}

/**
 * Block Leonardo until every cast member has a complete visual profile.
 * @param {Array<Record<string, unknown>>} characters
 * @param {{ country?: string, theme?: string }} [opts]
 */
export function assertCharactersReadyForImageGeneration(characters = [], opts = {}) {
  const enriched = enrichStoryCharacterProfiles(characters, opts)
  const issues = []
  for (const c of enriched) {
    if (!String(c.name || '').trim()) issues.push('missing_name')
    if (!c.gender || c.gender === 'unknown') issues.push(`gender:${c.name}`)
    if (!String(c.visualIdentity || '').trim()) issues.push(`visual:${c.name}`)
    if (!String(c.clothing || c.hairStyle || '').trim()) issues.push(`appearance:${c.name}`)
  }
  if (issues.length) {
    throw new Error(`Character profiles incomplete — fix before image generation: ${issues.join(', ')}`)
  }
  return enriched
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

function extractVisualTrait(visual, patterns) {
  const blob = String(visual || '')
  for (const re of patterns) {
    const m = blob.match(re)
    if (m && m[0]) return m[0].trim().slice(0, 100)
  }
  return ''
}

/**
 * Permanent visual profile fields for cross-scene Leonardo locks.
 * @param {string} label
 * @param {string} traits
 * @param {string} visual
 */
export function buildCharacterAppearanceProfile(label, traits, visual) {
  const blob = `${traits} ${visual} ${label}`
  const gender = inferGenderFromText(blob)
  const hair =
    extractVisualTrait(visual, [/\b(hair|hairstyle|braid|bun|locks|curly|straight hair|ponytail)[^.]{0,90}/i]) ||
    'locked hairstyle from scene 1'
  const hairColor =
    extractVisualTrait(visual, [/\b(black|brown|blonde|red|auburn|silver|gray|dark|fair)\s+hair\b/i]) || ''
  const eyeColor = extractVisualTrait(visual, [/\b(brown|blue|green|hazel|dark|amber)\s+eyes?\b/i]) || 'locked eye color'
  const clothing =
    extractVisualTrait(visual, [
      /\b(dress|sari|kurta|coat|shirt|robe|jacket|shawl|outfit|wardrobe)[^.]{0,90}/i
    ]) || 'locked wardrobe from scene 1'
  const age =
    extractVisualTrait(visual, [/\b(child|teen|young|elder|old|middle-aged|\d{1,2}\s+years?\s+old)\b/i]) ||
    extractVisualTrait(traits, [/\b(child|teen|young|elder|old)\b/i]) ||
    'age locked from scene 1'
  const bodyType =
    extractVisualTrait(visual, [/\b(slender|tall|petite|stocky|athletic|frail)\b/i]) || 'consistent body proportions'
  const accessories =
    extractVisualTrait(visual, [/\b(necklace|earring|hat|scarf|bindi|glasses|bracelet|ring)[^.]{0,60}/i]) ||
    'same accessories unless script changes outfit'
  const facial =
    extractVisualTrait(visual, [/\b(round face|sharp jaw|freckles|beard|mustache|dimples)[^.]{0,60}/i]) ||
    'consistent facial structure'
  return {
    label,
    gender,
    hair,
    hairColor,
    eyeColor,
    age,
    bodyType,
    clothing,
    accessories,
    facialFeatures: facial,
    identityTraits: traits.slice(0, 160) || 'personality-consistent behavior'
  }
}

/**
 * @param {Array<{ name?: string, role?: string, traits?: string, visualIdentity?: string, baseImagePrompt?: string }>} characters
 */
export function buildCharacterIdentityMemory(characters = []) {
  const enriched = enrichStoryCharacterProfiles(characters)
  return enriched.map((c, i) => {
    const label = String(c.name || `Character ${i + 1}`).trim()
    const traits = String(c.traits || c.role || '').trim()
    const visual = String(c.visualIdentity || traits).trim()
    const profile = buildCharacterAppearanceProfile(label, traits, visual)
    const gender =
      String(c.gender || profile.gender || '').toLowerCase() === 'unknown'
        ? 'neutral'
        : String(c.gender || profile.gender || 'neutral').toLowerCase()
    return {
      slot: i + 1,
      label,
      gender,
      role: String(c.role || '').trim(),
      visualIdentity: visual,
      baseImagePrompt: String(c.baseImagePrompt || `${label}, ${traits}, ${visual}`).trim().slice(0, 520),
      appearanceProfile: profile,
      hair: profile.hair,
      hairColor: profile.hairColor,
      eyeColor: profile.eyeColor,
      age: profile.age,
      bodyType: profile.bodyType,
      clothing: profile.clothing,
      accessories: profile.accessories,
      facialFeatures: profile.facialFeatures,
      identityTraits: profile.identityTraits
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
function characterProfileLine(m) {
  const p = m.appearanceProfile || buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity)
  const gender =
    m.gender && String(m.gender).toLowerCase() !== 'unknown'
      ? m.gender
      : p.gender && p.gender !== 'unknown'
        ? p.gender
        : 'neutral'
  return [
    `${m.label} (${gender}): PERMANENT VISUAL PROFILE —`,
    `hair ${p.hair}${p.hairColor ? `, ${p.hairColor}` : ''};`,
    `eyes ${p.eyeColor}; age ${p.age}; body ${p.bodyType};`,
    `clothing ${p.clothing}; accessories ${p.accessories}; face ${p.facialFeatures};`,
    `traits ${p.identityTraits}.`,
    `Expression/body language must match scene emotion. SAME face and wardrobe every scene unless script explicitly changes outfit.`,
    `Base lock: ${m.baseImagePrompt}`
  ].join(' ')
}

export function leonardoIdentityBlockForScriptRow(scriptRow, memory) {
  const slots = pickCastSlotsForScriptRow(scriptRow, memory)
  const emotion = String(scriptRow?.emotional_tone || scriptRow?.mood || '').trim()
  const lines = slots
    .map((s) => memory.find((m) => m.slot === s))
    .filter(Boolean)
    .map((m) => characterProfileLine(m))
  if (!lines.length && memory[0]) {
    lines.push(characterProfileLine(memory[0]))
  }
  return [
    'CHARACTER IDENTITY LOCK (non-negotiable — same cast in every frame):',
    ...lines,
    emotion ? `Scene emotional state for cast: ${emotion}.` : '',
    'Prevent: changing hairstyles, random clothing swaps, age shifts, face redesign, new unnamed faces.',
    'Do NOT swap genders. Do NOT introduce new faces. Male stays male; female stays female.'
  ].join(' ')
}
