import {
  VISUAL_THEME_PACKS,
  type VisualThemePackId
} from '../constants/visualThemePacks'

export function getVisualPackExtraPrompt(packId: VisualThemePackId): string {
  return VISUAL_THEME_PACKS[packId].extraPrompt
}
