/** Custom style preset dimensions — appended as chips to the custom visual prompt. */

export type CustomStyleDimensionId =
  | 'lighting'
  | 'atmosphere'
  | 'color_mood'
  | 'pacing'
  | 'cinematic_intensity'
  | 'narration_mood'
  | 'environment'

export const CUSTOM_STYLE_DIMENSION_ORDER: CustomStyleDimensionId[] = [
  'lighting',
  'atmosphere',
  'color_mood',
  'pacing',
  'cinematic_intensity',
  'narration_mood',
  'environment'
]

export const CUSTOM_STYLE_DIMENSION_LABEL_KEY: Record<CustomStyleDimensionId, string> = {
  lighting: 'customDimLighting',
  atmosphere: 'customDimAtmosphere',
  color_mood: 'customDimColorMood',
  pacing: 'customDimPacing',
  cinematic_intensity: 'customDimCinematicIntensity',
  narration_mood: 'customDimNarrationMood',
  environment: 'customDimEnvironment'
}

export const CUSTOM_STYLE_DIMENSION_CHIPS: Record<CustomStyleDimensionId, string[]> = {
  lighting: ['soft golden hour', 'moonlit rim light', 'warm lantern glow', 'overcast diffuse'],
  atmosphere: ['misty valley', 'cozy hearth smoke', 'monsoon haze', 'crisp mountain air'],
  color_mood: ['warm amber', 'cool teal shadows', 'pastel dawn', 'deep indigo night'],
  pacing: ['slow emotional', 'gentle storybook', 'building tension', 'dramatic climax'],
  cinematic_intensity: ['subtle', 'balanced', 'high drama', 'epic wide shots'],
  narration_mood: ['tender whisper', 'hopeful warmth', 'mysterious calm', 'joyful lift'],
  environment: ['Himalayan village', 'rhododendron forest', 'terraced fields', 'temple courtyard']
}
