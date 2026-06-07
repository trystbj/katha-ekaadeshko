import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import { drainSseBuffer } from '../utils/parseSseStream'
import { buildSceneAssetsFromPipeline, mergeProjectAssets } from '../utils/sceneAssetMap'
import { withVisualGenerationComplete, withVisualGenerationStarted } from '../utils/productionWorkflow'
import { buildVisualPipelinePayload } from '../utils/buildVisualPipelinePayload'
import { withStoryboardReady } from '../utils/storyboardWorkflow'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import { attachSceneGenerationStatuses } from '../utils/scenePipelineStatus'
import { inferCountryFromLanguageCode } from '../utils/inferCountryFromLanguage'
import { formatApiError, readHttpErrorResponse } from '../utils/formatApiError'
import { markScenesQueued } from '../utils/sceneGenerationLock'
import { applySceneImagePatch, markSceneGenerating, markSceneFailed } from '../utils/applySceneImagePatch'
import { sceneIndexFromPipelineRow } from '../utils/sceneAssetMap'
import {
  hasUsablePipelineImages,
  mergePipelineImageRows,
  pipelineImagesFromStore,
  type PipelineImageRow
} from '../utils/visualStreamRecovery'
import {
  runVisualGenerationHealthCheck,
  validateVisualGenerationPreflight
} from '../utils/visualGenerationPreflight'
import {
  classifyVisualGenerationError,
  formatVisualFailureForUser
} from '../utils/visualGenerationErrors'
import { tryAcquireVisualBatchLock, releaseVisualBatchLock } from '../utils/visualBatchLock'
import type { VisualSceneDiagnostic } from '../types/visualGeneration'
import { healEpisodeSceneImages } from '../utils/sceneImageHeal'
import {
  applyPipelineValidationToProject,
  auditEpisodePipelineCompletion
} from '../utils/pipelineCompletionAudit'
import {
  buildSceneImageRegenerationQueue,
  computeLiveSceneImageCounts,
  filterPipelineImagesToScenes,
  formatSceneImageIncompleteMessage,
  getFailedSceneIndices,
  getScenesNeedingImageRegeneration,
  isSceneImageCompleted,
  syncEpisodeSceneImageStatuses
} from '../utils/sceneImageStatus'
import { applyEmergencyFallbackForFailedScenes } from '../utils/applyEmergencySceneFallback'

type VisualGenResult = {
  images: PipelineImageRow[]
  audio: { scene?: string | number; audio_url?: string }[]
}

const STREAM_MAX_ATTEMPTS = Number(import.meta.env.VITE_VISUAL_STREAM_RETRIES || 4) || 4

function mergeCollectedImages(a: PipelineImageRow[], b: PipelineImageRow[]): PipelineImageRow[] {
  let merged = [...a]
  for (const row of b) {
    const sceneNum = Number(row.scene) || 0
    if (!sceneNum) continue
    merged = mergePipelineImageRows(merged, row, sceneNum)
  }
  return merged
}

function mergePortraitMetadata(
  project: import('../types/story').ProjectState,
  bibleCharacters: { name?: string; baseImageUrl?: string; leonardoSeed?: number }[] | undefined
) {
  if (!project.bible || !bibleCharacters?.length) return project
  const byName = new Map(
    bibleCharacters.map((c) => [String(c.name || '').trim().toLowerCase(), c])
  )
  return {
    ...project,
    bible: {
      ...project.bible,
      characters: project.bible.characters.map((ch) => {
        const hit = byName.get(ch.name.trim().toLowerCase())
        if (!hit?.baseImageUrl) return ch
        return {
          ...ch,
          baseImageUrl: hit.baseImageUrl,
          ...(hit.leonardoSeed != null ? { leonardoSeed: hit.leonardoSeed } : {})
        }
      })
    }
  }
}

