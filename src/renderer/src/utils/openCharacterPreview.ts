import type { StoryCharacter } from '../types/story'

export type OpenCharacterPreviewFn = (character: StoryCharacter) => void

/** Live character preview — switch Main Display immediately without closing. */
export function openCharacterPreview(
  character: StoryCharacter,
  setCharacterPreviewId: (id: string | null) => void,
  setEmbeddedHeroOverride: (url: string | null) => void
) {
  const url = String(character.baseImageUrl || '').trim()
  setCharacterPreviewId(character.id)
  setEmbeddedHeroOverride(url || null)
  console.info('[katha:preview]', 'character_live_preview', {
    id: character.id,
    name: character.name,
    hasUrl: Boolean(url)
  })
}
