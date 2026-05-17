/**
 * Royalty-free Mixkit music + SFX previews (https://mixkit.co/license/).
 * IDs verified via Mixkit listing pages; swap URLs if CDN layout changes.
 */

export const MUSIC = {
  default: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3',
  suspense: 'https://assets.mixkit.co/music/preview/mixkit-cinematic-movie-trailer-orchestra-music-458.mp3',
  horror: 'https://assets.mixkit.co/music/preview/mixkit-halloween-ambient-265.mp3',
  romance: 'https://assets.mixkit.co/music/preview/mixkit-sweet-vibes-563.mp3',
  comedy: 'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
  fantasy: 'https://assets.mixkit.co/music/preview/mixkit-magical-moment-inspiring-orchestra-474.mp3',
  scifi: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambient-138.mp3',
  action: 'https://assets.mixkit.co/music/preview/mixkit-action-trailer-orchestra-555.mp3',
  drama: 'https://assets.mixkit.co/music/preview/mixkit-deep-in-thought-loop-676.mp3',
  folklore: 'https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3',
  calm: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3'
}

/** @param {number} id Mixkit active_storage sfx id */
export function mixkitSfxPreviewUrl(id) {
  return `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`
}

/** Keyword tag → preview URL (subtle layer). */
export const SFX_BY_TAG = {
  rain: mixkitSfxPreviewUrl(2395),
  thunder: mixkitSfxPreviewUrl(3093),
  wind: mixkitSfxPreviewUrl(2608),
  birds: mixkitSfxPreviewUrl(2472),
  river: mixkitSfxPreviewUrl(2473),
  forest: mixkitSfxPreviewUrl(2485),
  fire: mixkitSfxPreviewUrl(1736),
  crowd: mixkitSfxPreviewUrl(424),
  bell: mixkitSfxPreviewUrl(933),
  footsteps: mixkitSfxPreviewUrl(532),
  city: mixkitSfxPreviewUrl(1554),
  village: mixkitSfxPreviewUrl(2465),
  sword: mixkitSfxPreviewUrl(1485),
  door: mixkitSfxPreviewUrl(190),
  paper: mixkitSfxPreviewUrl(423),
  heartbeat: mixkitSfxPreviewUrl(493),
  whisper: mixkitSfxPreviewUrl(302),
  scream: mixkitSfxPreviewUrl(2195),
  horse: mixkitSfxPreviewUrl(85),
  splash: mixkitSfxPreviewUrl(2364),
  vehicle: mixkitSfxPreviewUrl(2648),
  magic: mixkitSfxPreviewUrl(2478),
  cave_echo: mixkitSfxPreviewUrl(2523)
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
}

export function nepalRegionalContext({ country, theme, seedLine, setting } = {}) {
  const b = [country, theme, seedLine, setting].filter(Boolean).join(' ').toLowerCase()
  return /\bnepal\b|nepali|नेपाल|काठमाडौ|kathmandu|pokhara|bhaktapur|himalaya|himal|everest|लुम्बिनी|newar\b/i.test(b)
}

/**
 * Core genre → music bucket (matches legacy resolveAmbientBed routing).
 */
export function pickGenreBaseBedKey({ genre, theme, tone, seedLine, setting }) {
  const g = norm(genre)
  const toneKey = norm(tone)
  const t = norm(theme)
  const blob = [seedLine, setting].filter(Boolean).join(' ').toLowerCase()

  if (/ghost|nightmare|blood|murder|\bdead\b|haunted|demon/.test(blob)) return 'horror'
  if (['horror'].includes(g)) return toneKey === 'tender' ? 'drama' : 'horror'
  if (['thriller', 'crime', 'noir'].includes(g)) return 'suspense'
  if (g === 'mystery' || toneKey === 'tense' || toneKey === 'noir') return 'suspense'

  if (/spiritual|meditat|monastery|monk|prayer|mandir|temple bell|घण्टी/i.test(blob)) return 'calm'
  if (/\bsad\b|grief|mourning|funeral|cry\b|sob\b|टुहुरो/i.test(blob)) return 'drama'

  if (['love', 'young-adult'].includes(g) || toneKey === 'tender' || toneKey === 'warm') return 'romance'
  if (g === 'comedy' || toneKey === 'whimsical') return 'comedy'

  if (['fantasy', 'supernatural'].includes(g)) return 'fantasy'
  if (/myth|urban legend|paranormal|folklore|magical/.test(t)) return 'fantasy'

  if (g === 'sci-fi' || g === 'sci fi') return 'scifi'

  if (['action'].includes(g) || toneKey === 'epic') return 'action'
  if (['adventure'].includes(g)) return 'fantasy'

  if (['historical', 'folklore'].includes(g)) return 'folklore'

  if (g === 'drama') return 'drama'
  if (g === 'slice-of-life') return 'calm'

  return 'default'
}

/**
 * Phase-adjusted bed URL for segmented cinematic timeline.
 * @param {{ genre: string, theme?: string, tone?: string, seedLine?: string, setting?: string, phase: string, nepaliBoost?: boolean }} ctx
 */
export function pickBedForGenrePhase(ctx) {
  const baseKey = pickGenreBaseBedKey(ctx)
  const phase = norm(ctx.phase) || 'body'
  const nepali = Boolean(ctx.nepaliBoost)
  const g = norm(ctx.genre)
  const horrorFamily = baseKey === 'horror' || g === 'horror'

  let key = baseKey
  switch (phase) {
    case 'intro':
      if (horrorFamily) key = 'horror'
      else if (baseKey === 'comedy') key = 'comedy'
      else if (baseKey === 'romance') key = 'romance'
      else if (baseKey === 'action' || baseKey === 'scifi') key = 'scifi'
      else key = 'calm'
      break
    case 'tension':
      if (horrorFamily) key = 'horror'
      else if (baseKey === 'comedy') key = 'comedy'
      else if (baseKey === 'action' || baseKey === 'scifi') key = 'action'
      else key = 'suspense'
      break
    case 'reveal':
      if (horrorFamily) key = 'horror'
      else if (baseKey === 'romance') key = 'fantasy'
      else key = 'fantasy'
      break
    case 'emotional':
      if (horrorFamily) key = 'drama'
      else if (baseKey === 'romance') key = 'romance'
      else if (baseKey === 'folklore') key = 'folklore'
      else key = 'drama'
      break
    case 'climax':
      if (horrorFamily) key = 'horror'
      else if (baseKey === 'fantasy' || baseKey === 'folklore') key = 'action'
      else if (baseKey === 'scifi') key = 'scifi'
      else key = 'action'
      break
    case 'ending':
      if (horrorFamily) key = 'drama'
      else if (baseKey === 'comedy') key = 'comedy'
      else if (baseKey === 'romance') key = 'romance'
      else key = 'calm'
      break
    default:
      key = baseKey
  }

  if (nepali && !horrorFamily && (phase === 'intro' || phase === 'ending' || phase === 'emotional')) {
    if (['fantasy', 'folklore', 'drama', 'default', 'romance'].includes(baseKey)) key = 'folklore'
  }

  return MUSIC[key] || MUSIC.default
}

/**
 * Legacy single URL for clients that only pass backgroundMusic (no plan).
 */
export function resolveAmbientBedUrl({ genre, theme, tone, seedLine, setting, country }) {
  const nepali = nepalRegionalContext({ country, theme, seedLine, setting })
  return pickBedForGenrePhase({
    genre,
    theme,
    tone,
    seedLine,
    setting,
    phase: 'body',
    nepaliBoost: nepali
  })
}
