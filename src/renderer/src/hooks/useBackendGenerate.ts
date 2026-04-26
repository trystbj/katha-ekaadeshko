import { useCallback } from 'react'
import { defaultProject, newProjectId } from '../types/story'
import type { AssetRef, StoryBible, StoryEpisode, StoryScene } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'
import { pushStoryToCloudIfSignedIn, pushStoryToHistory } from '../utils/storyHistory'

export function useBackendGenerate() {
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const setProject = useStudioStore((s) => s.setProject)
  const setJob = useStudioStore((s) => s.setJob)

  const backendCountry = useStudioStore((s) => s.backendCountry)
  const backendTheme = useStudioStore((s) => s.backendTheme)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendLength = useStudioStore((s) => s.backendLength)
  const styleId = useStudioStore((s) => s.styleId)
  const aspectMode = useStudioStore((s) => s.aspectMode)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)

  const generate = useCallback(async () => {
    setError(null)
    setBusy('generating')
    setJob(null)
    try {
      const res = await fetch('/api/jobs-stream-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: backendTheme,
          country: backendCountry,
          genre: backendGenre,
          length: backendLength
        })
      })
      if (!res.ok) throw new Error(await res.text())
      if (!res.body) throw new Error('No response body (browser blocked streaming?)')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let out: any | null = null
      let lastError: string | null = null
      const log: string[] = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let idx = buf.indexOf('\n\n')
        while (idx !== -1) {
          const raw = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 2)
          if (raw.startsWith('data:')) {
            const json = raw.slice(5).trim()
            try {
              const evt = JSON.parse(json)
              if (evt.type === 'job') {
                setJob({ id: evt.id, stage: 'starting', progress: 0, log: [] })
              } else if (evt.type === 'progress') {
                const msg = evt.message ? String(evt.message) : String(evt.stage || '')
                log.push(msg)
                setJob({
                  id: useStudioStore.getState().job?.id || 'job',
                  stage: String(evt.stage || ''),
                  progress: Number(evt.progress || 0),
                  log: log.slice(-60)
                })
              } else if (evt.type === 'result') {
                out = evt.result
              } else if (evt.type === 'error') {
                const errMsg = String(evt.error || 'Generation failed')
                lastError = errMsg
                throw new Error(errMsg)
              }
            } catch (e) {
              // Ignore JSON parse noise, but always propagate explicit stream errors.
              if (e instanceof SyntaxError) return
              if (e instanceof Error && lastError && e.message === lastError) throw e
            }
          }
          idx = buf.indexOf('\n\n')
        }
      }

      if (!out) {
        if (lastError) throw new Error(lastError)
        throw new Error('No result returned (stream ended without a result event)')
      }

      const pipelineImages: { image_url?: string; imageUrl?: string; scene?: string | number; prompt?: string }[] =
        Array.isArray(out.images) ? out.images : []

      const assetsFromPipeline: AssetRef[] = pipelineImages
        .map((row, i) => {
          const url = row?.image_url || row?.imageUrl
          if (!url || typeof url !== 'string') return null
          return {
            id: `a_${newProjectId()}`,
            kind: 'scene' as const,
            key: `scene:${String(row.scene ?? i + 1)}`,
            url,
            prompt: String(row.prompt ?? ''),
            createdAt: new Date().toISOString()
          }
        })
        .filter((x): x is AssetRef => x != null)

      const bible: StoryBible = {
        title: out.story.title,
        concept: out.story.setting,
        characters: out.story.characters.map((c, i) => {
          const thumb = pipelineImages[i]?.image_url || pipelineImages[i]?.imageUrl
          return {
            id: `c${i + 1}`,
            name: c.name,
            personality: `${c.role}. ${c.traits}`.trim(),
            visualIdentity: `${c.traits}`.trim() || c.role,
            baseImagePrompt: `${c.name}, ${c.role}, ${c.traits}`,
            ...(thumb ? { baseImageUrl: String(thumb) } : {})
          }
        }),
        totalEpisodes: 1,
        outline: [{ episode: 1, beat: `${backendCountry} · ${backendTheme} · ${backendGenre}` }],
        userIdea: `${backendCountry} ${backendTheme} ${backendGenre} ${backendLength}`.trim(),
        styleId,
        language: uiLanguage,
        aspectMode
      }

      const scenes: StoryScene[] = []
      for (const s of out.script) {
        scenes.push({
          index: scenes.length + 1,
          lineType: 'Dialogue',
          character: 'Narration',
          text: s.narration
        })
      }

      const episode1: StoryEpisode = {
        number: 1,
        pacing: 'Normal',
        estimatedDurationSec: 90,
        scenes: scenes.slice(0, 10),
        cliffhanger: '—',
        rawStructured: JSON.stringify(out, null, 2),
        status: 'done'
      }

      const nextProject = defaultProject({
        title: bible.title,
        status: 'in_progress',
        bible,
        episodes: [episode1],
        memorySummary: '',
        qualityMerge: true,
        assets: assetsFromPipeline
      })
      setProject(nextProject)
      void pushStoryToHistory(nextProject)
      void pushStoryToCloudIfSignedIn(nextProject)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [
    setBusy,
    setError,
    setProject,
    setJob,
    backendTheme,
    backendCountry,
    backendGenre,
    backendLength,
    styleId,
    uiLanguage,
    aspectMode
  ])

  return { generate }
}

