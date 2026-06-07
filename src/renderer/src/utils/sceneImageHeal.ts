import type { ProjectState } from '../types/story'
import {
  auditEpisodeSceneImages,
  episodeSceneScriptComplete,
  validateSceneImageUrl
} from './sceneImageValidationClient'
import { emergencySceneAssetsForIndices } from './sceneEmergencyFallback'
import {
  buildSceneAssetsFromPipeline,
  mergeProjectAssets,
  removeSceneAssetsForIndices,
  sceneUrlForIndex
} from './sceneAssetMap'
import type { PipelineImageRow } from './visualStreamRecovery'
import {
  applyPipelineValidationToProject,
  auditEpisodePipelineCompletion
} from './pipelineCompletionAudit'
import { filterPipelineImagesToScenes } from './sceneImageStatus'

export type SceneImageHealReport = {
  imagesGenerated: number
  total: number
  missingRepaired: number
  blackRepaired: number
  emergencyFilled: number
  storyReadyForAnimation: boolean
  incompleteSceneIndices: number[]
}

const MAX_HEAL_PASSES = 3

export async function healEpisodeSceneImages(opts: {
  project: ProjectState
  episodeNumber: number
  regenerateScenes: (sceneIndices: number[]) => Promise<PipelineImageRow[]>
  onPatch?: (project: ProjectState) => void
}): Promise<{ project: ProjectState; report: SceneImageHealReport }> {
  let project = opts.project
  const epn = opts.episodeNumber
  let missingRepaired = 0
  let blackRepaired = 0
  let emergencyFilled = 0

  const scriptCheck = episodeSceneScriptComplete(project, epn)

  for (let pass = 0; pass < MAX_HEAL_PASSES; pass++) {
    const audit = await auditEpisodeSceneImages(project, epn)
    if (!audit.allProblems.length) break

    const toFix = audit.allProblems
    project = removeSceneAssetsForIndices(project, toFix)
    opts.onPatch?.(project)

    let regenRows: PipelineImageRow[] = []
    try {
      regenRows = await opts.regenerateScenes(toFix)
    } catch (e) {
      console.warn('[katha:pipeline]', 'heal_regen_failed', {
        pass: pass + 1,
        message: e instanceof Error ? e.message : String(e)
      })
    }

    if (regenRows.length) {
      const allowed = new Set(toFix)
      const filteredRows = filterPipelineImagesToScenes(regenRows, allowed)
      const assets = buildSceneAssetsFromPipeline(filteredRows)
      project = { ...project, assets: mergeProjectAssets(project.assets, assets) }
      opts.onPatch?.(project)
      for (const row of regenRows) {
        const url = String(row.image_url || row.imageUrl || '')
        const scene = Number(row.scene) || 0
        if (!url || !scene) continue
        const v = await validateSceneImageUrl(url)
        if (v.ok) {
          if (audit.missing.includes(scene)) missingRepaired += 1
          if (audit.black.includes(scene)) blackRepaired += 1
        }
      }
    }

    const auditAfter = await auditEpisodeSceneImages(project, epn)
    if (!auditAfter.allProblems.length) break
  }

  const finalAudit = await auditEpisodeSceneImages(project, epn)
  if (finalAudit.allProblems.length) {
    const assets = emergencySceneAssetsForIndices(project, epn, finalAudit.allProblems)
    emergencyFilled = finalAudit.allProblems.length
    project = {
      ...project,
      assets: mergeProjectAssets(project.assets, assets),
      updatedAt: new Date().toISOString()
    }
    opts.onPatch?.(project)
  }

  const pipelineReport = await auditEpisodePipelineCompletion(project, epn)
  const patched = applyPipelineValidationToProject(project, pipelineReport)

  const report: SceneImageHealReport = {
    imagesGenerated: pipelineReport.validatedImageCount,
    total: pipelineReport.totalScenes,
    missingRepaired,
    blackRepaired,
    emergencyFilled,
    storyReadyForAnimation:
      pipelineReport.animationReady && emergencyFilled === 0 && scriptCheck.complete,
    incompleteSceneIndices: [
      ...new Set([
        ...scriptCheck.incompleteScenes,
        ...pipelineReport.scenes
          .filter((r) => r.image !== 'ok' || r.preview !== 'ok')
          .map((r) => r.scene)
      ])
    ]
  }

  return {
    project: {
      ...patched,
      sceneImageGenerationReport: {
        ...report,
        storyReadyForAnimation: report.storyReadyForAnimation,
        updatedAt: pipelineReport.updatedAt
      }
    },
    report
  }
}
