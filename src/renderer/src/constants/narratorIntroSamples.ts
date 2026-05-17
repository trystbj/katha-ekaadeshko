/**
 * Sync with `backend/utils/narratorIntroSamples.js` — intro shown during preview + browser TTS fallback.
 */
import { normalizeNarratorId } from './narrators'

export const NARRATOR_INTRO_SAMPLES_NE: Record<string, string> = {
  tryst_bj:
    'नमस्ते, म तपाईँको कथाको साथी। आज हामी एक रोमाञ्चक यात्रामा जाँदै छौँ।',
  penguin:
    'समयको पारि, कल्पनाको संसारमा। एउटा अद्भुत कथा तपाईँलाई पर्खँदै छ।'
}

export function getNarratorIntroSampleDisplay(narratorId: string): string {
  const id = normalizeNarratorId(narratorId)
  return NARRATOR_INTRO_SAMPLES_NE[id] ?? ''
}
