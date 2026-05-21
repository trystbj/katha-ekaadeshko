import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { defaultProject, newProjectId } from '../types/story'
import type { JobsStreamGenerateResult } from '../types/kathaGenerate'
import type {
  CharacterIdentitySlot,
  StoryBible,
  StoryEpisode,
  StoryScene,
  VisualStyleId
} from '../types/story'
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
import { episodeSceneImageCoverage, withStoryboardReady } from '../utils/storyboardWorkflow'
import {
  attachSceneGenerationStatuses,
  buildEpisodeScenesFromScriptRows,
  filterAssetsToSceneIndices
} from '../utils/scenePipelineStatus'
import { defaultVideoStudioState } from '../types/videoStudio'
import {
  analyzeNamingPolicy,
  buildCharacterIdentityMemory,
  sanitizeStoryCharacters
} from '@shared/characterNamingPolicy.js'
import {
  buildProjectMemoryPatch,
  mergeProjectMemoryIntoPreferences
} from '@shared/projectMemory.js'
import {
  buildSceneAssetsFromPipeline,
  mergeProjectAssets
} from '../utils/sceneAssetMap'

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
          ...(wsProject?.characterReference ? { characterReference: wsProject.characterReference } : {}),
          ...(wsProject?.bible?.characters?.length
            ? {
                bibleCharacters: wsProject.bible.characters.map((c) => ({
                  name: c.name,
                  gender: c.gender,
                  age: c.age,
                  appearance: c.appearance || c.visualIdentity,
                  visualIdentity: c.visualIdentity,
                  referenceImages: c.referenceImages
                }))
              }
            : {}),
          ...(prefersReducedMotion
            ? { performancePreferLow: true }
            : { studioOrchestration: true, multiCharacterVoices: true })
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
              id: evt.id != null ? String(evt.id) : 'job',
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

      const pipelineResult: JobsStreamGenerateResult = out

      const pipelineImages: { image_url?: string; imageUrl?: string; scene?: string | number; prompt?: string }[] =
        Array.isArray(pipelineResult.images) ? pipelineResult.images : []

      const namingPolicy = analyzeNamingPolicy(idea, themeEnriched)
      const sanitizedCast = sanitizeStoryCharacters(
        Array.isArray(pipelineResult.story?.characters) ? pipelineResult.story.characters : [],
        namingPolicy
      )
      console.info('[katha:character]', 'client_cast_policy', {
        mode: namingPolicy.mode,
        count: sanitizedCast.length
      })

      const priorAssets = wsProject?.assets ?? []
      const assetsFromPipeline = buildSceneAssetsFromPipeline(pipelineImages)
      const mergedAssets = mergeProjectAssets(priorAssets, assetsFromPipeline)

      const st = useStudioStore.getState()
      const mainChar = st.mainCharacterName.trim()
      const titleFromUser = st.workingTitle.trim()
      const allowCustomName = namingPolicy.mode === 'names'

      const priorChars = wsProject?.bible?.characters ?? []
      const baseChars = sanitizedCast.map(
        (c: { name: string; role: string; traits: string }, i: number) => {
          const name0 = allowCustomName && i === 0 && mainChar ? mainChar : c.name
          const prior = priorChars.find(
            (p) => p.name.trim().toLowerCase() === name0.trim().toLowerCase()
          ) ?? priorChars[i]
          return {
            id: prior?.id ?? `c${i + 1}`,
            name: name0,
            personality: `${c.role}. ${c.traits}`.trim(),
            visualIdentity: prior?.visualIdentity || `${c.traits}`.trim() || c.role,
            baseImagePrompt: prior?.baseImagePrompt || `${name0}, ${c.role}, ${c.traits}`,
            ...(prior?.referenceImages?.length ? { referenceImages: prior.referenceImages } : {}),
            ...(prior?.gender ? { gender: prior.gender } : {}),
            ...(prior?.age ? { age: prior.age } : {}),
            ...(prior?.role || c.role ? { role: prior?.role || c.role } : {}),
            ...(prior?.appearance ? { appearance: prior.appearance } : {}),
            ...(prior?.baseImageUrl ? { baseImageUrl: prior.baseImageUrl } : {}),
            ...(prior?.leonardoSeed != null ? { leonardoSeed: prior.leonardoSeed } : {})
          }
        }
      )
      const characterIdentityMemory = buildCharacterIdentityMemory(
        baseChars
      ) as CharacterIdentitySlot[]

      const resolvedTitle = titleFromUser || pipelineResult.story.title
      const stChain = useStudioStore.getState().episodeChainPreferred
      const seriesEpisodes = plannedTotalEpisodesFromStreamSetup(backendLength, stChain)
      const bible: StoryBible = {
        title: resolvedTitle,
        concept: pipelineResult.story.setting,
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

      const scriptRows = Array.isArray(pipelineResult.script) ? pipelineResult.script : []
      if (!scriptRows.length) {
        throw new Error(
          'Story finished but the screenplay was empty. Try again with a shorter seed or different length.'
        )
      }

      const targetSceneCount = Math.min(
        16,
        Math.max(
          6,
          Number(
            (pipelineResult.metadata?.longStoryIntelligence as { targetSceneCount?: number } | undefined)
              ?.targetSceneCount
          ) || Math.min(scriptRows.length, 10)
        )
      )
      const { scenes, sceneIndices } = buildEpisodeScenesFromScriptRows(scriptRows, targetSceneCount)
      const filteredAssets = filterAssetsToSceneIndices(mergedAssets, sceneIndices)
      console.info('[katha:story-writing]', 'studio_scenes_built', {
        scriptRows: scriptRows.length,
        episodeScenes: scenes.length,
        withDialogue: scenes.filter((sc) => (sc.dialogueLines?.length ?? 0) > 0).length,
        sceneIndices: scenes.map((sc) => sc.index).join(',')
      })

      const cliffPlan = pipelineResult.metadata?.cinematicDirectorPlan as
        | { cliffhanger?: { suggestedLine?: string } }
        | undefined
      const cliffLine = cliffPlan?.cliffhanger?.suggestedLine?.trim() || '—'

      const audioRows = Array.isArray(pipelineResult.audio)
        ? (pipelineResult.audio as { scene?: string | number; audio_url?: string }[])
        : []
      const narrationAudioUrl = audioRows.map((r) => r?.audio_url).find((u) => typeof u === 'string' && u.length > 0)

      const episode1: StoryEpisode = {
        number: 1,
        pacing: 'Normal',
        estimatedDurationSec: 90,
        scenes,
        cliffhanger: cliffLine.slice(0, 280) || '—',
        rawStructured: JSON.stringify(pipelineResult, null, 2),
        status: 'done',
        ...(pipelineResult.metadata?.ambientBedUrl
          ? { ambientBedUrl: pipelineResult.metadata.ambientBedUrl }
          : {}),
        ...(narrationAudioUrl ? { narrationAudioUrl: String(narrationAudioUrl) } : {}),
        ...(pipelineResult.metadata?.storyAudioPlan
          ? { storyAudioPlan: pipelineResult.metadata.storyAudioPlan }
          : {}),
        ...(pipelineResult.metadata?.cinematicDirectorPlan
          ? { cinematicDirectorPlan: pipelineResult.metadata.cinematicDirectorPlan }
          : {}),
        ...(pipelineResult.metadata?.renderAssemblyPlan
          ? { renderAssemblyPlan: pipelineResult.metadata.renderAssemblyPlan }
          : {}),
        ...(pipelineResult.metadata?.storyMemorySnapshot
          ? { storyMemorySnapshot: pipelineResult.metadata.storyMemorySnapshot }
          : {}),
        ...(pipelineResult.metadata?.qualityReport
          ? { qualityReport: pipelineResult.metadata.qualityReport }
          : {})
      }

      const memoryPatch =
        typeof pipelineResult.metadata?.memorySummaryPatch === 'string'
          ? pipelineResult.metadata.memorySummaryPatch.trim()
          : ''
      const memorySeed = [
        memoryPatch ||
          [
            `- Setting: ${pipelineResult.story.setting}`,
            `- Episode 1 establishes tone; preserve bible characters, narrator (${narratorId}), and ${styleId} across the ${seriesEpisodes}-episode arc.`,
            stChain ? '- Serialized chain: honor cliffhangers and evolving costumes / relationships.' : ''
          ]
            .filter(Boolean)
            .join('\n')
      ]
        .filter(Boolean)
        .join('\n')

      const baseProject = defaultProject({
        title: resolvedTitle,
        status: 'in_progress',
        bible,
        episodes: [episode1],
        memorySummary: memorySeed.slice(0, 4000),
        id: projectId,
        videoStudio: defaultVideoStudioState(resolvedTitle),
        ...(pipelineResult.metadata?.worldStateSnapshot
          ? { worldStateSnapshot: pipelineResult.metadata.worldStateSnapshot }
          : {}),
        ...(pipelineResult.metadata?.relationshipSnapshot?.length
          ? { relationshipSnapshot: pipelineResult.metadata.relationshipSnapshot }
          : {}),
        ...(pipelineResult.metadata?.creatorPreferencesPatch ||
        pipelineResult.metadata?.cinematicDirectorPlan
          ? {
              creatorPreferences: mergeProjectMemoryIntoPreferences(
                pipelineResult.metadata?.creatorPreferencesPatch as Record<string, unknown> | undefined,
                buildProjectMemoryPatch(
                  {
                    bible,
                    narration: narrationDraft,
                    characterIdentityMemory,
                    videoStudio: defaultVideoStudioState(resolvedTitle)
                  },
                  episode1,
                  pipelineResult.metadata
                )
              )
            }
          : {}),
        qualityMerge: true,
        fontMode: uiFontMode,
        assets: filteredAssets,
        ...(wsProject?.characterReference ? { characterReference: wsProject.characterReference } : {}),
        namingPolicyMode: namingPolicy.mode,
        characterIdentityMemory,
        narration: narrationDraft,
        projectMemory: buildProjectMemoryPatch(
          { bible, narration: narrationDraft, characterIdentityMemory },
          episode1,
          pipelineResult.metadata
        )
      })
      const cov = episodeSceneImageCoverage(baseProject, 1)
      const withStatuses = {
        ...baseProject,
        episodes: [
          {
            ...episode1,
            scenes: attachSceneGenerationStatuses(baseProject, 1, Boolean(narrationAudioUrl))
          }
        ]
      }
      const nextProject = withStoryboardReady(withStatuses, {
        partial: cov.missing.length > 0,
        missingSceneIndices: cov.missing
      })
      console.info('[katha:storyboard]', 'storyboard_ready', {
        projectId,
        sceneAssets: filteredAssets.filter((a) => a.kind === 'scene').length,
        scenes: episode1.scenes.length,
        missingImages: cov.missing.length
      })
      console.info('[katha:render]', 'auto_render_skipped', { reason: 'manual_final_video_only' })

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
        const doc = buildLiveRevealDocument(pipelineResult)
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

