import { useCallback } from 'react'
import type { AspectMode, StoryCharacter, VisualStyleId } from '../types/story'
import { getStylePromptSuffix } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'
import { getVisualPackExtraPrompt } from '../utils/visualThemePackExtras'

function dims(aspect: AspectMode): { width: number; height: number } {
  return aspect === 'vertical_9_16'
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 }
}

export function useLeonardo() {
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)

  const generateCharacterBase = useCallback(
    async (characterId: string, emotionNote?: string) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
      const k = window.katha
      if (!k?.leonardoGenerate) throw new Error('Image generation is not available in this build.')
      const p = useStudioStore.getState().project
      if (!p?.bible) return
      const ch = p.bible.characters.find((c) => c.id === characterId)
      if (!ch) return
      setBusy('leonardo')
      setError(null)
      try {
        const { width, height } = dims('vertical_9_16')
        const st = useStudioStore.getState()
        const sid = (st.styleId || 'soft_anime_fantasy') as VisualStyleId
        const styleLock = getStylePromptSuffix(sid, sid === 'custom' ? st.customVisualPrompt : undefined)
        const vaccent = getVisualPackExtraPrompt(st.visualPackId).trim()
        const cref = p.characterReference
        const crefLine =
          cref?.images?.length
            ? `CHARACTER REFERENCE: match uploaded references (face, hairstyle, clothing, age, expression). Strength=${cref.strength || 'balanced'}.`
            : ''
        const prompt = [
          `VISUAL STYLE LOCK — single unified medium only: ${styleLock}.`,
          vaccent ? `Ambient mood accent (preserve medium — no style swap): ${vaccent}` : '',
          'Forbidden: mixing unrelated render families (e.g. photoreal face + unrelated cartoon body) unless idea explicitly requests hybrid blend.',
          crefLine,
          ch.baseImagePrompt,
          emotionNote ? `expression: ${emotionNote}` : 'neutral expression, clear face',
          'single character, waist-up or portrait, no text, no watermark'
        ]
          .filter(Boolean)
          .join(' ')
        const res = await k.leonardoGenerate({
          prompt,
          width,
          height,
          seed: ch.leonardoSeed
        })
        const seed = res.seed ?? ch.leonardoSeed
        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
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
        useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError]
  )

  return { generateCharacterBase }
}
