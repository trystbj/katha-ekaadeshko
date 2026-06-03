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
import { applySceneImagePatch, markSceneGenerating } from '../utils/applySceneImagePatch'
import { sceneIndexFromPipelineRow } from '../utils/sceneAssetMap'
import { probeSceneImagesFromPipeline } from '../utils/probeSceneImageUrl'
import {
  mergePipelineImageRows,
  pipelineImagesFromStore,
  type PipelineImageRow
} from '../utils/visualStreamRecovery'

type VisualGenResult = {
  images: PipelineImageRow[]
  audio: { scene?: string | number; audio_url?: string }[]
}

const STREAM_MAX_ATTEMPTS = Number(import.meta.env.VITE_VISUAL_STREAM_RETRIES || 3) || 3

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
    async (opts?: { sceneIndices?: number[]; episodeNumber?: number }) => {
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

      const targetScenes =
        opts?.sceneIndices?.length && opts.sceneIndices.length > 0
          ? opts.sceneIndices
          : ep.scenes.map((s) => s.index)

      setBusy('generating')
      setError(null)
      useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
        const queued = markScenesQueued(
          withVisualGenerationStarted(cur),
          epn,
          ep.scenes.map((s) => s.index)
        )
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
          if (!r.ok) throw new Error(await readHttpErrorResponse(r, uiText('visualGenNoResult')))
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
                sseImages = mergePipelineImageRows(sseImages, imageRow, sceneNum)
                useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
                  if (!cur.bible) return cur
                  return applySceneImagePatch(cur, epn, imageRow, sceneNum)
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
              } else if (evt.type === 'error') {
                throw new Error(formatApiError(evt.error, uiText('visualGenNoResult')))
              }
            }
          }
          const tail = drainSseBuffer(buf)
          for (const evt of tail.events) {
            if (evt.type === 'scene_image' && evt.image) {
              const imageRow = evt.image as PipelineImageRow
              const sceneNum = sceneIndexFromPipelineRow(imageRow, Number(evt.scene) || 1)
              sseImages = mergePipelineImageRows(sseImages, imageRow, sceneNum)
              useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
                if (!cur.bible) return cur
                return applySceneImagePatch(cur, epn, imageRow, sceneNum)
              })
            } else if (evt.type === 'result') {
              streamOut = evt.result as VisualGenResult & { metadata?: Record<string, unknown> }
            } else if (evt.type === 'error') {
              throw new Error(formatApiError(evt.error, uiText('visualGenNoResult')))
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
          if (!streamOut) throw new Error(uiText('visualGenNoResult'))

          const mergedResultImages = [...(streamOut.images ?? [])]
          for (const row of sseImages) {
            const sceneNum = sceneIndexFromPipelineRow(row, Number(row.scene) || 0)
            if (!sceneNum) continue
            const ix = mergedResultImages.findIndex((r) => Number(r.scene) === sceneNum)
            if (ix >= 0) mergedResultImages[ix] = row
            else mergedResultImages.push(row)
          }
          return { ...streamOut, images: mergedResultImages }
        }

        const baseBody = {
          story: payload.story,
          script: payload.script,
          sceneIndices: targetScenes,
          aspectMode: p.bible.aspectMode,
          styleId: p.bible.styleId,
          ...(p.bible.styleId === 'custom' ? { customVisualPrompt: p.bible.customVisualPrompt } : {}),
          genre: st.backendGenre,
          theme: p.bible.concept,
          country: inferCountryFromLanguageCode(p.bible.language),
          storyLanguage: p.bible.language,
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
        let out: VisualGenResult & { metadata?: Record<string, unknown> } | null = null
        let streamAttempt = 0
        while (streamAttempt < STREAM_MAX_ATTEMPTS && !out) {
          streamAttempt += 1
          try {
            out = await runVisualStream(baseBody, collected)
          } catch (e) {
            const draft = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
            collected = draft ? pipelineImagesFromStore(draft, ep.scenes) : collected
            if (streamAttempt >= STREAM_MAX_ATTEMPTS) throw e
            console.warn('[katha:pipeline]', 'visual_stream_retry', { attempt: streamAttempt })
          }
        }
        if (!out) throw new Error(uiText('visualGenNoResult'))

        let batchGuard = 0
        let remaining = (out.metadata?.visualBatch as { remainingSceneIndices?: number[] } | undefined)
          ?.remainingSceneIndices
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
        }

        let mergedImages = [...(out.images ?? [])]
        const narrationAudioUrl = (out.audio ?? [])
          .map((r) => r?.audio_url)
          .find((u) => typeof u === 'string' && u.length > 0)

        let draftProject = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
        if (draftProject?.bible) {
          let mergedForCov = mergeProjectAssets(
            draftProject.assets,
            buildSceneAssetsFromPipeline(mergedImages)
          )
          let covPre = episodeSceneImageCoverage({ ...draftProject, assets: mergedForCov }, epn)
          let missingRetry = 0
          while (covPre.missing.length > 0 && missingRetry < 3) {
            missingRetry += 1
            console.info('[katha:pipeline]', 'scene_retry_missing', {
              attempt: missingRetry,
              scenes: covPre.missing
            })
            const retryOut = await runVisualStream(
              { ...baseBody, sceneIndices: covPre.missing },
              mergedImages
            )
            mergedImages = [...mergedImages, ...(retryOut.images ?? [])]
            const retryAssets = buildSceneAssetsFromPipeline(retryOut.images ?? [])
            useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
              if (!cur.bible) return cur
              return { ...cur, assets: mergeProjectAssets(cur.assets, retryAssets) }
            })
            draftProject = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
            if (!draftProject?.bible) break
            mergedForCov = mergeProjectAssets(
              draftProject.assets,
              buildSceneAssetsFromPipeline(mergedImages)
            )
            covPre = episodeSceneImageCoverage({ ...draftProject, assets: mergedForCov }, epn)
          }
          if (covPre.missing.length > 0) {
            throw new Error(
              `Scene image generation incomplete — missing scenes: ${covPre.missing.join(', ')}`
            )
          }
        }

        const probe = await probeSceneImagesFromPipeline(mergedImages)
        if (!probe.ok) {
          console.warn('[katha:pipeline]', 'image_rendered', { failed: probe.failedScenes, reasons: probe.reasons })
          throw new Error(
            `Scene images failed display validation: ${probe.reasons.slice(0, 4).join('; ')}`
          )
        }
        console.info('[katha:pipeline]', 'image_rendered', { scenes: mergedImages.length })

        const assetsFromPipeline = buildSceneAssetsFromPipeline(mergedImages)
        const metaBibleChars = (out.metadata?.bibleCharacters ?? []) as {
          name?: string
          baseImageUrl?: string
          leonardoSeed?: number
        }[]

        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
          if (!cur.bible) return cur
          let next = mergePortraitMetadata(cur, metaBibleChars)
          const mergedAssets = mergeProjectAssets(next.assets, assetsFromPipeline)
          const withVisual = withVisualGenerationComplete({
            ...next,
            assets: mergedAssets,
            episodes: next.episodes.map((e) =>
              e.number === epn
                ? {
                    ...e,
                    ...(narrationAudioUrl ? { narrationAudioUrl: String(narrationAudioUrl) } : {}),
                    scenes: attachSceneGenerationStatuses(
                      { ...next, assets: mergedAssets },
                      epn,
                      Boolean(narrationAudioUrl)
                    )
                  }
                : e
            )
          })
          const cov = episodeSceneImageCoverage(withVisual, epn)
          if (cov.missing.length > 0) return withVisual
          const meta = (out as { metadata?: Record<string, unknown> }).metadata
          console.info('[katha:pipeline]', 'generation_completed', {
            scenes: cov.withImage,
            total: cov.total
          })
          return withStoryboardReady(
            {
              ...withVisual,
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
      } catch (e) {
        const msg = formatApiError(e, uiText('visualGenNoResult'))
        if (!(e instanceof Error && e.name === 'AbortError')) setError(msg)
      } finally {
        useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, null)
        useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, uiText]
  )

  return { generateVisuals }
}
