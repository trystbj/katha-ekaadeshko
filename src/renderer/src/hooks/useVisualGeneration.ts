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

type VisualGenResult = {
  images: { scene?: string | number; image_url?: string; imageUrl?: string; prompt?: string }[]
  audio: { scene?: string | number; audio_url?: string }[]
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
          fetchBody: Record<string, unknown>
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
                const imageRow = evt.image as {
                  scene?: string | number
                  image_url?: string
                  imageUrl?: string
                }
                const sceneNum = sceneIndexFromPipelineRow(imageRow, Number(evt.scene) || 1)
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
              const imageRow = evt.image as { scene?: string | number; image_url?: string; imageUrl?: string }
              const sceneNum = sceneIndexFromPipelineRow(imageRow, Number(evt.scene) || 1)
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
          if (!streamOut) throw new Error(uiText('visualGenNoResult'))
          return streamOut
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
            referenceImages: c.referenceImages
          })),
          ...(p.productionDirectives ? { productionDirectives: p.productionDirectives } : {}),
          generationMode: p.productionDirectives?.generationMode || 'cinematic',
          ...(p.characterVisualLocks?.length ? { characterVisualLocks: p.characterVisualLocks } : {}),
          ...(p.masterStoryContext ? { masterStoryContext: p.masterStoryContext } : {}),
          ...(p.productionMemory ? { priorMemorySummary: JSON.stringify(p.productionMemory).slice(0, 2200) } : {})
        }

        let out = await runVisualStream(baseBody)
        let batchGuard = 0
        let remaining = (out.metadata?.visualBatch as { remainingSceneIndices?: number[] } | undefined)
          ?.remainingSceneIndices
        while (remaining?.length && batchGuard < 12) {
          batchGuard += 1
          const next = await runVisualStream({ ...baseBody, sceneIndices: remaining })
          out = {
            images: [...(out.images ?? []), ...(next.images ?? [])],
            audio: next.audio?.length ? next.audio : out.audio,
            metadata: next.metadata
          }
          remaining = (next.metadata?.visualBatch as { remainingSceneIndices?: number[] } | undefined)
            ?.remainingSceneIndices
        }

        const assetsFromPipeline = buildSceneAssetsFromPipeline(out.images ?? [])
        const narrationAudioUrl = (out.audio ?? [])
          .map((r) => r?.audio_url)
          .find((u) => typeof u === 'string' && u.length > 0)

        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
          if (!cur.bible) return cur
          const mergedAssets = mergeProjectAssets(cur.assets, assetsFromPipeline)
          const withVisual = withVisualGenerationComplete({
            ...cur,
            assets: mergedAssets,
            episodes: cur.episodes.map((e) =>
              e.number === epn
                ? {
                    ...e,
                    ...(narrationAudioUrl ? { narrationAudioUrl: String(narrationAudioUrl) } : {}),
                    scenes: attachSceneGenerationStatuses(
                      { ...cur, assets: mergedAssets },
                      epn,
                      Boolean(narrationAudioUrl)
                    )
                  }
                : e
            )
          })
          const cov = episodeSceneImageCoverage(withVisual, epn)
          const meta = (out as { metadata?: Record<string, unknown> }).metadata
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
                : {})
            },
            {
              partial: cov.missing.length > 0,
              missingSceneIndices: cov.missing,
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
