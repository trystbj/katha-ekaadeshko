export type {
  RegenerationTarget,
  CopilotPatchDomain,
  CopilotScenePatch,
  SceneCreatorOverride,
  CreatorHistoryEntry,
  CreatorPreset,
  QualitySuggestion,
  CreatorStudioProjectState,
  ExportFormatHint
} from '../../../../core/studio/creatorStudioTypes'

export function defaultCreatorStudioState(): import('../../../../core/studio/creatorStudioTypes').CreatorStudioProjectState {
  return {
    version: 1,
    sceneOverrides: {},
    history: [],
    historyIndex: -1,
    presets: []
  }
}
