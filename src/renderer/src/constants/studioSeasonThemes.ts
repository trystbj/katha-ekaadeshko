/** Nepal-inspired cinematic studio themes — ambience, particles, preview backdrops. */

export type StudioSeasonId =
  | 'himalayan_dawn'
  | 'monsoon_valley'
  | 'autumn_kathmandu'
  | 'snow_mountain_night'
  | 'village_sunset'
  | 'forest_rain'
  | 'temple_evening'
  | 'festival_lights'
  | 'cloudy_hills'
  | 'rice_field_morning'
  | 'spring_rhododendron'
  | 'mystic_midnight'

export type StudioSeasonPreset = {
  id: StudioSeasonId
  labelKey: string
  moodKey: string
  heroUrl: string
  overlay: string
  /** CSS particle tint for ambient layers */
  particleRgb: string
}

export const STUDIO_SEASON_ORDER: StudioSeasonId[] = [
  'himalayan_dawn',
  'monsoon_valley',
  'autumn_kathmandu',
  'snow_mountain_night',
  'village_sunset',
  'forest_rain',
  'temple_evening',
  'festival_lights',
  'cloudy_hills',
  'rice_field_morning',
  'spring_rhododendron',
  'mystic_midnight'
]

/** Legacy persisted season ids → current theme */
export const LEGACY_SEASON_MIGRATION: Record<string, StudioSeasonId> = {
  autumn_festival: 'autumn_kathmandu'
}

export const STUDIO_SEASON_PRESETS: Record<StudioSeasonId, StudioSeasonPreset> = {
  himalayan_dawn: {
    id: 'himalayan_dawn',
    labelKey: 'studioSeasonHimalayanDawn',
    moodKey: 'studioSeasonMoodDawn',
    heroUrl:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(135deg, rgba(13,31,36,0.88) 0%, rgba(212,175,55,0.12) 45%, rgba(20,45,55,0.9) 100%)',
    particleRgb: '212, 175, 55'
  },
  monsoon_valley: {
    id: 'monsoon_valley',
    labelKey: 'studioSeasonMonsoonValley',
    moodKey: 'studioSeasonMoodMonsoon',
    heroUrl:
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(160deg, rgba(8,42,38,0.92) 0%, rgba(34,120,90,0.25) 40%, rgba(6,28,30,0.95) 100%)',
    particleRgb: '80, 180, 140'
  },
  autumn_kathmandu: {
    id: 'autumn_kathmandu',
    labelKey: 'studioSeasonAutumnKathmandu',
    moodKey: 'studioSeasonMoodAutumnKtm',
    heroUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(180deg, rgba(55,20,12,0.75) 0%, rgba(212,140,40,0.2) 50%, rgba(30,12,8,0.85) 100%)',
    particleRgb: '230, 150, 60'
  },
  snow_mountain_night: {
    id: 'snow_mountain_night',
    labelKey: 'studioSeasonSnowMountainNight',
    moodKey: 'studioSeasonMoodSnowNight',
    heroUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(185deg, rgba(8,14,32,0.94) 0%, rgba(120,160,220,0.18) 45%, rgba(5,10,24,0.96) 100%)',
    particleRgb: '180, 210, 255'
  },
  village_sunset: {
    id: 'village_sunset',
    labelKey: 'studioSeasonVillageSunset',
    moodKey: 'studioSeasonMoodSunset',
    heroUrl:
      'https://images.unsplash.com/photo-1470240731272-782880416924?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(195deg, rgba(45,22,8,0.7) 0%, rgba(230,120,40,0.25) 48%, rgba(25,15,30,0.88) 100%)',
    particleRgb: '255, 160, 90'
  },
  forest_rain: {
    id: 'forest_rain',
    labelKey: 'studioSeasonForestRain',
    moodKey: 'studioSeasonMoodForestRain',
    heroUrl:
      'https://images.unsplash.com/photo-1448375249986-3933afd6a6e3?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(165deg, rgba(6,28,18,0.9) 0%, rgba(40,90,60,0.35) 50%, rgba(4,16,12,0.94) 100%)',
    particleRgb: '100, 200, 150'
  },
  temple_evening: {
    id: 'temple_evening',
    labelKey: 'studioSeasonTempleEvening',
    moodKey: 'studioSeasonMoodTemple',
    heroUrl:
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7ed?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(150deg, rgba(40,18,8,0.85) 0%, rgba(255,180,80,0.22) 40%, rgba(20,8,30,0.9) 100%)',
    particleRgb: '255, 200, 120'
  },
  festival_lights: {
    id: 'festival_lights',
    labelKey: 'studioSeasonFestivalLights',
    moodKey: 'studioSeasonMoodFestival',
    heroUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(140deg, rgba(30,8,40,0.8) 0%, rgba(255,120,180,0.2) 35%, rgba(255,200,60,0.15) 60%, rgba(12,6,24,0.92) 100%)',
    particleRgb: '255, 180, 220'
  },
  cloudy_hills: {
    id: 'cloudy_hills',
    labelKey: 'studioSeasonCloudyHills',
    moodKey: 'studioSeasonMoodCloudy',
    heroUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(180deg, rgba(40,50,70,0.75) 0%, rgba(180,190,210,0.2) 50%, rgba(25,30,45,0.9) 100%)',
    particleRgb: '200, 210, 230'
  },
  rice_field_morning: {
    id: 'rice_field_morning',
    labelKey: 'studioSeasonRiceFieldMorning',
    moodKey: 'studioSeasonMoodRiceMorning',
    heroUrl:
      'https://images.unsplash.com/photo-1500382017468-904fc6a8e8e2?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(175deg, rgba(50,70,30,0.55) 0%, rgba(255,240,180,0.25) 45%, rgba(30,50,35,0.88) 100%)',
    particleRgb: '220, 235, 160'
  },
  spring_rhododendron: {
    id: 'spring_rhododendron',
    labelKey: 'studioSeasonSpringRhodo',
    moodKey: 'studioSeasonMoodSpring',
    heroUrl:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(135deg, rgba(45,18,40,0.55) 0%, rgba(180,60,90,0.15) 55%, rgba(20,35,45,0.88) 100%)',
    particleRgb: '220, 100, 140'
  },
  mystic_midnight: {
    id: 'mystic_midnight',
    labelKey: 'studioSeasonMysticMidnight',
    moodKey: 'studioSeasonMoodMidnight',
    heroUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    overlay:
      'linear-gradient(185deg, rgba(8,10,28,0.92) 0%, rgba(80,40,120,0.2) 45%, rgba(5,8,22,0.94) 100%)',
    particleRgb: '140, 100, 220'
  }
}

export const DEFAULT_STUDIO_SEASON: StudioSeasonId = 'himalayan_dawn'

export function normalizeStudioSeasonId(raw: unknown): StudioSeasonId {
  const id = String(raw ?? '')
  if (id in LEGACY_SEASON_MIGRATION) return LEGACY_SEASON_MIGRATION[id]
  if (STUDIO_SEASON_ORDER.includes(id as StudioSeasonId)) return id as StudioSeasonId
  return DEFAULT_STUDIO_SEASON
}
