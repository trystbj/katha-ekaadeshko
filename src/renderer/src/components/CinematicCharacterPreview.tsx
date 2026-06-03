import { useMemo } from 'react'
import type { StoryCharacter } from '../types/story'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { PreviewStage } from './PreviewStage'

type Props = {
  characters: StoryCharacter[]
  activeCharacterId: string
  seasonId: StudioSeasonId
  busy?: boolean
  onCharacterIndexChange: (index: number) => void
}

/** Character main display — same PreviewStage system as scenes. */
export function CinematicCharacterPreview({
  characters,
  activeCharacterId,
  seasonId,
  busy = false,
  onCharacterIndexChange
}: Props) {
  const activeIx = Math.max(
    0,
    characters.findIndex((c) => c.id === activeCharacterId)
  )
  const portraitUrls = useMemo(
    () => characters.map((c) => c.baseImageUrl ?? ''),
    [characters]
  )
  const hero = characters[activeIx]?.baseImageUrl ?? null

  return (
    <div className="cinematic-main-preview cinematic-main-preview--character storyboard-workspace storyboard-workspace--preview-focus studio-mock-preview-wrap workspace-premium__stage">
      <div className="cinematic-main-preview__stage storyboard-workspace__stage-wrap">
        <PreviewStage
          key={activeCharacterId}
          sectionClassName="cinematic-main-preview__preview-stage storyboard-workspace__preview-stage preview-stage--maximize"
          cinematicMedia
          instantHeroSwitch
          seasonId={seasonId}
          sceneUrls={portraitUrls}
          heroUrl={hero}
          carouselIndex={activeIx}
          onCarouselIndexChange={onCharacterIndexChange}
          busy={busy}
          hideIdleThumbStrip
          hideSceneCaption
          hideCastLayer
          hideHeading
          showSceneNav={characters.length > 1}
          sceneCount={characters.length}
          idleBlank={!hero}
        />
      </div>
    </div>
  )
}
