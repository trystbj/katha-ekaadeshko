import { useCallback } from 'react'
import { defaultProject } from '../types/story'
import type { StoryBible, StoryEpisode, StoryScene } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'

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
                lastError = String(evt.error || 'Generation failed')
                throw new Error(lastError)
              }
            } catch (e) {
              // ignore parse noise
              if (e instanceof Error && e.message.includes('Generation failed')) throw e
            }
          }
          idx = buf.indexOf('\n\n')
        }
      }

      if (!out) {
        if (lastError) throw new Error(lastError)
        throw new Error('No result returned (stream ended without a result event)')
      }

      const bible: StoryBible = {
        title: out.story.title,
        concept: out.story.setting,
        characters: out.story.characters.map((c, i) => ({
          id: `c${i + 1}`,
          name: c.name,
          personality: `${c.role}. ${c.traits}`.trim(),
          visualIdentity: `${c.traits}`.trim() || c.role,
          baseImagePrompt: `${c.name}, ${c.role}, ${c.traits}`
        })),
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

      setProject(
        defaultProject({
          title: bible.title,
          status: 'in_progress',
          bible,
          episodes: [episode1],
          memorySummary: '',
          qualityMerge: true
        })
      )
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

