/**
 * Master Story Context — single source of truth for cinematic continuity across all scenes.
 * Built after story generation, consumed by script + visual pipelines.
 */

import { regionalCultureLabel } from '../../shared/outputLanguageLock.js'
import { buildCharacterIdentityMemory, buildCharacterAppearanceProfile } from '../../shared/characterNamingPolicy.js'
import { getRegionForCountry } from '../utils/regionData.js'
import { resolveStyleProfile } from '../utils/visualStyleLock.js'

const TEXT_FREE_NEGATIVE =
  'no text, no subtitle, no captions, no words, no UI, no watermark, no narration text, no dialogue bubbles, no speech bubbles, no logos, no readable letters, no scene labels'

/**
 * Deterministic master context from story + studio locks (fast fallback).
 */
export function buildMasterStoryContextDeterministic(story, input = {}, region = '') {
  const characters = Array.isArray(story?.characters) ? story.characters : []
  const identityMemory = buildCharacterIdentityMemory(characters)
  const regionalContext = regionalCultureLabel(input.storyLanguage || 'en')
  const outputLanguage = 'English'

  const appearanceProfiles = characters.map((c) => {
    const name = String(c.name || '').trim()
    const traits = String(c.traits || c.role || '').trim()
    const visual = String(c.visualIdentity || traits).trim()
    const p = buildCharacterAppearanceProfile(name, traits, visual)
    return {
      name,
      faceStructure: p.facialFeatures || visual.slice(0, 200) || 'consistent with regional cast',
      eyeShape: p.eyeColor || 'locked — same as scene 1',
      hairstyle: p.hair || 'locked hairstyle',
      hairColor: p.hairColor || 'locked hair color',
      skinTone: 'locked — regional authenticity',
      bodyType: p.bodyType || 'locked body proportions',
      age: p.age || String(c.age || 'as established in scene 1'),
      clothingPalette: p.clothing || 'locked wardrobe palette',
      accessories: p.accessories || 'same accessories every scene unless script states change',
      ethnicityRegional: region || input.country || 'regional appearance lock',
      emotionalBehavior: p.identityTraits || traits.slice(0, 120) || 'personality-consistent reactions'
    }
  })

  const mainCharacterReference =
    appearanceProfiles[0] ||
    (identityMemory[0]
      ? {
          name: identityMemory[0].label,
          faceStructure: identityMemory[0].visualIdentity,
          emotionalBehavior: identityMemory[0].role
        }
      : null)

  return {
    outputLanguage,
    regionalContext,
    fullStorySummary: String(story?.story || story?.title || '').trim().slice(0, 1200),
    regionalCulturalContext: region || getRegionForCountry(input.country) || String(input.country || ''),
    mainCharacters: characters.map((c) => ({
      name: c.name,
      role: c.role,
      traits: c.traits
    })),
    characterAppearanceProfiles: appearanceProfiles,
    mainCharacterReference,
    clothingDetails: appearanceProfiles.map((p) => `${p.name}: ${p.clothingPalette}`).join('; '),
    personalityTraits: characters.map((c) => `${c.name}: ${c.traits || c.role}`).join('; '),
    environmentStyle: String(story?.setting || input.theme || '').slice(0, 400),
    moodPalette: String(input.storyTone || input.genre || 'cinematic emotional').trim(),
    timePeriod: 'consistent with regional setting — no era jumps',
    cinematicCameraStyle: String(input.__productionDirectives?.cameraStyle || 'motivated cinematic framing'),
    artStyle: resolveStyleProfile(input).shortLabel || String(input.styleId || 'studio_default'),
    emotionalPacing: String(input.storyTone || 'natural arc — tension and release'),
    visualConsistencyRules: [
      'Same cast faces and wardrobe unless script explicitly changes outfit',
      'Weather and time-of-day progress logically scene to scene',
      'Lighting motivated by location and mood — no random white balance shifts',
      'One clear story location per scene — no collage panels',
      TEXT_FREE_NEGATIVE
    ],
    memory: {
      character_reference_memory: identityMemory,
      scene_context_memory: [],
      visual_story_memory: String(story?.setting || '').slice(0, 500),
      identity_preservation_memory: identityMemory.map((m) => ({
        label: m.label,
        lock: m.baseImagePrompt,
        facialConsistencyWeight: 1,
        identityPreservation: 'strict — never redesign'
      }))
    },
    negativeImagePrompt: TEXT_FREE_NEGATIVE
  }
}

/**
 * Prompt block injected into script + Leonardo prompts.
 */
