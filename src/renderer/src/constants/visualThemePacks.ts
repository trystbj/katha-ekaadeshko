import type { VisualStyleId } from '../types/story'
import type { StudioSeasonId } from './studioSeasonThemes'

export type VisualThemePackCategory = 'seasons' | 'nature' | 'style_packs'

export type VisualThemePackId =
  | 'season_spring_nepal_bloom'
  | 'season_monsoon_mist_valley'
  | 'season_summer_himalayan_gold'
  | 'season_autumn_dashain_glow'
  | 'season_winter_everest_frost'
  | 'nature_pokhara_lake_dream'
  | 'nature_mustang_desert_sky'
  | 'nature_ilam_tea_garden'
  | 'nature_rara_lake_reflection'
  | 'nature_annapurna_sunrise'
  | 'nature_langtang_snowfall'
  | 'nature_rhododendron_forest'
  | 'nature_himalayan_night_sky'
  | 'style_nepali_cinematic_anime'
  | 'style_watercolor_nepal'
  | 'style_epic_mythic_nepal'
  | 'style_folk_tale_illustration'
  | 'style_dark_himalayan_mystery'
  | 'style_romantic_valley_glow'
  | 'style_ancient_temple_fantasy'

export type VisualThemePack = {
  id: VisualThemePackId
  category: VisualThemePackCategory
  labelKey: string
  moodKey: string
  /** Maps into pipeline visual style (Leonardo / bible). */
  mapsToStyleId: VisualStyleId
  /** Extra cue appended to prompt contexts (English — models handle multilingual output separately). */
  extraPrompt: string
  previewGradient: string
  previewImageUrl: string
  /** Optional: sync seasonal ambient when user picks this pack. */
  studioSeasonId?: StudioSeasonId
}

