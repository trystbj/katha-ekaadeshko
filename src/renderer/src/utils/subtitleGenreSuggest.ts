import type { SubtitlePlaybackPresetId } from '../constants/subtitlePlaybackPresets'
import { DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID, isSubtitlePlaybackPresetId } from '../constants/subtitlePlaybackPresets'

/** Map backend genre string → subtitle playback preset (best-effort substring match). */
export function subtitlePresetForGenre(genreRaw: string): SubtitlePlaybackPresetId {
  const g = genreRaw.toLowerCase()
  let id: SubtitlePlaybackPresetId = DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
  if (/horror|thriller|scary/.test(g)) id = 'dark_glow'
  else if (/comedy|funny|humor/.test(g)) id = 'comic_bubble'
  else if (/romance|love/.test(g)) id = 'storybook'
  else if (/mystery|detective|crime/.test(g)) id = 'cinematic_movie'
  else if (/action|fight|war/.test(g)) id = 'bold_viral'
  else if (/folk|cultural|nepal|traditional/.test(g)) id = 'nepali_folk'
  else if (/fantasy|magic/.test(g)) id = 'fantasy_glow'
  return isSubtitlePlaybackPresetId(id) ? id : DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
}
