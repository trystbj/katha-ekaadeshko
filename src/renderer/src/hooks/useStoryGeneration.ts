import { useCallback } from 'react'
import {
  CORE_STORY_RULES,
  buildBibleUserPrompt,
  buildEpisodeUserPrompt,
  buildMemoryUpdatePrompt,
  buildOpenAIRefinePrompt,
  parseBibleJson
} from '../prompts/storyEngine'
import { parseStructuredEpisode, fingerprintFromEpisode } from '../services/parseEpisode'
import { simpleHash } from '../services/fingerprint'
import type { StoryBible, StoryEpisode } from '../types/story'
import { defaultProject } from '../types/story'
import { LANGUAGE_OPTIONS } from '../i18n/resources'
import { useStudioStore } from '../store/useStudioStore'

function langName(code: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label || code
}

async function ai(
  system: string,
  user: string,
  prefer?: 'openai' | 'gemini' | 'deepseek',
  maxTokens?: number
): Promise<string> {
  const k = window.katha
  if (!k) throw new Error('Desktop bridge not available')
  const r = await k.aiComplete({ system, user, preferProvider: prefer, maxTokens })
  return r.text
}

export function useStoryGeneration() {
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const patchProject = useStudioStore((s) => s.patchProject)
  const idea = useStudioStore((s) => s.idea)
  const styleId = useStudioStore((s) => s.styleId)
  const aspectMode = useStudioStore((s) => s.aspectMode)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)

  const touch = useCallback(() => {
    patchProject((p) => ({ ...p, updatedAt: new Date().toISOString() }))
  }, [patchProject])

  const generateBible = useCallback(async () => {
    setError(null)
    setBusy('bible')
    try {
      if (!useStudioStore.getState().project) {
        useStudioStore.getState().setProject(defaultProject({ title: 'Untitled Story', status: 'new' }))
      }
      const user = buildBibleUserPrompt({
        idea,
        styleId,
        languageName: langName(uiLanguage),
        aspectMode
      })
      const text = await ai(CORE_STORY_RULES, user, 'gemini', 8192)
      const partial = parseBibleJson(text)
      if (!partial) throw new Error('Could not parse story bible JSON. Try again or shorten the idea.')
      const bible: StoryBible = {
        ...partial,
        userIdea: idea,
        styleId,
        language: uiLanguage,
        aspectMode
      }
      patchProject((p) => ({
        ...p,
        title: bible.title,
        bible,
        status: 'in_progress',
        memorySummary: `- ${bible.concept}`,
        episodes: [],
        updatedAt: new Date().toISOString()
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }, [idea, styleId, aspectMode, uiLanguage, patchProject, setBusy, setError])

  const generateEpisode = useCallback(
    async (episodeNumber: number) => {
      const p = useStudioStore.getState().project
      if (!p?.bible) throw new Error('No bible')
      setError(null)
      setBusy(`episode ${episodeNumber}`)
      try {
        const user = buildEpisodeUserPrompt(p, episodeNumber)
        let raw = await ai(CORE_STORY_RULES, user, 'gemini', 8192)
        // Automatic multi-pass: refine with a secondary model if available.
        // Order: OpenAI (best dialogue polish) → DeepSeek (fallback).
        try {
          raw = await ai(CORE_STORY_RULES, buildOpenAIRefinePrompt(raw), 'openai', 4096)
        } catch {
          try {
            raw = await ai(CORE_STORY_RULES, buildOpenAIRefinePrompt(raw), 'deepseek', 4096)
          } catch {
            /* keep primary */
          }
        }
        let ep = parseStructuredEpisode(raw, episodeNumber)
        ep = { ...ep, rawStructured: raw, status: 'done' }
        const fp = simpleHash(fingerprintFromEpisode(ep))
        patchProject((cur) => {
          const without = cur.episodes.filter((e) => e.number !== episodeNumber)
          const fingerprints = [...cur.contentFingerprints, fp].slice(-200)
          return {
            ...cur,
            episodes: [...without, ep].sort((a, b) => a.number - b.number),
            contentFingerprints: fingerprints
          }
        })
        useStudioStore.getState().setSelectedEpisode(episodeNumber)
        const memUser = buildMemoryUpdatePrompt(useStudioStore.getState().project!, raw)
        try {
          const mem = await ai(
            CORE_STORY_RULES,
            `Return ONLY the bullet list per instructions.\n${memUser}`,
            'openai',
            1024
          )
          patchProject((cur) => ({
            ...cur,
            memorySummary: mem.split('\n').slice(0, 16).join('\n').slice(0, 4000)
          }))
        } catch {
          try {
            const mem = await ai(
              CORE_STORY_RULES,
              `Return ONLY the bullet list per instructions.\n${memUser}`,
              'deepseek',
              1024
            )
            patchProject((cur) => ({
              ...cur,
              memorySummary: mem.split('\n').slice(0, 16).join('\n').slice(0, 4000)
            }))
          } catch {
            /* optional */
          }
        }
        touch()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    },
    [patchProject, setBusy, setError, touch]
  )

  const regenerateScene = useCallback(
    async (episodeNumber: number, sceneIndex: number) => {
      const p = useStudioStore.getState().project
      if (!p?.bible) return
      const ep = p.episodes.find((e) => e.number === episodeNumber)
      if (!ep) return
      const sc = ep.scenes.find((s) => s.index === sceneIndex)
      if (!sc) return
      setBusy('scene')
      setError(null)
      try {
        const user = `Rewrite ONLY this scene in the same template block format (Scene ${sceneIndex} only), keeping story continuity.

Full episode context:
${ep.rawStructured ?? ''}

Target scene to replace:
Scene ${sceneIndex}:
Type: ${sc.lineType}
Character: ${sc.character}
Text: ${sc.text}
${sc.emoji ? `Emoji: ${sc.emoji}` : ''}

Output ONLY the Scene ${sceneIndex}: block lines, nothing else.`
        const raw = await ai(CORE_STORY_RULES, user, 'openai', 1024)
        const merged = mergeSceneIntoEpisode(ep, sceneIndex, raw)
        patchProject((cur) => ({
          ...cur,
          episodes: cur.episodes.map((e) => (e.number === episodeNumber ? merged : e))
        }))
        touch()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    },
    [patchProject, setBusy, setError, touch]
  )

  return { generateBible, generateEpisode, regenerateScene }
}

function mergeSceneIntoEpisode(ep: StoryEpisode, sceneIndex: number, sceneRaw: string): StoryEpisode {
  const base = ep.rawStructured ?? ''
  const re = new RegExp(`Scene\\s*${sceneIndex}\\s*:[\\s\\S]*?(?=Scene\\s*\\d+\\s*:|Cliffhanger:|$)`, 'i')
  const replacement = sceneRaw.trim() + '\n\n'
  const next = re.test(base) ? base.replace(re, replacement) : `${base}\n\n${replacement}`
  const parsed = parseStructuredEpisode(next, ep.number)
  return { ...parsed, rawStructured: next }
}
