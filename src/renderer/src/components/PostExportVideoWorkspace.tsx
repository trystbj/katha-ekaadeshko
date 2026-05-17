import { useCallback, useEffect } from 'react'
import type { ProjectState } from '../types/story'
import type { VideoStudioDraft } from '../types/videoStudio'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'
import type { StoryScene } from '../types/story'
import { CinematicVideoPlayer } from './CinematicVideoPlayer'
import { VideoEditorPublishDock } from './VideoEditorPublishDock'
import { SubtitleStudioPanel } from './SubtitleStudioPanel'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import {
  DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID,
  isSubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import { useStudioStore } from '../store/useStudioStore'
import { LiveProductionBar } from './LiveProductionBar'
import { useLivePreviewSync } from '../realtime/useLivePreview'

type Props = {
  videoUrl: string
  scenes: StoryScene[]
  storyLanguage: string
  project: ProjectState
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  /** Marks this episode’s export step complete for sequential unlock (matches monitor selection). */
  episodeNumber?: number | null
}

export function PostExportVideoWorkspace({
  videoUrl,
  scenes,
  storyLanguage,
  project,
  patchProject,
  episodeNumber = null
}: Props) {
  const liveRevision = useLivePreviewSync()
  const vs = ensureVideoStudio(project)

  useEffect(() => {
    const epn = episodeNumber
    if (!videoUrl?.trim() || epn == null || epn < 1) return
    patchProject((p) => {
      let changed = false
      const episodes = p.episodes.map((e) => {
        if (e.number !== epn) return e
        if (e.videoExportComplete) return e
        changed = true
        return { ...e, videoExportComplete: true }
      })
      if (!changed) return p
      return { ...p, episodes, updatedAt: new Date().toISOString() }
    })
  }, [videoUrl, episodeNumber, patchProject])

  const patchDraft = useCallback(
    (partial: Partial<VideoStudioDraft>) => {
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          videoStudio: {
            ...base,
            draft: {
              ...base.draft,
              ...partial,
              recipe: { ...base.draft.recipe, ...(partial.recipe ?? {}) },
              tiktok: { ...base.draft.tiktok, ...(partial.tiktok ?? {}) },
              publish: partial.publish ? { ...base.draft.publish, ...partial.publish } : base.draft.publish
            }
          }
        }
      })
    },
    [patchProject]
  )

  const patchSubtitleStudio = useCallback(
    (partial: Partial<SubtitleStudioState>) => {
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        const next = normalizeSubtitleStudio({
          ...base.subtitleStudio,
          ...partial,
          advanced: { ...base.subtitleStudio.advanced, ...(partial.advanced ?? {}) }
        })
        const z = useStudioStore.getState()
        z.setPlaybackSubtitlesOn(next.subtitlesOn)
        z.setSubtitlePlaybackPresetId(
          isSubtitlePlaybackPresetId(next.playbackPresetId) ? next.playbackPresetId : DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
        )
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          videoStudio: { ...base, subtitleStudio: next }
        }
      })
    },
    [patchProject]
  )

  useEffect(() => {
    const st = ensureVideoStudio(project).subtitleStudio
    const z = useStudioStore.getState()
    z.setPlaybackSubtitlesOn(st.subtitlesOn)
    z.setSubtitlePlaybackPresetId(
      isSubtitlePlaybackPresetId(st.playbackPresetId) ? st.playbackPresetId : DEFAULT_SUBTITLE_PLAYBACK_PRESET_ID
    )
  }, [videoUrl, project])

  const cinematicDirectorPlan =
    episodeNumber != null
      ? project.episodes.find((e) => e.number === episodeNumber)?.cinematicDirectorPlan
      : project.episodes[0]?.cinematicDirectorPlan

  return (
    <div className="post-export-workspace">
      <LiveProductionBar />
      <CinematicVideoPlayer
        videoUrl={videoUrl}
        scenes={scenes}
        storyLanguage={storyLanguage}
        draft={vs.draft}
        onDraftPatch={patchDraft}
        subtitleStudio={vs.subtitleStudio}
        onSubtitleStudioPatch={patchSubtitleStudio}
        cinematicDirectorPlan={cinematicDirectorPlan ?? null}
        liveTimelineRevision={liveRevision}
      />
      <SubtitleStudioPanel scenes={scenes} studio={vs.subtitleStudio} patchSubtitleStudio={patchSubtitleStudio} />
      <VideoEditorPublishDock
        project={project}
        scenes={scenes}
        patchProject={patchProject}
        videoUrl={videoUrl}
        episodeNumber={episodeNumber}
      />
    </div>
  )
}
