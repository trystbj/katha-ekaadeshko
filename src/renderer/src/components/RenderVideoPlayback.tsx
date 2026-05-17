import { useCallback, useState } from 'react'
import type { StoryScene } from '../types/story'
import { defaultVideoStudioDraft } from '../types/videoStudio'
import type { VideoStudioDraft } from '../types/videoStudio'
import { CinematicVideoPlayer } from './CinematicVideoPlayer'

type Props = {
  videoUrl: string
  scenes: StoryScene[]
  /** BCP-47-ish code from story bible (e.g. en, ne); initializes subtitle track menu. */
  storyLanguage: string
}

export function RenderVideoPlayback({ videoUrl, scenes, storyLanguage }: Props) {
  const [draft, setDraft] = useState(() => defaultVideoStudioDraft(''))

  const onDraftPatch = useCallback((partial: Partial<VideoStudioDraft>) => {
    setDraft((d) => ({
      ...d,
      ...partial,
      recipe: { ...d.recipe, ...(partial.recipe ?? {}) },
      tiktok: { ...d.tiktok, ...(partial.tiktok ?? {}) }
    }))
  }, [])

  return (
    <CinematicVideoPlayer
      videoUrl={videoUrl}
      scenes={scenes}
      storyLanguage={storyLanguage}
      draft={draft}
      onDraftPatch={onDraftPatch}
    />
  )
}