export function masterStoryContextPromptBlock(ctx) {
  if (!ctx || typeof ctx !== 'object') return ''
  const lines = [
    'MASTER STORY CONTEXT (mandatory — all scenes inherit):',
    `Output language (visible script): ${ctx.outputLanguage || 'English'}.`,
    `Regional atmosphere (culture, names, dress, setting): ${ctx.regionalContext || ctx.regionalCulturalContext}.`,
    `Summary: ${(ctx.fullStorySummary || '').slice(0, 600)}`,
    `Environment style: ${ctx.environmentStyle || ''}`,
    `Mood palette: ${ctx.moodPalette || ''}`,
    `Camera style: ${ctx.cinematicCameraStyle || ''}`,
    `Art style lock: ${ctx.artStyle || ''}`,
    `Emotional pacing: ${ctx.emotionalPacing || ''}`,
    'CHARACTER LOCKS (never redesign):',
    ...(ctx.characterAppearanceProfiles || []).map(
      (p) =>
        `- ${p.name}: face ${p.faceStructure}; hair ${p.hairstyle}${p.hairColor ? ` (${p.hairColor})` : ''}; eyes ${p.eyeShape}; skin ${p.skinTone}; body ${p.bodyType}; clothes ${p.clothingPalette}; accessories ${p.accessories}; age ${p.age}`
    ),
    ctx.mainCharacterReference
      ? `MAIN CHARACTER REFERENCE: ${ctx.mainCharacterReference.name} — identical in every shot.`
      : '',
    'VISUAL RULES:',
    ...(ctx.visualConsistencyRules || []).map((r) => `- ${r}`),
    `FORBIDDEN IN IMAGES: ${ctx.negativeImagePrompt || TEXT_FREE_NEGATIVE}`
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * Per-scene prompt augmentation (previous scene memory + continuity).
 */
export function buildScenePromptFromMasterContext(ctx, scriptRow, sceneIndex, priorSceneSummary = '') {
  const block = masterStoryContextPromptBlock(ctx)
  const action = String(scriptRow?.visual_description || scriptRow?.action || '').trim()
  const emotion = String(scriptRow?.emotional_tone || scriptRow?.mood || '').trim()
  const prev = priorSceneSummary ? `PREVIOUS SCENE MEMORY: ${priorSceneSummary}` : ''
  return [
    block,
    prev,
    'All image and motion prompt fields above are English-only; regional culture applies to subject matter only.',
    `SCENE ${sceneIndex} ACTION: ${action}`,
    `CURRENT EMOTION: ${emotion}`,
    'Use SAME characters from previous scenes. Maintain environment, weather, and lighting continuity.',
    'Cinematic framing: vary angle from prior scene — no duplicate pose or identical camera.',
    'Identity preservation weight: maximum. Facial consistency required.'
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Summarize prior scene for chain memory.
 */
export function priorSceneSummaryFromRow(row) {
  if (!row) return ''
  return [
    row.visual_description,
    row.environment,
    row.mood,
    row.weather,
    row.lighting
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(' · ')
    .slice(0, 280)
}

/**
 * LLM schema hint for optional enrichment pass (merged over deterministic base).
 */
export function buildMasterStoryContextAiPrompt(story, input, region, deterministic) {
  return `Expand MASTER STORY CONTEXT for cinematic production. Return JSON ONLY.

Base locks (preserve):
${JSON.stringify(deterministic, null, 0).slice(0, 4000)}

Story:
${JSON.stringify(story).slice(0, 6000)}

Region: ${region}
Regional cultural atmosphere (not output language): ${deterministic.regionalContext}
Visible script language: ${deterministic.outputLanguage}

Required keys:
{
  "fullStorySummary": string,
  "regionalCulturalContext": string,
  "characterAppearanceProfiles": [{ "name", "faceStructure", "eyeShape", "hairstyle", "skinTone", "bodyType", "age", "clothingPalette", "accessories", "ethnicityRegional", "emotionalBehavior" }],
  "mainCharacterReference": { "name", "faceStructure", "hairstyle", "clothingPalette", "emotionalBehavior" },
  "environmentStyle": string,
  "moodPalette": string,
  "timePeriod": string,
  "cinematicCameraStyle": string,
  "emotionalPacing": string,
  "visualConsistencyRules": string[]
}

Rules: English script output; regional culture from ${input.country}; never allow character redesign between scenes.`
}

export function mergeMasterStoryContext(base, aiJson) {
  if (!aiJson || typeof aiJson !== 'object') return base
  return {
    ...base,
    ...aiJson,
    outputLanguage: base.outputLanguage,
    regionalContext: base.regionalContext,
    memory: base.memory,
    negativeImagePrompt: base.negativeImagePrompt,
    characterAppearanceProfiles:
      Array.isArray(aiJson.characterAppearanceProfiles) && aiJson.characterAppearanceProfiles.length
        ? aiJson.characterAppearanceProfiles
        : base.characterAppearanceProfiles,
    mainCharacterReference: aiJson.mainCharacterReference || base.mainCharacterReference,
    visualConsistencyRules: Array.isArray(aiJson.visualConsistencyRules)
      ? [...new Set([...base.visualConsistencyRules, ...aiJson.visualConsistencyRules])]
      : base.visualConsistencyRules
  }
}

export { TEXT_FREE_NEGATIVE }
