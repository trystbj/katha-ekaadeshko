/**
 * Regional / cultural appearance locks for CharacterDNA and Leonardo prompts.
 */

/**
 * @param {{ country?: string, theme?: string, setting?: string, storyLanguage?: string }} opts
 */
export function resolveRegionalAppearanceContext(opts = {}) {
  const blob = `${opts.theme || ''} ${opts.setting || ''} ${opts.country || ''} ${opts.storyLanguage || ''}`.toLowerCase()

  if (/\b(nepal|nepali|kathmandu|himalaya|himalayan|everest|pokhara)\b/.test(blob) || opts.storyLanguage === 'ne') {
    return {
      regionalOrigin: 'Nepal / Himalayas',
      ethnicity: 'Nepali / Himalayan South Asian',
      culturalAppearanceRules:
        'South Asian Himalayan features: warm brown skin tones, dark hair, culturally authentic Nepali/Tibeto-Burman facial structure; ' +
        'traditional or regional dress (kurta, sari, shawl, dhaka topi when appropriate); Himalayan jewelry when fitting.',
      forbiddenAppearances:
        'FORBIDDEN unless story explicitly says: generic Western blonde, East Asian anime default unrelated to Nepal, European features, random ethnicity swap.'
    }
  }
  if (/\b(india|indian|delhi|mumbai|sari|kurta)\b/.test(blob) || opts.storyLanguage === 'hi') {
    return {
      regionalOrigin: 'South Asia (India)',
      ethnicity: 'South Asian',
      culturalAppearanceRules: 'Authentic South Asian features, skin tones, and dress from story setting.',
      forbiddenAppearances: 'No unrelated Western or East Asian defaults unless story requires.'
    }
  }
  if (/\b(japan|japanese|tokyo)\b/.test(blob) || opts.storyLanguage === 'ja') {
    return {
      regionalOrigin: 'Japan',
      ethnicity: 'Japanese',
      culturalAppearanceRules: 'Authentic Japanese features and culturally appropriate dress.',
      forbiddenAppearances: 'No random Western or unrelated Asian defaults.'
    }
  }

  const country = String(opts.country || '').trim()
  return {
    regionalOrigin: country || 'story setting region',
    ethnicity: 'regionally authentic to the story setting',
    culturalAppearanceRules: `Appearance must match ${country || 'locked story region'} culture and setting — no random unrelated ethnicity.`,
    forbiddenAppearances: 'No random Western/East Asian/European defaults unless explicitly in story.'
  }
}

/**
 * @param {object} regional
 */
export function regionalAppearancePromptBlock(regional = {}) {
  if (!regional.regionalOrigin) return ''
  return [
    `REGIONAL APPEARANCE LOCK: ${regional.regionalOrigin}; ${regional.ethnicity}.`,
    regional.culturalAppearanceRules,
    regional.forbiddenAppearances
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 520)
}
