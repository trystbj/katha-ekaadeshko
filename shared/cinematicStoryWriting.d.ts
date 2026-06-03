export function cinematicWritingBlueprintSection(input?: {
  genre?: string
  storyTone?: string
  __storyLanguageDisplay?: string
  storyLanguage?: string
}): string

export function characterPersonalityWritingBlock(
  characters?: Array<{ name?: string; role?: string; traits?: string }>
): string

export function naturalDialogueRulesBlock(lang?: string): string

export function showDontTellBlock(): string

export function sceneDepthBlock(): string

export function intelligentPacingBlock(): string

export function visualDescriptionForImagesBlock(): string

export function screenplayQualityRulesBlock(lang?: string): string

export function composeScenePlaybackText(row?: {
  narration?: string
  dialogue?: Array<{ character?: string; line?: string }>
}): string

export function attachComposedNarrationToScript(
  script: Array<Record<string, unknown>>,
  story?: { characters?: Array<{ name?: string; role?: string; traits?: string }> }
): Array<Record<string, unknown>>
