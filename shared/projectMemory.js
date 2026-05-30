/**
 * Long-term project memory — studio preferences, export, cast, emotional patterns.
 */

/**
 * @param {object} project partial ProjectState
 * @param {object} [episode]
 * @param {object} [pipelineMeta]
 */
export function buildProjectMemoryPatch(project, episode, pipelineMeta = {}) {
  const plan = episode?.cinematicDirectorPlan || pipelineMeta?.cinematicDirectorPlan
  const orch = plan?.orchestration?.premiumStudio || plan?.orchestration
  const vs = project?.videoStudio

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    subtitlePreferences: vs?.subtitleStudio
      ? {
          positionXPct: vs.subtitleStudio.positionXPct,
          positionYPct: vs.subtitleStudio.positionYPct,
          playbackPresetId: vs.subtitleStudio.playbackPresetId,
          karaokeMode: vs.subtitleStudio.karaokeMode
        }
      : null,
    visualStyle: {
      styleId: project?.bible?.styleId,
      customVisualPrompt: project?.bible?.customVisualPrompt
    },
    narrator: {
      narratorId: project?.bible?.narratorId,
      language: project?.bible?.language,
      autoVoiceDirector: project?.narration?.autoVoiceDirector
    },
    exportPreferences: {
      cinematicExportPreset:
        vs?.publish?.cinematicExportPreset || 'youtube_shorts_cinematic',
      exportQualityMode: vs?.publish?.exportQualityMode || 'maximum'
    },
    characterMemory: project?.characterIdentityMemory || [],
    emotionalTonePattern: orch?.attentionPlan?.globalTempo || 'balanced',
    cinematicPreferences: {
      bookendStyle: plan?.cinematicBookends?.style,
      shortFormHooks: orch?.shortForm?.hooks?.length ?? 0
    },
    storyMemorySnapshot: episode?.storyMemorySnapshot || pipelineMeta?.storyMemorySnapshot,
    qualityScore: orch?.qualityReport?.score ?? pipelineMeta?.qualityReport?.score
  }
}

/**
 * Merge patch into creatorPreferences for next generation.
 */
export function mergeProjectMemoryIntoPreferences(creatorPreferences, projectMemory) {
  const base =
    creatorPreferences && typeof creatorPreferences === 'object' ? { ...creatorPreferences } : {}
  return {
    ...base,
    projectMemory,
    studioContinuity: true
  }
}