/** Vertical 9:16 poster crops — Nepal / Himalaya mood references. */
export const VISUAL_THEME_PACKS: Record<VisualThemePackId, VisualThemePack> = {
  season_spring_nepal_bloom: {
    id: 'season_spring_nepal_bloom',
    category: 'seasons',
    labelKey: 'packSeasonSpringNepalBloom',
    moodKey: 'packMoodSpringBloom',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'spring Nepal bloom, rhododendron forests, crisp mountain air, festival ribbons, soft golden mist',
    previewGradient: 'linear-gradient(180deg, rgba(80,40,60,0.2), rgba(0,0,0,0.82))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'spring_rhododendron'
  },
  season_monsoon_mist_valley: {
    id: 'season_monsoon_mist_valley',
    category: 'seasons',
    labelKey: 'packSeasonMonsoonMist',
    moodKey: 'packMoodMonsoonMist',
    mapsToStyleId: 'cinematic_realistic',
    extraPrompt:
      'monsoon mist in Nepal valleys, teal shadows, rain ribbons, distant peaks, cinematic humidity',
    previewGradient: 'linear-gradient(180deg, rgba(10,50,45,0.35), rgba(0,0,0,0.88))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'monsoon_valley'
  },
  season_summer_himalayan_gold: {
    id: 'season_summer_himalayan_gold',
    category: 'seasons',
    labelKey: 'packSeasonSummerGold',
    moodKey: 'packMoodSummerGold',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'summer Himalayan gold hour, sharp ridges, prayer flags in bright wind, saturated skies',
    previewGradient: 'linear-gradient(180deg, rgba(120,80,20,0.25), rgba(0,0,0,0.8))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'himalayan_dawn'
  },
  season_autumn_dashain_glow: {
    id: 'season_autumn_dashain_glow',
    category: 'seasons',
    labelKey: 'packSeasonAutumnDashain',
    moodKey: 'packMoodAutumnDashain',
    mapsToStyleId: 'cozy_storybook',
    extraPrompt:
      'autumn Dashain glow, marigold garlands, courtyard lanterns, family warmth, amber atmosphere',
    previewGradient: 'linear-gradient(180deg, rgba(120,40,10,0.4), rgba(0,0,0,0.85))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'autumn_kathmandu'
  },
  season_winter_everest_frost: {
    id: 'season_winter_everest_frost',
    category: 'seasons',
    labelKey: 'packSeasonWinterEverest',
    moodKey: 'packMoodWinterFrost',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'winter Everest frost, crystalline air, ice-blue light, epic scale, minimal warm accents',
    previewGradient: 'linear-gradient(180deg, rgba(30,60,90,0.35), rgba(0,0,0,0.92))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'mystic_midnight'
  },
  nature_pokhara_lake_dream: {
    id: 'nature_pokhara_lake_dream',
    category: 'nature',
    labelKey: 'packNaturePokharaLake',
    moodKey: 'packMoodPokhara',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'Pokhara lake dream, mirrored Annapurna, boats at dawn, pastel reflections, serene pacing',
    previewGradient: 'linear-gradient(180deg, rgba(40,70,90,0.3), rgba(0,0,0,0.78))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_mustang_desert_sky: {
    id: 'nature_mustang_desert_sky',
    category: 'nature',
    labelKey: 'packNatureMustang',
    moodKey: 'packMoodMustang',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'Upper Mustang desert sky, wind-carved cliffs, ochre earth, vast negative space, heroic silhouettes',
    previewGradient: 'linear-gradient(180deg, rgba(90,50,20,0.35), rgba(0,0,0,0.86))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_ilam_tea_garden: {
    id: 'nature_ilam_tea_garden',
    category: 'nature',
    labelKey: 'packNatureIlamTea',
    moodKey: 'packMoodIlam',
    mapsToStyleId: 'cozy_storybook',
    extraPrompt:
      'Ilam tea garden morning, rolling green terraces, silver fog bands, gentle intimacy',
    previewGradient: 'linear-gradient(180deg, rgba(20,60,40,0.35), rgba(0,0,0,0.8))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_rara_lake_reflection: {
    id: 'nature_rara_lake_reflection',
    category: 'nature',
    labelKey: 'packNatureRaraLake',
    moodKey: 'packMoodRara',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'Rara Lake reflection, glass-still water, pine ridges, sacred quiet, mythic calm',
    previewGradient: 'linear-gradient(180deg, rgba(25,55,70,0.32), rgba(0,0,0,0.84))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_annapurna_sunrise: {
    id: 'nature_annapurna_sunrise',
    category: 'nature',
    labelKey: 'packNatureAnnapurnaSunrise',
    moodKey: 'packMoodAnnapurna',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'Annapurna sunrise, alpenglow gradients, prayer flag motion blur, wide cinematic lenses',
    previewGradient: 'linear-gradient(180deg, rgba(180,90,40,0.28), rgba(0,0,0,0.82))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_langtang_snowfall: {
    id: 'nature_langtang_snowfall',
    category: 'nature',
    labelKey: 'packNatureLangtangSnow',
    moodKey: 'packMoodLangtang',
    mapsToStyleId: 'cinematic_realistic',
    extraPrompt:
      'Langtang snowfall, whiteout streaks, teal shadows, survival intimacy, cold breath light',
    previewGradient: 'linear-gradient(180deg, rgba(40,55,70,0.4), rgba(0,0,0,0.9))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_rhododendron_forest: {
    id: 'nature_rhododendron_forest',
    category: 'nature',
    labelKey: 'packNatureRhodoForest',
    moodKey: 'packMoodRhodoForest',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'dense rhododendron forest Nepal, magenta canopy light shafts, fairy-tale depth',
    previewGradient: 'linear-gradient(180deg, rgba(90,20,50,0.32), rgba(0,0,0,0.85))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=700&auto=format&fit=crop&q=80'
  },
  nature_himalayan_night_sky: {
    id: 'nature_himalayan_night_sky',
    category: 'nature',
    labelKey: 'packNatureNightSky',
    moodKey: 'packMoodNightSky',
    mapsToStyleId: 'cinematic_realistic',
    extraPrompt:
      'Himalayan night sky, dense stars, milky way arc, monastery rim light, cosmic awe',
    previewGradient: 'linear-gradient(180deg, rgba(15,10,40,0.45), rgba(0,0,0,0.92))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=700&auto=format&fit=crop&q=80',
    studioSeasonId: 'mystic_midnight'
  },
  style_nepali_cinematic_anime: {
    id: 'style_nepali_cinematic_anime',
    category: 'style_packs',
    labelKey: 'packStyleNepaliCinematicAnime',
    moodKey: 'packMoodNepaliCinematic',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'Nepali cinematic anime, filmic contrast, gold rim lights, respectful cultural costume detail',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.82))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_watercolor_nepal: {
    id: 'style_watercolor_nepal',
    category: 'style_packs',
    labelKey: 'packStyleWatercolorNepal',
    moodKey: 'packMoodWatercolor',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'watercolor Nepal illustration, bleeding pigments, rice paper texture, emotional softness',
    previewGradient: 'linear-gradient(180deg, rgba(60,90,120,0.22), rgba(0,0,0,0.75))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_epic_mythic_nepal: {
    id: 'style_epic_mythic_nepal',
    category: 'style_packs',
    labelKey: 'packStyleEpicMythic',
    moodKey: 'packMoodEpicMythic',
    mapsToStyleId: 'cinematic_anime',
    extraPrompt:
      'epic mythic Nepal, divine scale, thundercloud palette, yaksha-like silhouettes (original)',
    previewGradient: 'linear-gradient(180deg, rgba(40,20,80,0.35), rgba(0,0,0,0.88))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_folk_tale_illustration: {
    id: 'style_folk_tale_illustration',
    category: 'style_packs',
    labelKey: 'packStyleFolkTale',
    moodKey: 'packMoodFolkTale',
    mapsToStyleId: 'comic_panel',
    extraPrompt:
      'Nepal folk tale illustration, flattened shapes, ornamental borders hint, storyteller warmth',
    previewGradient: 'linear-gradient(180deg, rgba(120,60,20,0.25), rgba(0,0,0,0.78))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57f90?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_dark_himalayan_mystery: {
    id: 'style_dark_himalayan_mystery',
    category: 'style_packs',
    labelKey: 'packStyleDarkMystery',
    moodKey: 'packMoodDarkMystery',
    mapsToStyleId: 'cinematic_realistic',
    extraPrompt:
      'dark Himalayan mystery, fog-choked trails, lantern spill, psychological tension',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.92))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_romantic_valley_glow: {
    id: 'style_romantic_valley_glow',
    category: 'style_packs',
    labelKey: 'packStyleRomanticValley',
    moodKey: 'packMoodRomanticValley',
    mapsToStyleId: 'cozy_storybook',
    extraPrompt:
      'romantic valley glow Nepal, bloom halation, soft lens, intimate two-shot potential',
    previewGradient: 'linear-gradient(180deg, rgba(140,60,80,0.22), rgba(0,0,0,0.72))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&auto=format&fit=crop&q=80'
  },
  style_ancient_temple_fantasy: {
    id: 'style_ancient_temple_fantasy',
    category: 'style_packs',
    labelKey: 'packStyleTempleFantasy',
    moodKey: 'packMoodTempleFantasy',
    mapsToStyleId: 'soft_anime_fantasy',
    extraPrompt:
      'ancient temple fantasy Nepal, carved wood gods, butter lamps, whispered legends',
    previewGradient: 'linear-gradient(180deg, rgba(80,50,20,0.32), rgba(0,0,0,0.86))',
    previewImageUrl:
      'https://images.unsplash.com/photo-1548115184-bc6547d06a58?w=400&h=700&auto=format&fit=crop&q=80'
  }
}