export function useVisualGeneration() {
  const uiText = useUiText()
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)

  const generateVisuals = useCallback(
    async (opts?: {
      sceneIndices?: number[]
      episodeNumber?: number
      forceRegenerate?: boolean
      /** Internal guard — auto-retry last missing scene once. */
      _autoSingleRetry?: boolean
    }) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
      const p = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
      if (!p?.bible) return
      const selectedEp = useStudioStore.getState().selectedEpisode
      const epn =
        opts?.episodeNumber ??
        (selectedEp != null ? selectedEp : null) ??
        p.episodes.find((e) => e.scenes?.length)?.number ??
        p.episodes[0]?.number ??
        1
      const ep = p.episodes.find((e) => e.number === epn) ?? p.episodes[0]
      if (!ep) return

      const payload = buildVisualPipelinePayload(p, epn)
      if (!payload) {
        setError(uiText('visualGenMissingScript'))
        return
      }

      const preflight = validateVisualGenerationPreflight(p, epn)
      if (!preflight.ok) {
        console.warn('[katha:pipeline]', 'visual_preflight_failed', { errors: preflight.errors })
        const detail = preflight.errors.includes('script_missing')
          ? uiText('visualErrScriptMissing')
          : preflight.sceneIssues?.length
            ? uiText('visualErrScenePromptMissing', { scene: String(preflight.sceneIssues[0]) })
            : preflight.errors.join(', ')
        setError(formatVisualFailureForUser('no_prompt_generated', detail, uiText))
        return
      }

      const healthUrl = import.meta.env.VITE_BACKEND_URL
        ? `${String(import.meta.env.VITE_BACKEND_URL).replace(/\/+$/, '')}/api/health`
        : '/api/health'
      const health = await runVisualGenerationHealthCheck(healthUrl)
      if (!health.ok) {
        console.warn('[katha:pipeline]', 'visual_health_failed', health)
        const code = health.errors.includes('leonardo_unavailable')
          ? 'leonardo_disabled'
          : health.errors.includes('network_unavailable')
            ? 'network_error'
            : 'missing_api_key'
        setError(formatVisualFailureForUser(code, health.errors.join(', '), uiText))
        return
      }

      if (!tryAcquireVisualBatchLock(p.id)) {
        console.info('[katha:pipeline]', 'visual_batch_skip_duplicate', { projectId: p.id })
        return
      }

      const diagnostics: VisualSceneDiagnostic[] = []
      const upsertDiagnostic = (row: VisualSceneDiagnostic) => {
        const ix = diagnostics.findIndex((d) => d.scene === row.scene)
        if (ix >= 0) diagnostics[ix] = { ...diagnostics[ix], ...row }
        else diagnostics.push(row)
        useStudioStore.getState().setVisualDiagnostics([...diagnostics])
      }
      useStudioStore.getState().setVisualDiagnostics([])

      const targetScenes = buildSceneImageRegenerationQueue(p, epn, {
        sceneIndices: opts?.sceneIndices,
        forceRegenerate: opts?.forceRegenerate
      })
      const explicitTargetMode = Boolean(opts?.sceneIndices?.length || opts?.forceRegenerate)
      const targetSet = new Set(targetScenes)

      if (!targetScenes.length) {
        console.info('[katha:pipeline]', 'visual_skip_all_completed', { episodeNumber: epn })
        return
      }

      console.info('[katha:pipeline]', 'visual_regen_queue', {
        episodeNumber: epn,
        targetScenes,
        explicit: explicitTargetMode
      })

      setBusy('generating')
      setError(null)
      useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
        const queued = markScenesQueued(withVisualGenerationStarted(cur), epn, targetScenes)
        return queued
      })

      const st = useStudioStore.getState()
      const ac = new AbortController()
      useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, ac)

      try {
        const runVisualStream = async (
          fetchBody: Record<string, unknown>,
          collected: PipelineImageRow[]
        ): Promise<VisualGenResult & { metadata?: Record<string, unknown> }> => {
          const r = await fetch('/api/jobs-generate-visuals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify(fetchBody)
          })
          if (!r.ok) {
            const httpMsg = await readHttpErrorResponse(r, uiText('visualGenNoResult'))
            const { code } = classifyVisualGenerationError(httpMsg)
            throw new Error(formatVisualFailureForUser(code, httpMsg, uiText))
          }
          if (!r.body) throw new Error('No response body')

          const reader = r.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          let streamOut: (VisualGenResult & { metadata?: Record<string, unknown> }) | null = null
          let sseImages = [...collected]

          while (true) {
            const { value, done } = await reader.read()
            if (value) buf += dec.decode(value, { stream: true })
            if (done) {
              buf += dec.decode()
              break
            }
            const drained = drainSseBuffer(buf)
            buf = drained.rest
            for (const evt of drained.events) {
              if (evt.type === 'scene_image' && evt.image) {
                const imageRow = evt.image as PipelineImageRow
                const sceneNum = sceneIndexFromPipelineRow(imageRow, Number(evt.scene) || 1)
                const failed =
                  Boolean(evt.failed) ||
                  imageRow.status === 'failed' ||
                  imageRow.status === 'placeholder'
                const diag = evt.diagnostic as VisualSceneDiagnostic | undefined
                if (diag) upsertDiagnostic(diag)
                if (failed) {
                  useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) =>
                    markSceneFailed(
                      cur,
                      epn,
                      sceneNum,
                      String(imageRow.error || diag?.errorMessage || evt.message || '')
                    )
                  )
                } else {
                  sseImages = mergePipelineImageRows(sseImages, imageRow, sceneNum)
                  useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
                    if (!cur.bible) return cur
                    if (
                      explicitTargetMode &&
                      !targetSet.has(sceneNum) &&
                      isSceneImageCompleted(cur, epn, sceneNum)
                    ) {
                      console.info('[katha:pipeline]', 'skip_sse_patch_locked_scene', { scene: sceneNum })
                      return cur
                    }
                    return applySceneImagePatch(cur, epn, imageRow, sceneNum)
                  })
                }
                console.info('[katha:pipeline]', failed ? 'scene_failed_sse' : 'scene_image_ok', {
                  scene: sceneNum,
                  url: String(imageRow.image_url || imageRow.imageUrl || '').slice(0, 120)
                })
                const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
                useStudioStore.getState().setWorkspaceJob(workspaceIx, {
                  id: stJob?.id || 'visuals',
                  stage: 'scene_complete',
                  progress: Number(evt.progress || 0),
                  log: []
                })
              } else if (evt.type === 'progress') {
                const stage = String(evt.stage || '')
                const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
                useStudioStore.getState().setWorkspaceJob(workspaceIx, {
                  id: stJob?.id || 'visuals',
                  stage,
                  progress: Number(evt.progress || 0),
                  log: []
                })
                if (stage === 'scene_generating' && evt.scene != null) {
                  const sceneNum = Number(evt.scene)
                  useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) =>
                    markSceneGenerating(cur, epn, sceneNum)
                  )
                }
              } else if (evt.type === 'result') {
                streamOut = evt.result as VisualGenResult & { metadata?: Record<string, unknown> }
              } else if (evt.type === 'scene_failed') {
                const sceneNum = Number(evt.scene) || 0
                const diag = evt.diagnostic as VisualSceneDiagnostic | undefined
                if (diag) upsertDiagnostic({ ...diag, status: 'failed' })
                else if (sceneNum) {
                  upsertDiagnostic({
                    scene: sceneNum,
                    promptLength: 0,
                    provider: 'leonardo',
                    status: 'failed',
                    retryCount: 0,
                    durationMs: 0,
                    errorMessage: String(evt.message || '')
                  })
                }
                if (sceneNum) {
                  useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) =>
                    markSceneFailed(cur, epn, sceneNum)
                  )
                }
                console.warn('[katha:pipeline]', 'scene_failed_sse', { scene: sceneNum, message: evt.message })
              } else if (evt.type === 'error') {
                const raw = formatApiError(evt.error, uiText('visualGenNoResult'))
                const { code } = classifyVisualGenerationError(raw)
                if (!sseImages.length) {
                  throw new Error(formatVisualFailureForUser(code, raw, uiText))
                }
                console.warn('[katha:pipeline]', 'visual_stream_error_partial', { code, raw })
              }
            }
          }
          const tail = drainSseBuffer(buf)
          for (const evt of tail.events) {
            if (evt.type === 'scene_image' && evt.image) {
              const imageRow = evt.image as PipelineImageRow
              const sceneNum = sceneIndexFromPipelineRow(imageRow, Number(evt.scene) || 1)
              const failed =
                Boolean(evt.failed) ||
                imageRow.status === 'failed' ||
                imageRow.status === 'placeholder'
              const diag = evt.diagnostic as VisualSceneDiagnostic | undefined
              if (diag) upsertDiagnostic(diag)
              if (failed) {
                useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) =>
                  markSceneFailed(
                    cur,
                    epn,
                    sceneNum,
                    String(imageRow.error || diag?.errorMessage || '')
                  )
                )
              } else {
                sseImages = mergePipelineImageRows(sseImages, imageRow, sceneNum)
                useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
                  if (!cur.bible) return cur
                  if (
                    explicitTargetMode &&
                    !targetSet.has(sceneNum) &&
                    isSceneImageCompleted(cur, epn, sceneNum)
                  ) {
                    return cur
                  }
                  return applySceneImagePatch(cur, epn, imageRow, sceneNum)
                })
              }
            } else if (evt.type === 'scene_failed') {
              const sceneNum = Number(evt.scene) || 0
              if (sceneNum) {
                useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) =>
                  markSceneFailed(cur, epn, sceneNum)
                )
              }
            } else if (evt.type === 'result') {
              streamOut = evt.result as VisualGenResult & { metadata?: Record<string, unknown> }
            } else if (evt.type === 'error') {
              const raw = formatApiError(evt.error, uiText('visualGenNoResult'))
              const { code } = classifyVisualGenerationError(raw)
              if (!sseImages.length) throw new Error(formatVisualFailureForUser(code, raw, uiText))
            }
          }

          if (!streamOut && sseImages.length) {
            streamOut = { images: sseImages, audio: [], metadata: { recoveredFromSse: true } }
          }
          if (!streamOut) {
            const draft = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
            const fromStore = draft ? pipelineImagesFromStore(draft, ep.scenes) : []
            if (fromStore.length) {
              streamOut = { images: fromStore, audio: [], metadata: { recoveredFromStore: true } }
            }
          }
          if (!streamOut) {
            const { code } = classifyVisualGenerationError('stream_empty_images')
            throw new Error(formatVisualFailureForUser(code, undefined, uiText))
          }

          const mergedResultImages = [...(streamOut.images ?? [])]
          for (const row of sseImages) {
            const sceneNum = sceneIndexFromPipelineRow(row, Number(row.scene) || 0)
            if (!sceneNum) continue
            const ix = mergedResultImages.findIndex((r) => Number(r.scene) === sceneNum)
            if (ix >= 0) mergedResultImages[ix] = row
            else mergedResultImages.push(row)
          }
          const finalImages = hasUsablePipelineImages(mergedResultImages)
            ? mergedResultImages
            : hasUsablePipelineImages(sseImages)
              ? sseImages
              : mergedResultImages
          return { ...streamOut, images: finalImages }
        }

        const baseBody = {
          story: payload.story,
          script: payload.script,
          sceneIndices: targetScenes,
          skipCharacterPortraits: true,
          performancePreferLow: true,
          aspectMode: p.bible.aspectMode,
          styleId: p.bible.styleId,
          ...(p.bible.styleId === 'custom' ? { customVisualPrompt: p.bible.customVisualPrompt } : {}),
          genre: st.backendGenre,
          theme: p.bible.concept,
          country: inferCountryFromLanguageCode(p.bible.language),
          storyLanguage: p.bible.language,
          setting: p.bible.concept,
          screenplayLanguage: 'en',
          projectId: p.id,
          narratorId: p.bible.narratorId,
          characterReference: p.characterReference,
          bibleCharacters: p.bible.characters.map((c) => ({
            name: c.name,
            gender: c.gender,
            age: c.age,
            appearance: c.appearance || c.visualIdentity,
            visualIdentity: c.visualIdentity,
            referenceImages: c.referenceImages,
            baseImageUrl: c.baseImageUrl,
            characterDNA: (c as { characterDNA?: Record<string, unknown> }).characterDNA
          })),
          ...(p.storyBible ? { storyBible: p.storyBible } : {}),
          ...(p.productionDirectives ? { productionDirectives: p.productionDirectives } : {}),
          generationMode: p.productionDirectives?.generationMode || 'cinematic',
          ...(p.characterVisualLocks?.length ? { characterVisualLocks: p.characterVisualLocks } : {}),
          ...(p.masterStoryContext ? { masterStoryContext: p.masterStoryContext } : {}),
          ...(p.productionMemory ? { priorMemorySummary: JSON.stringify(p.productionMemory).slice(0, 2200) } : {})
        }

        let collected: PipelineImageRow[] = []
        let out: (VisualGenResult & { metadata?: Record<string, unknown> }) | null = null
        let streamAttempt = 0
        let lastStreamError: unknown = null

        while (streamAttempt < STREAM_MAX_ATTEMPTS) {
          streamAttempt += 1
          try {
            const attemptOut = await runVisualStream(baseBody, collected)
            collected = mergeCollectedImages(collected, attemptOut.images ?? [])
            if (hasUsablePipelineImages(attemptOut.images) || hasUsablePipelineImages(collected)) {
              out = {
                ...attemptOut,
                images: hasUsablePipelineImages(attemptOut.images) ? attemptOut.images : collected
              }
              break
            }
            lastStreamError = new Error('stream_empty_images')
            console.warn('[katha:pipeline]', 'visual_stream_empty', { attempt: streamAttempt })
          } catch (e) {
            lastStreamError = e
            const draft = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
            collected = draft ? pipelineImagesFromStore(draft, ep.scenes) : collected
            if (hasUsablePipelineImages(collected)) {
              out = { images: collected, audio: [], metadata: { recoveredAfterError: true } }
              break
            }
            if (streamAttempt >= STREAM_MAX_ATTEMPTS) throw e
            console.warn('[katha:pipeline]', 'visual_stream_retry', { attempt: streamAttempt })
          }
        }

        if (!out && hasUsablePipelineImages(collected)) {
          out = { images: collected, audio: [], metadata: { recoveredFromCollected: true } }
        }
        if (!out) {
          console.error('[katha:pipeline]', 'visual_stream_exhausted', { lastStreamError })
          const classified = classifyVisualGenerationError(lastStreamError)
          throw new Error(formatVisualFailureForUser(classified.code, classified.message, uiText))
        }

        let batchGuard = 0
        let remaining = (out.metadata?.visualBatch as { remainingSceneIndices?: number[] } | undefined)
          ?.remainingSceneIndices
        if (explicitTargetMode) {
          remaining = remaining?.filter((ix) => targetSet.has(ix))
        }
        while (remaining?.length && batchGuard < 12) {
          batchGuard += 1
          const next = await runVisualStream({ ...baseBody, sceneIndices: remaining }, out.images ?? [])
          out = {
            images: [...(out.images ?? []), ...(next.images ?? [])],
            audio: next.audio?.length ? next.audio : out.audio,
            metadata: next.metadata
          }
          remaining = (next.metadata?.visualBatch as { remainingSceneIndices?: number[] } | undefined)
            ?.remainingSceneIndices
          if (explicitTargetMode) {
            remaining = remaining?.filter((ix) => targetSet.has(ix))
          }
        }

        let mergedImages = filterPipelineImagesToScenes(
          [...(out.images ?? [])],
          explicitTargetMode ? targetSet : new Set(ep.scenes.map((s) => s.index))
        )
        const narrationAudioUrl = (out.audio ?? [])
          .map((r) => r?.audio_url)
          .find((u) => typeof u === 'string' && u.length > 0)

        let draftProject = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
        if (draftProject?.bible) {
          draftProject = {
            ...draftProject,
            assets: mergeProjectAssets(
              draftProject.assets,
              buildSceneAssetsFromPipeline(mergedImages)
            )
          }
          useStudioStore.getState().patchWorkspaceProject(workspaceIx, () => draftProject!)

          const { project: healedProject, report } = await healEpisodeSceneImages({
            project: draftProject,
            episodeNumber: epn,
            regenerateScenes: async (indices) => {
              const retryOut = await runVisualStream(
                { ...baseBody, sceneIndices: indices },
                mergedImages
              )
              mergedImages = [...mergedImages, ...(retryOut.images ?? [])]
              return retryOut.images ?? []
            },
            onPatch: (patched) => {
              draftProject = patched
              useStudioStore.getState().patchWorkspaceProject(workspaceIx, () => patched)
            }
          })

          const pipelineReport = await auditEpisodePipelineCompletion(healedProject, epn)
          draftProject = applyPipelineValidationToProject(healedProject, pipelineReport)
          useStudioStore.getState().patchWorkspaceProject(workspaceIx, () => draftProject!)
          useStudioStore.getState().setVisualGenerationSummary({
            ...report,
            imagesGenerated: pipelineReport.validatedImageCount,
            total: pipelineReport.totalScenes,
            storyReadyForAnimation: pipelineReport.animationReady
          })
          console.info('[katha:pipeline]', 'scene_heal_complete', report, pipelineReport)
        }

        if (draftProject && narrationAudioUrl) {
          draftProject = {
            ...draftProject,
            episodes: draftProject.episodes.map((e) =>
              e.number === epn ? { ...e, narrationAudioUrl: String(narrationAudioUrl) } : e
            )
          }
        }
        if (draftProject?.bible) {
          const failedBeforeFallback = getFailedSceneIndices(draftProject, epn)
          if (failedBeforeFallback.length) {
            draftProject = applyEmergencyFallbackForFailedScenes(draftProject, epn, failedBeforeFallback)
            useStudioStore.getState().patchWorkspaceProject(workspaceIx, () => draftProject!)
            console.info('[katha:pipeline]', 'emergency_fallback_batch', {
              scenes: failedBeforeFallback
            })
          }
          draftProject = syncEpisodeSceneImageStatuses(draftProject, epn)
          const liveCounts = computeLiveSceneImageCounts(draftProject, epn)
          console.info('[katha:pipeline]', 'live_scene_counts', liveCounts)
          const finalPipeline = await auditEpisodePipelineCompletion(draftProject, epn)
          draftProject = applyPipelineValidationToProject(draftProject, finalPipeline)
          useStudioStore.getState().setVisualGenerationSummary({
            imagesGenerated: finalPipeline.validatedImageCount,
            total: finalPipeline.totalScenes,
            missingRepaired: draftProject.sceneImageGenerationReport?.missingRepaired ?? 0,
            blackRepaired: draftProject.sceneImageGenerationReport?.blackRepaired ?? 0,
            emergencyFilled: draftProject.sceneImageGenerationReport?.emergencyFilled ?? 0,
            storyReadyForAnimation: finalPipeline.animationReady,
            incompleteSceneIndices: finalPipeline.scenes
              .filter((r) => r.image !== 'ok' || r.preview !== 'ok')
              .map((r) => r.scene)
          })
        }

        const metaBibleChars = (out.metadata?.bibleCharacters ?? []) as {
          name?: string
          baseImageUrl?: string
          leonardoSeed?: number
        }[]

        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
          if (!cur.bible || !draftProject) return cur
          let next = mergePortraitMetadata(draftProject, metaBibleChars)
          const withVisual = withVisualGenerationComplete({
            ...next,
            episodes: next.episodes.map((e) =>
              e.number === epn
                ? {
                    ...e,
                    ...(narrationAudioUrl ? { narrationAudioUrl: String(narrationAudioUrl) } : {}),
                    scenes: attachSceneGenerationStatuses(
                      next,
                      epn,
                      Boolean(narrationAudioUrl)
                    )
                  }
                : e
            )
          })
          const cov = episodeSceneImageCoverage(withVisual, epn)
          const meta = (out as { metadata?: Record<string, unknown> }).metadata
          const partial =
            !withVisual.pipelineValidationReport?.animationReady &&
            !withVisual.sceneImageGenerationReport?.storyReadyForAnimation
          if (partial) {
            useStudioStore.getState().setSelectedEpisode(epn)
            const latestEp =
              withVisual.episodes.find((e) => e.number === epn) ?? withVisual.episodes[0]
            setError(formatSceneImageIncompleteMessage(withVisual, latestEp, uiText))
            const need = buildSceneImageRegenerationQueue(withVisual, epn)
            return {
              ...withVisual,
              storyboardPartial: true,
              missingSceneImageIndices: need.length ? need : cov.missing
            }
          }
          setError(null)
          return withStoryboardReady(
            {
              ...withVisual,
              sceneImagesComplete: true,
              ...(meta?.productionMemory
                ? { productionMemory: meta.productionMemory as Record<string, unknown> }
                : {}),
              ...(meta?.sceneProductionStates
                ? {
                    sceneProductionStates: meta.sceneProductionStates as import('../types/story').SceneProductionState[]
                  }
                : {}),
              ...(meta?.characterVisualLocks
                ? { characterVisualLocks: meta.characterVisualLocks as import('../types/story').CharacterVisualLock[] }
                : {}),
              ...(meta?.masterStoryContext
                ? { masterStoryContext: meta.masterStoryContext as Record<string, unknown> }
                : {}),
              ...(meta?.storyBible
                ? { storyBible: meta.storyBible as Record<string, unknown> }
                : {})
            },
            {
              partial: false,
              missingSceneIndices: [],
              episodeNumber: epn
            }
          )
        })

        if (!opts?._autoSingleRetry && draftProject?.bible) {
          const need = getScenesNeedingImageRegeneration(draftProject, epn)
          if (need.length >= 1 && need.length <= 2) {
            console.info('[katha:pipeline]', 'auto_retry_remaining_scenes', { scenes: need })
            await generateVisuals({
              episodeNumber: epn,
              sceneIndices: need,
              _autoSingleRetry: true
            })
          }
        }
      } catch (e) {
        const classified = classifyVisualGenerationError(e)
        const msg = formatVisualFailureForUser(classified.code, classified.message, uiText)
        if (!(e instanceof Error && e.name === 'AbortError')) {
          const draft = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
          const cov = draft ? episodeSceneImageCoverage(draft, epn) : null
          if (cov && cov.withImage > 0) {
            setError(`${msg} — ${uiText('visualPartialScenesOk', { count: String(cov.withImage) })}`)
          } else {
            setError(msg)
          }
        }
      } finally {
        releaseVisualBatchLock(p.id)
        useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, null)
        useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, uiText]
  )

  const ensureEpisodeSceneImages = useCallback(
    async (episodeNumber: number) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
      const p = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
      if (!p?.bible) return false
      const need = getScenesNeedingImageRegeneration(p, episodeNumber)
      if (!need.length && p.pipelineValidationReport?.animationReady) return true
      await generateVisuals({
        episodeNumber,
        sceneIndices: need.length ? need : undefined
      })
      const after = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
      return Boolean(
        after?.pipelineValidationReport?.animationReady ||
          after?.sceneImageGenerationReport?.storyReadyForAnimation
      )
    },
    [generateVisuals]
  )

  return { generateVisuals, ensureEpisodeSceneImages }
}
