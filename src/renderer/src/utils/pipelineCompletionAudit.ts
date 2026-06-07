import type { AssetRef, ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { sceneUrlForIndex } from './sceneAssetMap'
import {
  auditEpisodeSceneImages,
  episodeSceneScriptComplete,
  isPlaceholderSceneUrl,
  validateSceneImageUrl
} from './sceneImageValidationClient'
import {
  countCompletedSceneImages,
  patchSceneImageStatusFields,
  sceneImageUrlForScene,
  sceneTitleForIndex
} from './sceneImageStatus'

export const EMERGENCY_SCENE_PROMPT_TAG = '[emergency_fallback]'

export type NarrationPipelineState = 'none' | 'text_only' | 'audio_ready'

export type SceneImagePipelineStatus =
  | 'ok'
  | 'missing'
  | 'black'
  | 'failed'
  | 'placeholder'

export type ScenePipelineRow = {
  scene: number
  script: 'ok' | 'missing'
  image: SceneImagePipelineStatus
  preview: 'ok' | 'failed'
  narrationText: 'ok' | 'missing'
}

export type PipelineValidationReport = {
  episodeNumber: number
  scenes: ScenePipelineRow[]
  narrationState: NarrationPipelineState
  charactersReady: boolean
  promptsReady: boolean
  validatedImageCount: number
  totalScenes: number
  animationReady: boolean
  exportReady: boolean
  blockers: string[]
  healthPercent: number
  updatedAt: string
}

export function sceneAssetForIndex(
  project: ProjectState | null | undefined,
  sceneIndex: number
): AssetRef | undefined {
  if (!project?.assets?.length || !sceneIndex) return undefined
  const key = `scene:${sceneIndex}`
  return project.assets.find((a) => a.kind === 'scene' && a.key === key)
}

export function isEmergencySceneAsset(asset: AssetRef | undefined): boolean {
  if (!asset) return false
  const prompt = String(asset.prompt || '')
  if (prompt.includes(EMERGENCY_SCENE_PROMPT_TAG)) return true
  const url = String(asset.url || '')
  return isPlaceholderSceneUrl(url)
}

export function deriveNarrationPipelineState(episode: StoryEpisode | undefined): NarrationPipelineState {
  if (!episode) return 'none'
  const hasAudio = Boolean(episode.narrationAudioUrl?.trim())
  if (hasAudio) return 'audio_ready'
  const scenes = episode.scenes ?? []
  const hasText = scenes.some((s) => sceneNarrationText(s).length > 0)
  return hasText ? 'text_only' : 'none'
}

export function sceneNarrationText(scene: StoryScene): string {
  return String(scene.narrationText || scene.narration || scene.text || '').trim()
}

export function sceneHasVisualPrompt(scene: StoryScene): boolean {
  return String(scene.visualDescription || scene.visual_description || '').trim().length > 0
}

function charactersReady(project: ProjectState): boolean {
  return Boolean(
    project.bible?.characters?.some((c) => Boolean(c.baseImageUrl)) ||
      (project.characterIdentityMemory?.length ?? 0) > 0 ||
      (project.assets ?? []).some((a) => a.kind === 'character' && a.url)
  )
}

function sceneScriptOk(scene: StoryScene): boolean {
  return sceneNarrationText(scene).length > 0 || sceneHasVisualPrompt(scene)
}

export function formatExportBlockers(
  report: PipelineValidationReport,
  episode?: StoryEpisode
): string[] {
  const errors: string[] = []
  if (!report.charactersReady) errors.push('Characters are not generated yet.')
  if (!report.promptsReady) errors.push('Scene prompts are incomplete.')

  const missingImages = report.scenes.filter((s) => s.image === 'missing').map((s) => s.scene)
  const badImages = report.scenes.filter(
    (s) => s.image === 'black' || s.image === 'failed' || s.image === 'placeholder'
  )
  const badPreview = report.scenes.filter((s) => s.preview === 'failed').map((s) => s.scene)
  const missingNarration = report.scenes.filter((s) => s.narrationText === 'missing').map((s) => s.scene)

  const imageProblems = [...new Set([...missingImages, ...badImages.map((s) => s.scene), ...badPreview])]
  const hasImageIssue = imageProblems.length > 0
  const hasAudioIssue = report.narrationState !== 'audio_ready'

  if (hasImageIssue && hasAudioIssue) {
    const sceneLabel = formatSceneBlockerLabel(episode, imageProblems[0])
    errors.push(`Cannot generate video: missing scene image (${sceneLabel}) and narration audio.`)
  } else if (hasImageIssue) {
    if (imageProblems.length === 1) {
      const label = formatSceneBlockerLabel(episode, imageProblems[0])
      errors.push(`Cannot generate video: missing scene image (${label}).`)
    } else {
      errors.push(
        `Cannot generate video: missing scene images (${imageProblems.map((ix) => formatSceneBlockerLabel(episode, ix)).join(', ')}).`
      )
    }
  } else if (hasAudioIssue) {
    errors.push('Cannot generate video: narration audio missing.')
  }

  if (missingNarration.length && !errors.some((e) => e.toLowerCase().includes('narration'))) {
    errors.push('Narration text missing for one or more scenes.')
  }

  if (!errors.length && report.blockers.length) return [...report.blockers]
  return errors
}

function formatSceneBlockerLabel(episode: StoryEpisode | undefined, sceneIndex: number): string {
  return sceneTitleForIndex(episode, sceneIndex)
}

function imageStatusFromAudit(
  sceneIndex: number,
  url: string | undefined,
  asset: AssetRef | undefined,
  imageAudit: Awaited<ReturnType<typeof auditEpisodeSceneImages>>
): { image: SceneImagePipelineStatus; preview: 'ok' | 'failed' } {
  if (isEmergencySceneAsset(asset)) {
    return { image: 'placeholder', preview: 'failed' }
  }
  if (!url) {
    return { image: 'missing', preview: 'failed' }
  }
  if (isPlaceholderSceneUrl(url)) {
    return { image: 'placeholder', preview: 'failed' }
  }
  const row = imageAudit.rows.find((r) => r.scene === sceneIndex)
  if (!row?.ok) {
    if (imageAudit.black.includes(sceneIndex)) return { image: 'black', preview: 'failed' }
    return { image: 'failed', preview: 'failed' }
  }
  return { image: 'ok', preview: 'ok' }
}

export function computePipelineHealthPercent(report: Omit<PipelineValidationReport, 'healthPercent' | 'updatedAt'>): number {
  if (report.animationReady) return 100
  const total = Math.max(1, report.totalScenes)
  const validatedRatio = report.validatedImageCount / total
  let score = 0
  if (report.totalScenes > 0) score += 12
  if (report.charactersReady) score += 14
  if (report.promptsReady) score += 14
  score += validatedRatio * 34
  const narrTextOk =
    report.scenes.filter((s) => s.narrationText === 'ok').length / total
  score += narrTextOk * 13
  if (report.narrationState === 'audio_ready') score += 13
  else if (report.narrationState === 'text_only') score += 5
  return Math.round(Math.min(99, Math.max(0, score)))
}

export async function auditEpisodePipelineCompletion(
  project: ProjectState,
  episodeNumber: number
): Promise<PipelineValidationReport> {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  const scenes = ep?.scenes ?? []
  const imageAudit = await auditEpisodeSceneImages(project, episodeNumber)
  const scriptCheck = episodeSceneScriptComplete(project, episodeNumber)
  const charsReady = charactersReady(project)
  const promptsReady =
    scenes.length > 0 && scenes.every((s) => sceneHasVisualPrompt(s) || sceneNarrationText(s).length > 0)
  const narrationState = deriveNarrationPipelineState(ep)

  const sceneRows: ScenePipelineRow[] = []
  let validatedImageCount = 0

  for (const s of scenes) {
    const url = sceneUrlForIndex(project, s.index)
    const asset = sceneAssetForIndex(project, s.index)
    const { image, preview } = imageStatusFromAudit(s.index, url, asset, imageAudit)
    if (image === 'ok' && preview === 'ok') validatedImageCount += 1
    sceneRows.push({
      scene: s.index,
      script: sceneScriptOk(s) ? 'ok' : 'missing',
      image,
      preview,
      narrationText: sceneNarrationText(s).length > 0 ? 'ok' : 'missing'
    })
  }

  const blockers: string[] = []
  if (!project.bible) blockers.push('Story not generated.')
  if (!charsReady) blockers.push('Characters missing.')
  if (!promptsReady) blockers.push('Scene prompts missing.')
  if (!scriptCheck.complete) blockers.push('Scene script incomplete.')
  if (validatedImageCount < scenes.length) blockers.push('Validated scene images incomplete.')
  if (narrationState !== 'audio_ready') blockers.push('Narration audio missing.')
  if (sceneRows.some((r) => r.narrationText === 'missing')) blockers.push('Narration text missing.')

  const animationReady =
    Boolean(project.bible) &&
    scenes.length > 0 &&
    charsReady &&
    promptsReady &&
    scriptCheck.complete &&
    validatedImageCount === scenes.length &&
    narrationState === 'audio_ready' &&
    sceneRows.every((r) => r.narrationText === 'ok')

  const draft: Omit<PipelineValidationReport, 'healthPercent' | 'updatedAt'> = {
    episodeNumber,
    scenes: sceneRows,
    narrationState,
    charactersReady: charsReady,
    promptsReady,
    validatedImageCount,
    totalScenes: scenes.length,
    animationReady,
    exportReady: animationReady,
    blockers: animationReady ? [] : blockers
  }

  const counts = countCompletedSceneImages(
    { ...project, pipelineValidationReport: { ...draft, healthPercent: 0, updatedAt: '' } },
    episodeNumber
  )
  if (counts.completed !== counts.total) {
    draft.animationReady = false
    draft.exportReady = false
  }

  return {
    ...draft,
    animationReady: draft.animationReady && counts.completed === counts.total,
    exportReady: draft.exportReady && counts.completed === counts.total,
    healthPercent: computePipelineHealthPercent(draft),
    updatedAt: new Date().toISOString()
  }
}

export function applyPipelineValidationToProject(
  project: ProjectState,
  report: PipelineValidationReport
): ProjectState {
  const epn = report.episodeNumber
  const failedIndices = report.scenes
    .filter((r) => r.image !== 'ok' || r.preview !== 'ok')
    .map((r) => r.scene)

  return {
    ...project,
    pipelineValidationReport: report,
    sceneImagesComplete: report.animationReady,
    sceneImageGenerationReport: {
      imagesGenerated: report.validatedImageCount,
      total: report.totalScenes,
      missingRepaired: project.sceneImageGenerationReport?.missingRepaired ?? 0,
      blackRepaired: project.sceneImageGenerationReport?.blackRepaired ?? 0,
      emergencyFilled: project.sceneImageGenerationReport?.emergencyFilled ?? 0,
      storyReadyForAnimation: report.animationReady,
      incompleteSceneIndices: failedIndices.length ? failedIndices : undefined,
      updatedAt: report.updatedAt
    },
    episodes: project.episodes.map((e) =>
      e.number !== epn
        ? e
        : {
            ...e,
            scenes: e.scenes.map((s) => {
              const row = report.scenes.find((r) => r.scene === s.index)
              if (!row) return s
              const imageOk = row.image === 'ok' && row.preview === 'ok'
              const url = sceneImageUrlForScene(project, s)
              return patchSceneImageStatusFields(
                {
                  ...s,
                  generationStatus: imageOk
                    ? report.narrationState === 'audio_ready'
                      ? 'complete'
                      : 'narration'
                    : 'image_failed'
                },
                {
                  imageStatus: imageOk ? 'completed' : row.image === 'missing' ? 'pending' : 'failed',
                  imageUrl: url,
                  imageError: imageOk ? undefined : row.image === 'black' ? 'Black or invalid image' : s.imageError
                }
              )
            })
          }
    ),
    storyboardPartial: !report.animationReady,
    missingSceneImageIndices: failedIndices.length ? failedIndices : undefined,
    updatedAt: report.updatedAt
  }
}
