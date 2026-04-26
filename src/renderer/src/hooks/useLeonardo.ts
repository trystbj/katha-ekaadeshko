import { useCallback } from 'react'
import type { AspectMode, StoryCharacter } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'

function dims(aspect: AspectMode): { width: number; height: number } {
  return aspect === 'vertical_9_16'
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 }
}

export function useLeonardo() {
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const patchProject = useStudioStore((s) => s.patchProject)

  const generateCharacterBase = useCallback(
    async (characterId: string, emotionNote?: string) => {
      const k = window.katha
      if (!k?.leonardoGenerate) throw new Error('Image generation is not available in this build.')
      const p = useStudioStore.getState().project
      if (!p?.bible) return
      const ch = p.bible.characters.find((c) => c.id === characterId)
      if (!ch) return
      setBusy('leonardo')
      setError(null)
      try {
        const { width, height } = dims(p.bible.aspectMode)
        const prompt = [
          ch.baseImagePrompt,
          emotionNote ? `expression: ${emotionNote}` : 'neutral expression, clear face',
          'single character, waist-up or portrait, no text, no watermark'
        ].join(', ')
        const res = await k.leonardoGenerate({
          prompt,
          width,
          height,
          seed: ch.leonardoSeed
        })
        const seed = res.seed ?? ch.leonardoSeed
        patchProject((cur) => {
          if (!cur.bible) return cur
          const characters = cur.bible.characters.map((c: StoryCharacter) =>
            c.id === characterId
              ? { ...c, baseImageUrl: res.imageUrl, leonardoSeed: seed }
              : c
          )
          const assets = [
            ...cur.assets,
            {
              id: `a_${Date.now()}`,
              kind: 'character' as const,
              key: `char:${characterId}:base`,
              url: res.imageUrl,
              prompt,
              seed,
              createdAt: new Date().toISOString()
            }
          ]
          return {
            ...cur,
            bible: { ...cur.bible, characters },
            assets,
            updatedAt: new Date().toISOString()
          }
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    },
    [patchProject, setBusy, setError]
  )

  return { generateCharacterBase }
}
