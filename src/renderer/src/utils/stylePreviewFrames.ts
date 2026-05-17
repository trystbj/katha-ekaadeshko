import type { VisualStyleId } from '../types/story'

type FramePromptSpec = {
  /** Vertical frame prompt for a single “sample scene” */
  prompt: string
  /** Deterministic seed so preview stays consistent */
  seed: number
}

/**
 * Fixed, story-like scene frames per style.
 * These are *preview-only* and do not affect the generation pipeline.
 */
export function previewFrameSpecForStyle(styleId: VisualStyleId, customVisualPrompt?: string): FramePromptSpec {
  const baseScene =
    'A cinematic vertical 9:16 frame from an animated story scene. Two characters (one foreground close-up, one midground), expressive faces and emotion, clear environment, dramatic lighting, depth of field, subtle action moment, premium composition. No text, no logos, no watermark.'

  switch (styleId) {
    case 'soft_anime_fantasy':
      return {
        seed: 143_201,
        prompt:
          `${baseScene} Ghibli-inspired warmth, painterly soft textures, gentle sunlight, lush greenery and cozy village details, whimsical atmosphere, charming expressive characters, soft pastel palette, dreamy bokeh, tender emotional vibe.`
      }
    case 'cinematic_anime':
      return {
        seed: 531_902,
        prompt:
          `${baseScene} Premium cinematic anime film look, rich lighting with rim light, high-detail characters, cinematic framing, strong emotional storytelling shot, subtle film grain, ultra clean render, dramatic composition.`
      }
    case 'comic_panel':
      return {
        seed: 840_117,
        prompt:
          `${baseScene} Illustrated comic panel style, bold ink outlines, dynamic composition, vivid stylized colors, halftone accents, strong visual storytelling, expressive poses, high-contrast shading.`
      }
    case 'dark_anime':
      return {
        seed: 390_055,
        prompt:
          `${baseScene} Dark fantasy moody animation, shadows and fog, dramatic rim lighting, mysterious atmosphere, intense expressions, darker palette with deep blues and purples, cinematic suspense moment.`
      }
    case 'cozy_storybook':
      return {
        seed: 205_776,
        prompt:
          `${baseScene} Cozy hand-drawn storybook animation, soft watercolor washes, gentle nature ambience, warm friendly expressions, peaceful pacing, simple expressive motion, Nepal-inspired village and forest scenery, storybook charm.`
      }
    case 'custom': {
      const line = (customVisualPrompt ?? '').trim()
      const custom =
        line.length > 0
          ? ` User art direction: ${line}. Ensure the preview frame strongly reflects this art direction while remaining a story-like scene with characters and environment.`
          : ' Custom visual style as described by the user; if missing, use a premium cinematic illustrated look.'
      return {
        seed: 772_901,
        prompt: `${baseScene}${custom}`
      }
    }
    default:
      return { seed: 111_111, prompt: baseScene }
  }
}

