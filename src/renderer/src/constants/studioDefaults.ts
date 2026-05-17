import type { VisualStyleId } from '../types/story'
import { DEFAULT_NARRATOR_ID } from './narrators'

export { DEFAULT_NARRATOR_ID }
export const DEFAULT_UI_LANGUAGE = 'en'
/** Regional story text language — user can change in studio before generate. */
export const DEFAULT_STORY_LANGUAGE = 'ne'
/** Default region label for stream generation (Nepal + Nepali). */
export const DEFAULT_STORY_COUNTRY = 'Nepal'
export const DEFAULT_STYLE_ID: VisualStyleId = 'cinematic_anime'
export const DEFAULT_ASPECT = 'vertical_9_16' as const
export const DEFAULT_BACKEND_THEME = 'myth'
export const DEFAULT_BACKEND_GENRE = 'horror'
export const DEFAULT_BACKEND_LENGTH = 'medium'
