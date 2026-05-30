import type { VisualStyleId } from '../types/story'

/** Wireframe: Soft, Cozy Storybook, Cinematic, Realistic, Comic, Custom */
export const STYLE_WIREFRAME_ORDER: VisualStyleId[] = [
  'soft_anime_fantasy',
  'cozy_storybook',
  'cinematic_anime',
  'cinematic_realistic',
  'comic_panel',
  'custom'
]

/** Bottom-only scrim on wireframe tiles — keeps poster art bright; label stays readable. */
export const STYLE_WIREFRAME_TILE_SCRIM =
  'linear-gradient(180deg, transparent 72%, rgba(0, 0, 0, 0.38) 100%)'

export const STYLE_WIREFRAME_LABEL_KEY: Record<VisualStyleId, string> = {
  soft_anime_fantasy: 'wireframeStyleSoft',
  cozy_storybook: 'wireframeStyleCartoon',
  cinematic_anime: 'wireframeStyleCinematic',
  cinematic_realistic: 'wireframeStyleRealistic',
  comic_panel: 'wireframeStyleComic',
  custom: 'wireframeStyleCustom'
}
