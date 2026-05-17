/** Presets for in-player WebVTT + subtitle studio (timing follows scene pacing via `scenesToWebVtt`). */

export type SubtitlePlaybackPresetId =
  | 'cinematic_gold'
  | 'clean_white'
  | 'high_contrast'
  | 'minimal_bottom'
  | 'large_soft'
  | 'classic_centered'
  | 'cinematic_movie'
  | 'bold_viral'
  | 'minimal_modern'
  | 'storybook'
  | 'comic_bubble'
  | 'dark_glow'
  | 'luxury_gold'
  | 'anime_outline'
  | 'nepali_folk'
  | 'viral_reel'
  | 'tiktok_pop'
  | 'youtube_shorts_caption'
  | 'karaoke_highlight'
  | 'fantasy_glow'
  | 'custom_mix'

export type SubtitleVttRenderOptions = {
  linePct: number
  align: 'start' | 'center' | 'end'
  sizePct: number
  cueStyleLines: string[]
}

const PRESET_RECORD = {
  cinematic_gold: {
    labelKey: 'storySubtitlePresetCinematicGold',
    swatch: 'linear-gradient(145deg, #fff8e8, #d4af37)',
    vtt: {
      linePct: 88,
      align: 'center' as const,
      sizePct: 88,
      cueStyleLines: [
        'color: #fff8e8',
        'background-color: rgba(12, 10, 6, 0.78)',
        'text-shadow: 0 2px 14px rgba(0, 0, 0, 0.92)',
        'font-size: 96%',
        'font-weight: 700',
        'letter-spacing: 0.03em'
      ]
    }
  },
  clean_white: {
    labelKey: 'storySubtitlePresetCleanWhite',
    swatch: 'linear-gradient(180deg, #ffffff, #e8ecf2)',
    vtt: {
      linePct: 90,
      align: 'center' as const,
      sizePct: 85,
      cueStyleLines: [
        'color: #fafbff',
        'background-color: rgba(6, 10, 18, 0.55)',
        'text-shadow: 0 1px 10px rgba(0, 0, 0, 0.85)',
        'font-size: 92%',
        'font-weight: 600'
      ]
    }
  },
  high_contrast: {
    labelKey: 'storySubtitlePresetHighContrast',
    swatch: 'linear-gradient(180deg, #ffe566, #ffcc00)',
    vtt: {
      linePct: 86,
      align: 'center' as const,
      sizePct: 92,
      cueStyleLines: [
        'color: #0a0a0a',
        'background-color: rgba(255, 236, 120, 0.94)',
        'text-shadow: none',
        'font-size: 100%',
        'font-weight: 800'
      ]
    }
  },
  minimal_bottom: {
    labelKey: 'storySubtitlePresetMinimal',
    swatch: 'rgba(255,255,255,0.35)',
    vtt: {
      linePct: 93,
      align: 'center' as const,
      sizePct: 78,
      cueStyleLines: [
        'color: rgba(255, 252, 246, 0.96)',
        'background-color: transparent',
        'text-shadow: 0 2px 16px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9)',
        'font-size: 82%',
        'font-weight: 600'
      ]
    }
  },
  large_soft: {
    labelKey: 'storySubtitlePresetLargeSoft',
    swatch: 'linear-gradient(90deg, rgba(220,200,255,0.9), rgba(180,220,255,0.9))',
    vtt: {
      linePct: 82,
      align: 'center' as const,
      sizePct: 94,
      cueStyleLines: [
        'color: #f4f7ff',
        'background-color: rgba(18, 22, 38, 0.72)',
        'text-shadow: 0 3px 18px rgba(0, 0, 0, 0.88)',
        'font-size: 108%',
        'font-weight: 650',
        'line-height: 1.35'
      ]
    }
  },
  classic_centered: {
    labelKey: 'storySubtitlePresetClassicCentered',
    swatch: 'linear-gradient(180deg, #ffffff, #dfe6ee)',
    vtt: {
      linePct: 89,
      align: 'center' as const,
      sizePct: 86,
      cueStyleLines: [
        'color: #ffffff',
        'background-color: rgba(0, 0, 0, 0.62)',
        'text-shadow: 0 2px 10px rgba(0, 0, 0, 0.88)',
        'font-size: 94%',
        'font-weight: 620'
      ]
    }
  },
  cinematic_movie: {
    labelKey: 'storySubtitlePresetCinematicMovie',
    swatch: 'linear-gradient(95deg, #f5f5f5, #c8c8c8)',
    vtt: {
      linePct: 87,
      align: 'center' as const,
      sizePct: 82,
      cueStyleLines: [
        'color: #eeeeee',
        'background-color: rgba(8, 8, 12, 0.48)',
        'text-shadow: 0 3px 22px rgba(0, 0, 0, 0.95)',
        'font-size: 88%',
        'font-weight: 580',
        'letter-spacing: 0.06em'
      ]
    }
  },
  bold_viral: {
    labelKey: 'storySubtitlePresetBoldViral',
    swatch: 'linear-gradient(180deg, #fff400, #ff9900)',
    vtt: {
      linePct: 84,
      align: 'center' as const,
      sizePct: 96,
      cueStyleLines: [
        'color: #111111',
        'background-color: rgba(255, 250, 120, 0.92)',
        'text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
        'font-size: 112%',
        'font-weight: 900'
      ]
    }
  },
  minimal_modern: {
    labelKey: 'storySubtitlePresetMinimalModern',
    swatch: 'rgba(240,248,255,0.45)',
    vtt: {
      linePct: 92,
      align: 'center' as const,
      sizePct: 76,
      cueStyleLines: [
        'color: rgba(248, 250, 252, 0.98)',
        'background-color: transparent',
        'text-shadow: 0 2px 14px rgba(0, 0, 0, 0.92)',
        'font-size: 80%',
        'font-weight: 540'
      ]
    }
  },
  storybook: {
    labelKey: 'storySubtitlePresetStorybook',
    swatch: 'linear-gradient(135deg, #fdf6ec, #e9d8c4)',
    vtt: {
      linePct: 88,
      align: 'center' as const,
      sizePct: 84,
      cueStyleLines: [
        'color: #3d2f28',
        'background-color: rgba(253, 246, 236, 0.82)',
        'text-shadow: 0 2px 8px rgba(61, 47, 40, 0.35)',
        'font-size: 92%',
        'font-weight: 620',
        'letter-spacing: 0.02em'
      ]
    }
  },
  comic_bubble: {
    labelKey: 'storySubtitlePresetComic',
    swatch: 'linear-gradient(180deg, #ffffff, #fff066)',
    vtt: {
      linePct: 82,
      align: 'center' as const,
      sizePct: 92,
      cueStyleLines: [
        'color: #121212',
        'background-color: rgba(255, 255, 255, 0.9)',
        'text-shadow: -2px 0 #000, 2px 0 #000, 0 2px #000, 0 -2px #000',
        'font-size: 104%',
        'font-weight: 820'
      ]
    }
  },
  dark_glow: {
    labelKey: 'storySubtitlePresetDarkGlow',
    swatch: 'linear-gradient(180deg, #e0f7ff, #7dd3fc)',
    vtt: {
      linePct: 86,
      align: 'center' as const,
      sizePct: 88,
      cueStyleLines: [
        'color: #ecfeff',
        'background-color: rgba(6, 12, 22, 0.72)',
        'text-shadow: 0 0 18px rgba(125, 211, 252, 0.95), 0 2px 14px rgba(0, 0, 0, 0.95)',
        'font-size: 96%',
        'font-weight: 680'
      ]
    }
  },
  luxury_gold: {
    labelKey: 'storySubtitlePresetLuxuryGold',
    swatch: 'linear-gradient(120deg, #fff9e6, #bf953f, #fcf6ba)',
    vtt: {
      linePct: 84,
      align: 'center' as const,
      sizePct: 90,
      cueStyleLines: [
        'color: #fff9e6',
        'background-color: rgba(28, 22, 10, 0.75)',
        'text-shadow: 0 2px 18px rgba(191, 149, 63, 0.85), 0 2px 12px rgba(0, 0, 0, 0.9)',
        'font-size: 100%',
        'font-weight: 720',
        'letter-spacing: 0.08em'
      ]
    }
  },
  anime_outline: {
    labelKey: 'storySubtitlePresetAnime',
    swatch: 'linear-gradient(90deg, #fff, #fecaca)',
    vtt: {
      linePct: 85,
      align: 'center' as const,
      sizePct: 90,
      cueStyleLines: [
        'color: #ffffff',
        'background-color: rgba(30, 10, 40, 0.55)',
        'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 12px rgba(255, 182, 193, 0.85)',
        'font-size: 98%',
        'font-weight: 760'
      ]
    }
  },
  nepali_folk: {
    labelKey: 'storySubtitlePresetNepaliFolk',
    swatch: 'linear-gradient(160deg, #fff8f0, #c2410c33)',
    vtt: {
      linePct: 89,
      align: 'center' as const,
      sizePct: 84,
      cueStyleLines: [
        'color: #fff7ed',
        'background-color: rgba(67, 20, 7, 0.55)',
        'text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85)',
        'font-size: 93%',
        'font-weight: 630',
        'letter-spacing: 0.03em'
      ]
    }
  },
  viral_reel: {
    labelKey: 'storySubtitlePresetViralReel',
    swatch: 'linear-gradient(180deg, #fce7f3, #f472b6)',
    vtt: {
      linePct: 80,
      align: 'center' as const,
      sizePct: 94,
      cueStyleLines: [
        'color: #111827',
        'background-color: rgba(252, 231, 243, 0.92)',
        'text-shadow: -2px -2px 0 #fff, 2px 2px 0 rgba(244, 114, 182, 0.85)',
        'font-size: 106%',
        'font-weight: 880'
      ]
    }
  },
  tiktok_pop: {
    labelKey: 'storySubtitlePresetTiktokPop',
    swatch: 'linear-gradient(120deg, #25f4ee44, #fe2c5544)',
    vtt: {
      linePct: 78,
      align: 'center' as const,
      sizePct: 96,
      cueStyleLines: [
        'color: #ffffff',
        'background-color: rgba(12, 12, 18, 0.72)',
        'text-shadow: 3px 3px 0 rgba(254, 44, 85, 0.65), -2px -2px 0 rgba(37, 244, 238, 0.55)',
        'font-size: 110%',
        'font-weight: 900'
      ]
    }
  },
  youtube_shorts_caption: {
    labelKey: 'storySubtitlePresetYoutubeShorts',
    swatch: 'linear-gradient(180deg, #ffffff, #e5e7eb)',
    vtt: {
      linePct: 88,
      align: 'center' as const,
      sizePct: 88,
      cueStyleLines: [
        'color: #f9fafb',
        'background-color: rgba(17, 24, 39, 0.68)',
        'text-shadow: 0 2px 12px rgba(0, 0, 0, 0.88)',
        'font-size: 94%',
        'font-weight: 660'
      ]
    }
  },
  karaoke_highlight: {
    labelKey: 'storySubtitlePresetKaraokeHighlight',
    swatch: 'linear-gradient(90deg, #bbf7d0, #fde68a)',
    vtt: {
      linePct: 86,
      align: 'center' as const,
      sizePct: 92,
      cueStyleLines: [
        'color: #ecfdf5',
        'background-color: rgba(6, 78, 59, 0.58)',
        'text-shadow: 0 0 14px rgba(253, 230, 138, 0.85), 0 2px 12px rgba(0, 0, 0, 0.88)',
        'font-size: 102%',
        'font-weight: 760'
      ]
    }
  },
  fantasy_glow: {
    labelKey: 'storySubtitlePresetFantasyGlow',
    swatch: 'linear-gradient(140deg, #fef3c7, #a78bfa)',
    vtt: {
      linePct: 84,
      align: 'center' as const,
      sizePct: 90,
      cueStyleLines: [
        'color: #fefce8',
        'background-color: rgba(46, 16, 101, 0.58)',
        'text-shadow: 0 0 22px rgba(167, 139, 250, 0.95), 0 2px 14px rgba(0, 0, 0, 0.88)',
        'font-size: 98%',
        'font-weight: 690'
      ]
    }
  },
  custom_mix: {
    labelKey: 'storySubtitlePresetCustom',
    swatch: 'linear-gradient(90deg, rgba(255,255,255,0.7), rgba(251,191,36,0.35))',
    vtt: {
      linePct: 88,
      align: 'center' as const,
      sizePct: 86,
      cueStyleLines: [
        'color: #fafbff',
        'background-color: rgba(8, 10, 18, 0.55)',
        'text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85)',
        'font-size: 94%',
        'font-weight: 620'
      ]
    }
  }
} satisfies Record<
  SubtitlePlaybackPresetId,
  { labelKey: string; swatch: string; vtt: SubtitleVttRenderOptions }
>

export const SUBTITLE_PLAYBACK_PRESETS = PRESET_RECORD

export const SUBTITLE_PLAYBACK_PRESET_ORDER: SubtitlePlaybackPresetId[] = [
  'cinematic_gold',
  'luxury_gold',
  'classic_centered',
  'cinematic_movie',
  'bold_viral',
  'minimal_modern',
  'minimal_bottom',
  'clean_white',
  'storybook',
  'comic_bubble',
  'dark_glow',
  'fantasy_glow',
  'anime_outline',
  'nepali_folk',
  'high_contrast',
  'large_soft',
  'viral_reel',
  'tiktok_pop',
  'youtube_shorts_caption',
  'karaoke_highlight',
  'custom_mix'
]

export const DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID: SubtitlePlaybackPresetId = 'cinematic_gold'

export function isSubtitlePlaybackPresetId(id: string): id is SubtitlePlaybackPresetId {
  return id in SUBTITLE_PLAYBACK_PRESETS
}

export function subtitleVttOptionsForPreset(id: string): SubtitleVttRenderOptions {
  const key = isSubtitlePlaybackPresetId(id) ? id : DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
  return SUBTITLE_PLAYBACK_PRESETS[key].vtt
}
