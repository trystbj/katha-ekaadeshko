import type { VisualStyleId } from '../types/story'

/** Short mood tag under each visual style card (i18n keys). */
export const STYLE_VISUAL_MOOD_KEYS: Record<VisualStyleId, string> = {
  soft_anime_fantasy: 'styleMoodSoftFantasy',
  cinematic_anime: 'styleMoodCinematic',
  comic_panel: 'styleMoodDynamic',
  cinematic_realistic: 'styleMoodRealistic',
  cozy_storybook: 'styleMoodStorybook',
  custom: 'styleMoodCustom'
}
