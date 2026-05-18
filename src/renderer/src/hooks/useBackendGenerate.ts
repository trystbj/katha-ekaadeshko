import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { defaultProject, newProjectId } from '../types/story'
import type { JobsStreamGenerateResult } from '../types/kathaGenerate'
import type { AssetRef, StoryBible, StoryEpisode, StoryScene, VisualStyleId } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'
import { pushStoryToCloudIfSignedIn, pushStoryToHistory } from '../utils/storyHistory'
import { inferCountryFromLanguageCode } from '../utils/inferCountryFromLanguage'
import { getVisualPackExtraPrompt } from '../utils/visualThemePackExtras'
import { buildLiveRevealDocument } from '../utils/liveRevealDocument'
import { sseLiveStatusHint } from '../utils/sseLiveStatus'
import {
  buildStreamSeriesOutline,
  plannedTotalEpisodesFromStreamSetup
} from '../utils/episodeSeriesFlow'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'
import { drainSseBuffer } from '../utils/parseSseStream'
import { clampStoryIdea } from '../constants/storyIdeaLimits'

export function useBackendGenerate() {
  const uiText = useUiText()
  const setBusy = useStudioStore((s) => s.setBusy)
  const setError = useStudioStore((s) => s.setError)
  const setJob = useStudioStore((s) => s.setJob)
  const setWorkspaceBusy = useStudioStore((s) => s.setWorkspaceBusy)
  const setWorkspaceError = useStudioStore((s) => s.setWorkspaceError)

  const backendTheme = useStudioStore((s) => s.backendTheme)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const backendLength = useStudioStore((s) => s.backendLength)
  const styleId = useStudioStore((s) => s.styleId)
  const customVisualPrompt = useStudioStore((s) => s.customVisualPrompt)
  const narratorId = useStudioStore((s) => s.narratorId)
  const narrationDraft = useStudioStore((s) => s.narrationDraft)
  const uiLanguage = useStudioStore((s) => s.uiLanguage)
  const storyLanguage = useStudioStore((s) => s.storyLanguage)
  const storyCountry = useStudioStore((s) => s.storyCountry)
  const uiFontMode = useStudioStore((s) => s.uiFontMode)
  const visualPackId = useStudioStore((s) => s.visualPackId)

  const generate = useCallback(async () => {
    const workspaceIx = useStudioStore.getState().activeWorkspaceSlotIndex
    setWorkspaceError(workspaceIx, null)
    setWorkspaceBusy(workspaceIx, 'generating')
    if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) {
      setError(null)
      setBusy('generating')
      setJob(null)
    }
    try {
      if (
        !styleId ||
        !narratorId ||
        !backendTheme.trim() ||
        !backendGenre.trim() ||
        !backendLength.trim() ||
        !uiLanguage ||
        !storyLanguage
      ) {
        throw new Error(uiText('generateMissingFields'))
      }
      const idea = useStudioStore.getState().idea.trim()
      if (idea.length < 2) throw new Error(uiText('generateIdeaTooShort'))
      if (styleId === 'custom' && !customVisualPrompt.trim()) throw new Error(uiText('generateMissingFields'))
      const country =
        storyCountry.trim() || inferCountryFromLanguageCode(storyLanguage || uiLanguage)

      const stGen = useStudioStore.getState()
      const wsProject = stGen.workspaceSlots[workspaceIx]?.project
      const priorMemorySummary = wsProject?.memorySummary?.trim() || ''
      const priorWorldState = wsProject?.worldStateSnapshot ?? undefined
      const priorRelationships = wsProject?.relationshipSnapshot ?? undefined
      const creatorPreferences = wsProject?.creatorPreferences ?? undefined
      const projectId = wsProject?.id || newProjectId()
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      const accent = getVisualPackExtraPrompt(visualPackId)
      const themeEnriched = [
        backendTheme.trim(),
        `Seed: ${idea}`,
        stGen.storyTone ? `Tone:${stGen.storyTone}` : '',
        stGen.episodeChainPreferred ? 'Serialized chain' : ''
      ]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 920)

      const visualAccent = accent.trim()
      const toneRaw = useStudioStore.getState().storyTone
      const ac = new AbortController()
      useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, ac)

      const res = await fetch('/api/jobs-stream-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          theme: themeEnriched,
          country,
          genre: backendGenre,
          length: backendLength,
          aspectMode: 'vertical_9_16',
          narratorId,
          narratorIdentity: narratorIdentityForId(narratorId),
          narration: narrationDraft,
          autoVoiceDirector: narrationDraft.autoVoiceDirector,
          narratorGenderPreference: narrationDraft.narratorGenderPreference ?? 'auto',
          storyLanguage,
          styleId: styleId as VisualStyleId,
          ...(styleId === 'custom' ? { customVisualPrompt: customVisualPrompt.trim() } : {}),
          ...(visualAccent ? { visualAccent } : {}),
          ...(toneRaw ? { storyTone: toneRaw } : {}),
          seedLine: clampStoryIdea(idea),
          projectId,
          ...(priorMemorySummary ? { priorMemorySummary } : {}),
          ...(priorWorldState ? { priorWorldState } : {}),
          ...(priorRelationships?.length ? { priorRelationships } : {}),
          ...(creatorPreferences ? { creatorPreferences } : {}),
          ...(prefersReducedMotion ? { performancePreferLow: true } : {})
        })
      })
      if (!res.ok) throw new Error(await res.text())
      if (!res.body) throw new Error('No response body (browser blocked streaming?)')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let out: JobsStreamGenerateResult | null = null
      let lastError: string | null = null
      let sawStreamActivity = false
      const log: string[] = []

      const handleEvents = (events: Record<string, unknown>[]) => {
        for (const evt of events) {
          if (evt.type === 'job' || evt.type === 'progress' || evt.type === 'result' || evt.type === 'error') {
            sawStreamActivity = true
          }
          if (evt.type === 'job') {
            useStudioStore.getState().setWorkspaceJob(workspaceIx, {
              id: evt.id as string | null,
              stage: 'starting',
              progress: 0,
              log: []
            })
          } else if (evt.type === 'progress') {
            const msg = evt.message ? String(evt.message) : String(evt.stage || '')
            const hintKey = sseLiveStatusHint(String(evt.stage || ''), msg)
            log.push(hintKey ? uiText(hintKey) : msg)
            const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
            useStudioStore.getState().setWorkspaceJob(workspaceIx, {
              id: stJob?.id || 'job',
              stage: String(evt.stage || ''),
              progress: Number(evt.progress || 0),
              log: log.slice(-60)
            })
          } else if (evt.type === 'result') {
            out = evt.result as JobsStreamGenerateResult
          } else if (evt.type === 'error') {
            const errMsg = String(evt.error || 'Generation failed')
            lastError = errMsg
            throw new Error(errMsg)
          }
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (value) buf += dec.decode(value, { stream: true })
        if (done) {
          buf += dec.decode()
          break
        }
        const drained = drainSseBuffer(buf)
        buf = drained.rest
        handleEvents(drained.events)
      }

      const tail = drainSseBuffer(buf)
      handleEvents(tail.events)

      if (!out) {
        if (lastError) throw new Error(lastError)
        if (sawStreamActivity || log.length > 0) {
          throw new Error(
            'Generation stopped before finishing (server time limit or connection closed). Try again — use a shorter length, or redeploy the latest build.'
          )
        }
        throw new Error(
          'Story generation did not start (no stream from server). Check that OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY is set on Vercel and redeploy.'
        )
      }

      const pipelineImages: { image_url?: string; imageUrl?: string; scene?: string | number; prompt?: string }[] =
        Array.isArray(out.images) ? out.images : []

      const assetsFromPipeline: AssetRef[] = []
      for (let i = 0; i < pipelineImages.length; i++) {
        const row = pipelineImages[i]
        const url = row?.image_url || row?.imageUrl
        if (!url || typeof url !== 'string') continue
        assetsFromPipeline.push({
          id: `a_${newProjectId()}`,
          kind: 'scene',
          key: `scene:${String(row.scene ?? i + 1)}`,
          url,
          prompt: String(row.prompt ?? ''),
          createdAt: new Date().toISOString()
        })
      }

      const st = useStudioStore.getState()
      const mainChar = st.mainCharacterName.trim()
      const titleFromUser = st.workingTitle.trim()

      const baseChars = out.story.characters.map(
        (c: { name: string; role: string; traits: string }, i: number) => {
          const thumb = pipelineImages[i]?.image_url || pipelineImages[i]?.imageUrl
          const name0 = i === 0 && mainChar ? mainChar : c.name
          return {
            id: `c${i + 1}`,
            name: name0,
            personality: `${c.role}. ${c.traits}`.trim(),
            visualIdentity: `${c.traits}`.trim() || c.role,
            baseImagePrompt: `${name0}, ${c.role}, ${c.traits}`,
            ...(thumb ? { baseImageUrl: String(thumb) } : {})
          }
        }
      )

      const resolvedTitle = titleFromUser || out.story.title
      const stChain = useStudioStore.getState().episodeChainPreferred
      const seriesEpisodes = plannedTotalEpisodesFromStreamSetup(backendLength, stChain)
      const bible: StoryBible = {
        title: resolvedTitle,
        concept: out.story.setting,
        characters: baseChars,
        totalEpisodes: seriesEpisodes,
        outline: buildStreamSeriesOutline(seriesEpisodes, country, backendTheme, backendGenre, resolvedTitle),
        userIdea: idea,
        styleId: styleId as VisualStyleId,
        customVisualPrompt: styleId === 'custom' ? customVisualPrompt.trim() : undefined,
        language: storyLanguage,
        aspectMode: 'vertical_9_16',
        narratorId,
        narration: narrationDraft
      }

      const scenes: StoryScene[] = []
      for (const s of out.script) {
        const narration = typeof s.narration === 'string' ? s.narration : ''
        const visualDescription =
          typeof s.visual_description === 'string' ? s.visual_description : undefined
        scenes.push({
          index: scenes.length + 1,
          lineType: 'Dialogue',
          character: 'Narration',
          text: narration,
          visualDescription
        })
      }

      const cliffPlan = out.metadata?.cinematicDirectorPlan as
        | { cliffhanger?: { suggestedLine?: string } }
        | undefined
      const cliffLine = cliffPlan?.cliffhanger?.suggestedLine?.trim() || '—'

      const episode1: StoryEpisode = {
        number: 1,
        pacing: 'Normal',
        estimatedDurationSec: 90,
        scenes: scenes.slice(0, 10),
        cliffhanger: cliffLine.slice(0, 280) || '—',
        rawStructured: JSON.stringify(out, null, 2),
        status: 'done',
        ...(out.metadata?.ambientBedUrl ? { ambientBedUrl: out.metadata.ambientBedUrl } : {}),
        ...(out.metadata?.storyAudioPlan ? { storyAudioPlan: out.metadata.storyAudioPlan } : {}),
        ...(out.metadata?.cinematicDirectorPlan
          ? { cinematicDirectorPlan: out.metadata.cinematicDirectorPlan }
          : {}),
        ...(out.metadata?.storyMemorySnapshot
          ? { storyMemorySnapshot: out.metadata.storyMemorySnapshot }
          : {})
      }

      const memoryPatch =
        typeof out.metadata?.memorySummaryPatch === 'string'
          ? out.metadata.memorySummaryPatch.trim()
          : ''
      const memorySeed = [
        memoryPatch ||
          [
            `- Setting: ${out.story.setting}`,
            `- Episode 1 establishes tone; preserve bible characters, narrator (${narratorId}), and ${styleId} across the ${seriesEpisodes}-episode arc.`,
            stChain ? '- Serialized chain: honor cliffhangers and evolving costumes / relationships.' : ''
          ]
            .filter(Boolean)
            .join('\n')
      ]
        .filter(Boolean)
        .join('\n')

      const nextProject = defaultProject({
        title: resolvedTitle,
        status: 'in_progress',
        bible,
        episodes: [episode1],
        memorySummary: memorySeed.slice(0, 4000),
        id: projectId,
        ...(out.metadata?.worldStateSnapshot
          ? { worldStateSnapshot: out.metadata.worldStateSnapshot }
          : {}),
        ...(out.metadata?.relationshipSnapshot?.length
          ? { relationshipSnapshot: out.metadata.relationshipSnapshot }
          : {}),
        ...(out.metadata?.creatorPreferencesPatch
          ? { creatorPreferences: out.metadata.creatorPreferencesPatch }
          : {}),
        qualityMerge: true,
        fontMode: uiFontMode,
        assets: assetsFromPipeline,
        narration: narrationDraft
      })

      const prefersReduced =
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

      if (prefersReduced) {
        if (styleId === 'custom') {
          useStudioStore.getState().touchRecentCustomStyle(customVisualPrompt.trim())
        }
        useStudioStore.getState().setWorkspaceProject(workspaceIx, nextProject)
        void pushStoryToHistory(nextProject)
        void pushStoryToCloudIfSignedIn(nextProject)
      } else {
        const doc = buildLiveRevealDocument(out)
        // Stream reveal is UI-only; keep it pinned to the workspace that triggered the job.
        useStudioStore.getState().setWorkspaceStreamReveal(workspaceIx, {
          fullDoc: doc,
          visibleLen: 0,
          paused: false,
          typingSound:
            typeof localStorage !== 'undefined' && localStorage.getItem('katha_live_typing_sound') === '1',
          pendingProject: nextProject
        })
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) {
          useStudioStore.getState().startStreamReveal(doc, nextProject)
        }
      }
    } catch (e) {
      useStudioStore.getState().setWorkspaceStreamReveal(workspaceIx, null)
      const msg = e instanceof Error ? e.message : String(e)
      if (e instanceof Error && e.name === 'AbortError') {
        setWorkspaceError(workspaceIx, null)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setError(null)
      } else {
        setWorkspaceError(workspaceIx, msg)
        if (workspaceIx === useStudioStore.getState().activeWorkspaceSlotIndex) setError(msg)
      }
    } finally {
      useStudioStore.getState().setWorkspaceGenerationAbort(workspaceIx, null)
      const active = useStudioStore.getState().activeWorkspaceSlotIndex
      const sr = useStudioStore.getState().workspaceRuntime[workspaceIx]?.streamReveal
      if (!sr) useStudioStore.getState().setWorkspaceBusy(workspaceIx, null)
      if (active === workspaceIx) {
        useStudioStore.getState().setGenerationAbort(null)
        if (!useStudioStore.getState().streamReveal) setBusy(null)
      }
    }
  }, [
    setBusy,
    setError,
    setJob,
    setWorkspaceBusy,
    setWorkspaceError,
    backendTheme,
    backendGenre,
    backendLength,
    styleId,
    customVisualPrompt,
    narratorId,
    narrationDraft,
    uiFontMode,
    uiLanguage,
    storyLanguage,
    storyCountry,
    uiText,
    visualPackId
  ])

  return { generate }
}

