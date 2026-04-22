import { useCallback } from 'react'
import { defaultProject } from '../types/story'
import type { StoryBible, StoryEpisode, StoryScene } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'

export function useBackendGenerate() {
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const setProject = useStudioStore((s) => s.setProject)

  const backendCountry = useStudioStore((s) => s.backendCountry)
  const backendTheme = useStudioStore((s) => s.backendTheme)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendLength = useStudioStore((s) => s.backendLength)
  const styleId = useStudioStore((s) => s.styleId)
  const aspectMode = useStudioStore((s) => s.aspectMode)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)

  const generate = useCallback(async () => {
    setError(null)
    setBusy('backend generate')
    try {
      const k = window.katha
      if (!k) throw new Error('Desktop bridge not available')

      const out = await k.backendGenerateKatha({
        theme: backendTheme,
        country: backendCountry,
        genre: backendGenre,
        length: backendLength
      })

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

