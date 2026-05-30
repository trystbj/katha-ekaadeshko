import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import { drainSseBuffer } from '../utils/parseSseStream'
import {
  buildSceneAssetsFromPipeline,
  mergeProjectAssets,
  mergeSceneMotionIntoAssets,
  sceneUrlForIndex
} from '../utils/sceneAssetMap'
import {
  parsePipelinePayloadFromEpisode,
  withVideoGenerationComplete,
  withVideoGenerationStarted
} from '../utils/productionWorkflow'
import type { ProductionDirectives } from '../types/story'
import { inferCountryFromLanguageCode } from '../utils/inferCountryFromLanguage'
import { formatApiError, readHttpErrorResponse } from '../utils/formatApiError'

type VideoGenResult = {
  videos: { scene?: string | number; video_url?: string }[]
  metadata?: Record<string, unknown>
}

export function useVideoGeneration() {
  const uiText = useUiText()
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)

  const generateSceneVideos = useCallback(
    async (opts?: { sceneIndices?: number[]; episodeNumber?: number }) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
      const p = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
      if (!p?.bible) return
      const epn = opts?.episodeNumber ?? p.episodes[0]?.number ?? 1
      const ep = p.episodes.find((e) => e.number === epn) ?? p.episodes[0]
      if (!ep) return

      const payload = parsePipelinePayloadFromEpisode(ep)
      if (!payload) {
        setError(uiText('videoGenMissingScript'))
        return
      }

      const imagesFromAssets = ep.scenes
        .map((sc) => {
          const url = sceneUrlForIndex(p, sc.index)
          const asset = p.assets.find((a) => a.kind === 'scene' && a.key === `scene:${sc.index}`)
          if (!url) return null
          return {
            scene: sc.index,
            image_url: url,
            leonardoImageId: asset?.leonardoImageId,
            prompt: asset?.prompt
          }
        })
        .filter(Boolean) as Record<string, unknown>[]

      const images =
        imagesFromAssets.length > 0
          ? imagesFromAssets
          : (payload.images as { scene?: number; image_url?: string; leonardoImageId?: string }[])

      if (!images.length) {
        setError(uiText('videoGenMissingImages'))
        return
      }

      setBusy('rendering')
      setError(null)
      useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => withVideoGenerationStarted(cur))

      const st = useStudioStore.getState()
      const ac = new AbortController()
      useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, ac)

      const directives = (p.productionDirectives ||
        payload.metadata?.productionDirectives) as ProductionDirectives | undefined

      try {
        const res = await fetch('/api/jobs-generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({
            story: payload.story,
            script: payload.script,
            images,
            ...(opts?.sceneIndices?.length ? { sceneIndices: opts.sceneIndices } : {}),
            ...(directives ? { productionDirectives: directives } : {}),
            ...(ep.renderAssemblyPlan ? { renderAssemblyPlan: ep.renderAssemblyPlan } : {}),
            aspectMode: p.bible.aspectMode,
            styleId: p.bible.styleId,
            genre: st.backendGenre,
            theme: p.bible.concept,
            country: inferCountryFromLanguageCode(p.bible.language),
            storyLanguage: p.bible.language,
            generationMode: directives?.generationMode || 'cinematic',
            characterReference: p.characterReference,
            bibleCharacters: p.bible.characters.map((c) => ({
              name: c.name,
              gender: c.gender,
              age: c.age,
              appearance: c.appearance || c.visualIdentity,
              visualIdentity: c.visualIdentity,
              referenceImages: c.referenceImages
            }))
          })
        })
        if (!res.ok) throw new Error(await readHttpErrorResponse(res, uiText('videoGenMissingImages')))
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let out: VideoGenResult | null = null

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
            if (evt.type === 'result') out = evt.result as VideoGenResult
            if (evt.type === 'error') throw new Error(formatApiError(evt.error, 'Video generation failed'))
          }
        }
        const tail = drainSseBuffer(buf)
        for (const evt of tail.events) {
          if (evt.type === 'result') out = evt.result as VideoGenResult
          if (evt.type === 'error') throw new Error(formatApiError(evt.error, 'Video generation failed'))
        }
        if (!out?.videos?.length) {
          const partial = opts?.sceneIndices?.length
          if (partial) {
            throw new Error(uiText('videoGenPartialFailed') || 'Video generation failed for selected scenes.')
          }
          console.info('[katha:video]', 'no_leonardo_clips', { note: 'render may use stills' })
        }

        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
          if (!cur.bible) return cur
          const mergedAssets = mergeSceneMotionIntoAssets(
            mergeProjectAssets(cur.assets, buildSceneAssetsFromPipeline(images as Parameters<typeof buildSceneAssetsFromPipeline>[0])),
            out?.videos ?? []
          )
          const meta = out?.metadata
          return withVideoGenerationComplete({
            ...cur,
            assets: mergedAssets,
            ...(meta?.productionMemory ? { productionMemory: meta.productionMemory as Record<string, unknown> } : {}),
            ...(meta?.sceneProductionStates
              ? { sceneProductionStates: meta.sceneProductionStates as import('../types/story').SceneProductionState[] }
              : {})
          })
        })
      } catch (e) {
        const msg = formatApiError(e, 'Video generation failed')
        if (!(e instanceof Error && e.name === 'AbortError')) setError(msg)
      } finally {
        useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, uiText]
  )

  return { generateSceneVideos }
}
