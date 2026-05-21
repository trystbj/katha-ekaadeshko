import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
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
import type { StoryBible, StoryEpisode, VisualStyleId } from '../types/story'
import { defaultProject } from '../types/story'
import { NARRATION_LANGUAGE_LABEL_EN } from '../constants/narrationLanguages'
import { useStudioStore } from '../store/useStudioStore'
import { pushStoryToHistory } from '../utils/storyHistory'
import { getVisualPackExtraPrompt } from '../utils/visualThemePackExtras'
import { analyzeNamingPolicy, sanitizeStoryCharacters } from '@shared/characterNamingPolicy.js'

function langName(code: string): string {
  return NARRATION_LANGUAGE_LABEL_EN[code] ?? code
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
  const uiText = useUiText()
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const idea = useStudioStore((s) => s.idea)
  const styleId = useStudioStore((s) => s.styleId)
  const customVisualPrompt = useStudioStore((s) => s.customVisualPrompt)
  const narratorId = useStudioStore((s) => s.narratorId)
  const narrationDraft = useStudioStore((s) => s.narrationDraft)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)

  const touch = useCallback(() => {
    useStudioStore.getState().patchProject((p) => ({ ...p, updatedAt: new Date().toISOString() }))
  }, [])

  const generateBible = useCallback(async () => {
    const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
    setError(null)
    setBusy('bible')
    try {
      const s0 = useStudioStore.getState()
      if (!s0.project) {
        const wt = s0.workingTitle.trim()
        useStudioStore
          .getState()
          .setWorkspaceProject(
            workspaceIx,
            defaultProject({ title: wt || 'Untitled Story', fontMode: s0.uiFontMode, status: 'new' })
          )
      }
      if (!styleId || !narratorId || !uiLanguage || !storyLanguage) {
        throw new Error(uiText('generateMissingFields'))
      }
      const tone = s0.storyTone
      const chain = s0.episodeChainPreferred
      const accent = getVisualPackExtraPrompt(s0.visualPackId)
      let ideaUse = idea
      if (tone) ideaUse += `\nTone preference: ${tone}.`
      if (chain) ideaUse += '\nSerialized storytelling with strong episode-to-episode hooks.'
      const user = buildBibleUserPrompt({
        idea: ideaUse,
        styleId: styleId as VisualStyleId,
        customVisualPrompt: styleId === 'custom' ? customVisualPrompt : undefined,
        languageName: langName(storyLanguage),
        aspectMode: 'vertical_9_16',
        visualAccent: accent
      })
      const text = await ai(CORE_STORY_RULES, user, 'gemini', 8192)
      const partial = parseBibleJson(text)
      if (!partial) throw new Error('Could not parse story bible JSON. Try again or shorten the idea.')
      const hintTitle = useStudioStore.getState().workingTitle.trim()
      const mainChar = useStudioStore.getState().mainCharacterName.trim()
      const resolvedTitle = (hintTitle || partial.title || 'Untitled').trim() || 'Untitled'
      const namingPolicy = analyzeNamingPolicy(idea, ideaUse)
      const bible: StoryBible = {
        ...partial,
        title: resolvedTitle,
        userIdea: idea,
        styleId: styleId as VisualStyleId,
        customVisualPrompt: styleId === 'custom' ? customVisualPrompt.trim() : undefined,
        language: storyLanguage,
        aspectMode: 'vertical_9_16',
        narratorId,
        narration: narrationDraft,
        characters: sanitizeStoryCharacters(
          partial.characters.map((c) => ({
            name: c.name,
            role: c.personality,
            traits: c.visualIdentity
          })),
          namingPolicy
        ).map((c, i) => ({
          ...partial.characters[i]!,
          name: c.name,
          personality: `${c.role}. ${c.traits}`.trim() || partial.characters[i]!.personality
        }))
      }
      if (namingPolicy.mode === 'names' && mainChar && bible.characters[0]) {
        bible.characters[0] = { ...bible.characters[0], name: mainChar }
      }
      useStudioStore.getState().patchWorkspaceProject(workspaceIx, (p) => ({
        ...p,
        title: resolvedTitle,
        bible,
        status: 'in_progress',
        memorySummary: `- ${bible.concept}`,
        episodes: [],
        narration: p.narration ?? narrationDraft,
        updatedAt: new Date().toISOString()
      }))
      void pushStoryToHistory(useStudioStore.getState().workspaceSlots[workspaceIx]?.project ?? null)
      if (styleId === 'custom') {
        useStudioStore.getState().touchRecentCustomStyle(customVisualPrompt.trim())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
      if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
    }
  }, [
    idea,
    styleId,
    customVisualPrompt,
    narratorId,
    narrationDraft,
    storyLanguage,
    uiLanguage,
    setBusy,
    setError,
    uiText
  ])

  const generateEpisode = useCallback(
    async (episodeNumber: number) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
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
        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => {
          const without = cur.episodes.filter((e) => e.number !== episodeNumber)
          const fingerprints = [...cur.contentFingerprints, fp].slice(-200)
          const episodes = [...without, ep].sort((a, b) => a.number - b.number)
          const b = cur.bible
          const te = b ? b.totalEpisodes : 0
          const seriesDone =
            Boolean(b) && episodeNumber === te && episodes.length >= te
          return {
            ...cur,
            episodes,
            contentFingerprints: fingerprints,
            status: seriesDone ? 'completed' : cur.status
          }
        })
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) {
          useStudioStore.getState().setSelectedEpisode(episodeNumber)
        }
        const projNow = useStudioStore.getState().workspaceSlots[workspaceIx]?.project
        if (!projNow) throw new Error('Project missing after update')
        const memUser = buildMemoryUpdatePrompt(projNow, raw)
        try {
          const mem = await ai(
            CORE_STORY_RULES,
            `Return ONLY the bullet list per instructions.\n${memUser}`,
            'openai',
            1024
          )
          useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => ({
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
            useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => ({
              ...cur,
              memorySummary: mem.split('\n').slice(0, 16).join('\n').slice(0, 4000)
            }))
          } catch {
            /* optional */
          }
        }
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) touch()
        void pushStoryToHistory(useStudioStore.getState().workspaceSlots[workspaceIx]?.project ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, touch]
  )

  const regenerateScene = useCallback(
    async (episodeNumber: number, sceneIndex: number) => {
      const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
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
        useStudioStore.getState().patchWorkspaceProject(workspaceIx, (cur) => ({
          ...cur,
          episodes: cur.episodes.map((e) => (e.number === episodeNumber ? merged : e))
        }))
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) touch()
        void pushStoryToHistory(useStudioStore.getState().workspaceSlots[workspaceIx]?.project ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setBusy(null)
      }
    },
    [setBusy, setError, touch]
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