export const DEFAULT_VISUAL_THEME_PACK_ID: VisualThemePackId = 'style_nepali_cinematic_anime'

export const VISUAL_THEME_PACK_ORDER: VisualThemePackId[] = [
  'season_spring_nepal_bloom',
  'season_monsoon_mist_valley',
  'season_summer_himalayan_gold',
  'season_autumn_dashain_glow',
  'season_winter_everest_frost',
  'nature_pokhara_lake_dream',
  'nature_mustang_desert_sky',
  'nature_ilam_tea_garden',
  'nature_rara_lake_reflection',
  'nature_annapurna_sunrise',
  'nature_langtang_snowfall',
  'nature_rhododendron_forest',
  'nature_himalayan_night_sky',
  'style_nepali_cinematic_anime',
  'style_watercolor_nepal',
  'style_epic_mythic_nepal',
  'style_folk_tale_illustration',
  'style_dark_himalayan_mystery',
  'style_romantic_valley_glow',
  'style_ancient_temple_fantasy'
]

export function packIdsForCategory(cat: VisualThemePackCategory): VisualThemePackId[] {
  return VISUAL_THEME_PACK_ORDER.filter((id) => VISUAL_THEME_PACKS[id].category === cat)
}

export function defaultPackForStyle(style: VisualStyleId): VisualThemePackId {
  const hit = VISUAL_THEME_PACK_ORDER.find((id) => VISUAL_THEME_PACKS[id].mapsToStyleId === style)
  return hit ?? DEFAULT_VISUAL_THEME_PACK_ID
}
