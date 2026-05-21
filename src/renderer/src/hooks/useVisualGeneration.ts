import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import { drainSseBuffer } from '../utils/parseSseStream'
import { buildSceneAssetsFromPipeline, mergeProjectAssets } from '../utils/sceneAssetMap'
import {
  parsePipelinePayloadFromEpisode,
  withVisualGenerationComplete,
  withVisualGenerationStarted
} from '../utils/productionWorkflow'
import { withStoryboardReady } from '../utils/storyboardWorkflow'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import { attachSceneGenerationStatuses } from '../utils/scenePipelineStatus'
import { inferCountryFromLanguageCode } from '../utils/inferCountryFromLanguage'

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
      const epn = opts?.episodeNumber ?? p.episodes[0]?.number ?? 1
      const ep = p.episodes.find((e) => e.number === epn) ?? p.episodes[0]
      if (!ep) return

      const payload = parsePipelinePayloadFromEpisode(ep)
      if (!payload) {
        setError(uiText('visualGenMissingScript'))
        return
      }

      setBusy('generating')
      setError(null)
      useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => withVisualGenerationStarted(cur))

      const st = useStudioStore.getState()
      const ac = new AbortController()
      useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, ac)

      try {
        const res = await fetch('/api/jobs-generate-visuals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({
            story: payload.story,
            script: payload.script,
            ...(opts?.sceneIndices?.length ? { sceneIndices: opts.sceneIndices } : {}),
            aspectMode: p.bible.aspectMode,
            styleId: p.bible.styleId,
            ...(p.bible.styleId === 'custom' ? { customVisualPrompt: p.bible.customVisualPrompt } : {}),
            genre: st.backendGenre,
            theme: p.bible.concept,
            country: inferCountryFromLanguageCode(p.bible.language),
            storyLanguage: p.bible.language,
            narratorId: p.bible.narratorId,
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
        if (!res.ok) throw new Error(await res.text())
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let out: VisualGenResult | null = null

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
            if (evt.type === 'progress') {
              const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
              useStudioStore.getState().setWorkspaceJob(workspaceIx, {
                id: stJob?.id || 'visuals',
                stage: String(evt.stage || ''),
                progress: Number(evt.progress || 0),
                log: []
              })
            } else if (evt.type === 'result') {
              out = evt.result as VisualGenResult
            } else if (evt.type === 'error') {
              throw new Error(String(evt.error || 'Visual generation failed'))
            }
          }
        }
        const tail = drainSseBuffer(buf)
        for (const evt of tail.events) {
          if (evt.type === 'result') out = evt.result as VisualGenResult
          if (evt.type === 'error') throw new Error(String(evt.error || 'Visual generation failed'))
        }
        if (!out) throw new Error(uiText('visualGenNoResult'))

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
          return withStoryboardReady(withVisual, {
            partial: cov.missing.length > 0,
            missingSceneIndices: cov.missing
          })
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!(e instanceof Error && e.name === 'AbortError')) setError(msg)
      } finally {
        useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, uiText]
  )

  return { generateVisuals }
}
