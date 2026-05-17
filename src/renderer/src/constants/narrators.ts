/**
 * UI metadata for narrators — IDs must match `backend/utils/narratorVoiceEngine.js`.
 * Display names are fixed strings (never passed through i18n); descriptors use `descriptorKey`.
 */
import type { NarratorGender } from '../types/story'

/** Legacy preset IDs from saved projects → canonical id */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  m1_deep: 'tryst_bj',
  m2_crisp: 'tryst_bj',
  m3_calm: 'tryst_bj',
  f1_warm_clear: 'penguin',
  f2_bright: 'penguin',
  f3_soft_story: 'penguin'
}

export function normalizeNarratorId(raw: string | undefined | null): string {
  const id = String(raw ?? '').trim()
  if (!id) return 'tryst_bj'
  if (id === 'tryst_bj' || id === 'penguin') return id
  return LEGACY_TO_CANONICAL[id] ?? 'tryst_bj'
}

export type NarratorUiPreset = {
  id: string
  gender: NarratorGender
  /** Fixed UI label — never translate */
  displayName: string
  /** i18n key for descriptor line (e.g. Deep / Narrative) */
  descriptorKey: string
  initials: string
  avatarVariant: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  portraitImageUrl: string
  profileBioKey: string
  personalityShortKey: string
}

export const NARRATOR_UI_PRESETS: NarratorUiPreset[] = [
  {
    id: 'tryst_bj',
    gender: 'male',
    displayName: 'Tryst BJ',
    descriptorKey: 'narratorDescriptorTrystBj',
    initials: 'TB',
    avatarVariant: 'a',
    portraitImageUrl: '/narrator-tryst-bj.png?v=2',
    profileBioKey: 'narratorProfileBioTrystBj',
    personalityShortKey: 'narratorPersonalityTrystBj'
  },
  {
    id: 'penguin',
    gender: 'female',
    displayName: 'Penguin',
    descriptorKey: 'narratorDescriptorPenguin',
    initials: 'P',
    avatarVariant: 'e',
    portraitImageUrl: '/narrators/narrator-f3-soft-story.png?v=2',
    profileBioKey: 'narratorProfileBioPenguin',
    personalityShortKey: 'narratorPersonalityPenguin'
  }
]

export const DEFAULT_NARRATOR_ID = 'tryst_bj'
