import { useCallback } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { defaultProject, newProjectId } from '../types/story'
import type { JobsStreamGenerateResult } from '../types/kathaGenerate'
import type {
  CharacterIdentitySlot,
  StoryBible,
  StoryEpisode,
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
import {
  buildEpisodeScenesFromScriptRows,
  filterAssetsToSceneIndices
} from '../utils/scenePipelineStatus'
import { defaultVideoStudioState } from '../types/videoStudio'
import {
  analyzeNamingPolicy,
  buildCharacterIdentityMemory,
  enrichStoryCharacterProfiles,
  sanitizeStoryCharacters
} from '@shared/characterNamingPolicy.js'
import {
  buildProjectMemoryPatch,
  mergeProjectMemoryIntoPreferences
} from '@shared/projectMemory.js'
import { mergeProjectAssets } from '../utils/sceneAssetMap'
import { withScriptReviewReady } from '../utils/productionWorkflow'
import { formatApiError } from '../utils/formatApiError'
import { normalizeStudioErrorMessage } from '../utils/formatStudioError'
import { serializePipelineError, taskStateFromStage } from '../utils/studioTaskState'
import {
  clearPipelineResume,
  loadPipelineResume,
  savePipelineResume,
  type PipelineResumePayload
} from '../utils/pipelineResumeStorage'

const GENERATE_FAIL_FALLBACK =
  'Story generation failed. Open /api/health in your browser — if storyAiReady is false, add OPENAI_API_KEY (or GEMINI/DEEPSEEK) in Vercel env and redeploy. Local: npm run dev:vercel.'

function humanizeGenerateError(
  msg: string,
  uiText: (key: string, vars?: Record<string, string | number | boolean | null>) => string
): string {
  const t = formatApiError(msg, msg.trim()).trim()
  if (!t || t === '[object Object]' || /^request failed$/i.test(t)) {
    const localized = uiText('generateOpaqueFailure')
    return localized === 'generateOpaqueFailure' ? GENERATE_FAIL_FALLBACK : localized
  }
  return normalizeStudioErrorMessage(t) || t
}

function formatStreamError(
  evt: Record<string, unknown>,
  uiText: (key: string, vars?: Record<string, string | number | boolean | null>) => string
): string {
  const rawMain = serializePipelineError(evt.error, 'Generation failed')
  const detail = String(evt.detail || '').trim()
  const main = humanizeGenerateError(rawMain, uiText)
  const normalizedMain = normalizeStudioErrorMessage(main) || main
  if (/timed out|60s limit|shorter story|progress was saved/i.test(`${rawMain} ${detail}`)) {
    console.error('[katha:generate] stream_error_timeout', {
      error: evt.error,
      build: evt.build
    })
    return uiText('generateTimeoutResume')
  }
  const build = String(evt.build || '').trim()
  const code = String(evt.code || '').trim()
  const detailIsDup =
    !detail ||
    detail === rawMain ||
    detail === main ||
    main.includes(detail) ||
    detail.includes(main) ||
    /timed out|60s limit|shorter story|server time limit|generate again/i.test(detail)
  let out = detailIsDup ? normalizedMain : normalizeStudioErrorMessage(`${normalizedMain} — ${detail}`) || normalizedMain
  if (import.meta.env.DEV && build) out = `${out} (API build ${build})`
  if (import.meta.env.DEV && code && code !== 'pipeline') out = `${out} [${code}]`
  console.error('[katha:generate] stream_error', { error: evt.error, detail, build, code })
  return normalizeStudioErrorMessage(out) || normalizedMain
}

async function readGenerateHttpError(
  res: Response,
  uiText: (key: string, vars?: Record<string, string | number | boolean | null>) => string
): Promise<string> {
  if (res.status === 404) return uiText('generateApiUnavailable')
  const text = (await res.text()).trim()
  try {
    const j = JSON.parse(text) as { error?: string }
    if (typeof j?.error === 'string' && j.error.trim()) {
      return humanizeGenerateError(j.error.trim(), uiText)
    }
  } catch {
    /* plain text / SSE fragment */
  }
    if (text.length > 0 && text.length < 500 && !text.startsWith('<!')) {
    return humanizeGenerateError(text, uiText)
  }
  return uiText('generateRequestFailed', { status: String(res.status) })
}

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

      const healthUrl = import.meta.env.VITE_BACKEND_URL
        ? `${String(import.meta.env.VITE_BACKEND_URL).replace(/\/+$/, '')}/api/health`
        : '/api/health'
      try {
        const healthRes = await fetch(healthUrl, { method: 'GET', signal: ac.signal })
        if (!healthRes.ok) throw new Error(uiText('generateApiUnavailable'))
        const health = (await healthRes.json()) as {
          ready?: boolean
          storyAiReady?: boolean
          build?: string
          providers?: { openai?: boolean; gemini?: boolean; deepseek?: boolean }
        }
        const ready = health?.storyAiReady ?? health?.ready
        if (!ready) {
          const prov = health?.providers
          const hint = prov
            ? ` Keys on server: OpenAI=${prov.openai ? 'yes' : 'no'}, Gemini=${prov.gemini ? 'yes' : 'no'}, DeepSeek=${prov.deepseek ? 'yes' : 'no'}.`
            : ''
          throw new Error(`${uiText('generateNoAiKeys')}${hint}`)
        }
        if (health?.build) {
          console.info('[katha:generate] api_build', health.build)
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') throw e
        if (e instanceof Error && e.message === uiText('generateNoAiKeys')) throw e
        if (e instanceof Error && e.message === uiText('generateApiUnavailable')) throw e
        throw new Error(uiText('generateNetworkError'))
      }

      const streamRequestBase = {
        theme: themeEnriched,
        country,
        genre: backendGenre,
        length: backendLength,
        aspectMode: 'vertical_9_16' as const,
        narratorId,
        narratorIdentity: narratorIdentityForId(narratorId),
        narration: narrationDraft,
        autoVoiceDirector: narrationDraft.autoVoiceDirector,
        narratorGenderPreference: narrationDraft.narratorGenderPreference ?? 'auto',
        storyLanguage,
        screenplayLanguage: 'en',
        outputLanguage: 'English',
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
        scriptOnly: true,
        generationMode: prefersReducedMotion ? 'fast' : 'cinematic',
        performancePreferLow: true
      }

      const savedResume = loadPipelineResume(projectId)

      const consumeStream = async (response: Response): Promise<JobsStreamGenerateResult> => {
        if (!response.ok) {
          const httpErr = await readGenerateHttpError(response, uiText)
          console.error('[katha:generate] http_error', response.status, httpErr)
          throw new Error(httpErr)
        }
        if (!response.body) throw new Error('No response body (browser blocked streaming?)')

        const reader = response.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let out: JobsStreamGenerateResult | null = null
        let lastError: string | null = null
        let sawStreamActivity = false
        const log: string[] = []

        const handleEvents = (events: Record<string, unknown>[]) => {
          for (const evt of events) {
            if (
              evt.type === 'job' ||
              evt.type === 'progress' ||
              evt.type === 'result' ||
              evt.type === 'error' ||
              evt.type === 'checkpoint'
            ) {
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
              const stage = String(evt.stage || '')
              const phase = taskStateFromStage(stage)
              if (phase === 'generating_images') {
                useStudioStore.getState().setWorkspaceBusy(workspaceIx, 'leonardo')
              } else if (phase === 'validating_scenes') {
                useStudioStore.getState().setWorkspaceBusy(workspaceIx, 'validating')
              } else if (phase !== 'idle' && phase !== 'completed' && phase !== 'failed') {
                useStudioStore.getState().setWorkspaceBusy(workspaceIx, 'generating')
              }
              const msg = evt.message ? String(evt.message) : stage
              const hintKey = sseLiveStatusHint(stage, msg)
              log.push(hintKey ? uiText(hintKey) : msg)
              const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
              useStudioStore.getState().setWorkspaceJob(workspaceIx, {
                id: stJob?.id || 'job',
                stage: String(evt.stage || ''),
                progress: Number(evt.progress || 0),
                log: log.slice(-60)
              })
            } else if (evt.type === 'checkpoint') {
              const ckMsg = evt.message ? String(evt.message) : uiText('liveGenSseCheckpoint')
              log.push(ckMsg)
              const stJob = useStudioStore.getState().workspaceRuntime[workspaceIx]?.job
              useStudioStore.getState().setWorkspaceJob(workspaceIx, {
                id: stJob?.id || 'job',
                stage: String(evt.checkpoint || 'checkpoint'),
                progress: stJob?.progress ?? 40,
                log: log.slice(-60)
              })
            } else if (evt.type === 'result') {
              out = evt.result as JobsStreamGenerateResult
            } else if (evt.type === 'error') {
              const errMsg = formatStreamError(evt, uiText)
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
            throw new Error(uiText('generateStoppedResume'))
          }
          throw new Error(
            'Story generation did not start (no stream from server). Check that OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY is set on Vercel and redeploy.'
          )
        }
        return out
      }

      const resumePayloadFromResult = (
        story: JobsStreamGenerateResult['story'],
        meta?: JobsStreamGenerateResult['metadata']
      ): PipelineResumePayload => ({
        projectId,
        savedAt: new Date().toISOString(),
        story,
        masterStoryContext: meta?.masterStoryContext as Record<string, unknown> | undefined,
        request: { ...streamRequestBase }
      })

      let pipelineResult: JobsStreamGenerateResult

      if (savedResume?.story) {
        console.info('[katha:generate] resume_from_storage', { projectId })
        useStudioStore.getState().setWorkspaceJob(workspaceIx, {
          id: 'job',
          stage: 'script_resume',
          progress: 42,
          log: [uiText('liveGenSseScriptResume')]
        })
        pipelineResult = {
          story: savedResume.story,
          script: [],
          images: [],
          audio: [],
          metadata: {
            pipelineCheckpoint: 'story_ready',
            pipelineYielded: true,
            pipelineResumable: true,
            ...(savedResume.masterStoryContext
              ? { masterStoryContext: savedResume.masterStoryContext }
              : {})
          }
        }
      } else {
        const res = await fetch('/api/jobs-stream-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({ ...streamRequestBase, pipelinePhase: 'story' })
        })
        pipelineResult = await consumeStream(res)
      }

      const needsScriptPhase =
        pipelineResult.story &&
        (!Array.isArray(pipelineResult.script) || pipelineResult.script.length === 0) &&
        (pipelineResult.metadata?.pipelineCheckpoint === 'story_ready' ||
          pipelineResult.metadata?.pipelineYielded === true ||
          Boolean(savedResume?.story))

      if (needsScriptPhase && pipelineResult.story) {
        savePipelineResume(resumePayloadFromResult(pipelineResult.story, pipelineResult.metadata))
        useStudioStore.getState().setWorkspaceJob(workspaceIx, {
          id: 'job',
          stage: 'script_resume',
          progress: 42,
          log: [uiText('liveGenSseScriptResume')]
        })
        try {
          const resScript = await fetch('/api/jobs-stream-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify({
              ...streamRequestBase,
              pipelinePhase: 'script',
              resumeStory: pipelineResult.story,
              ...(pipelineResult.metadata?.masterStoryContext
                ? { masterStoryContext: pipelineResult.metadata.masterStoryContext }
                : {})
            })
          })
          const scriptPhase = await consumeStream(resScript)
          pipelineResult = {
            ...scriptPhase,
            story: scriptPhase.story || pipelineResult.story
          }
        } catch (scriptErr) {
          savePipelineResume(resumePayloadFromResult(pipelineResult.story, pipelineResult.metadata))
          const scriptMsg =
            scriptErr instanceof Error ? scriptErr.message : String(scriptErr)
          if (/paused|progress was saved|timed out|60s|generate again/i.test(scriptMsg)) {
            throw new Error(uiText('generateResumeScriptStep'))
          }
          throw scriptErr
        }
      }

      clearPipelineResume(projectId)

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
      const mergedAssets = mergeProjectAssets(priorAssets, [])

      const st = useStudioStore.getState()
      const mainChar = st.mainCharacterName.trim()
      const titleFromUser = st.workingTitle.trim()
      const allowCustomName = namingPolicy.mode === 'names'

      const priorChars = wsProject?.bible?.characters ?? []
      const enrichedCast = enrichStoryCharacterProfiles(
        sanitizedCast.map((c: { name: string; role: string; traits: string }, i: number) => {
          const name0 = allowCustomName && i === 0 && mainChar ? mainChar : c.name
          const prior = priorChars.find(
            (p) => p.name.trim().toLowerCase() === name0.trim().toLowerCase()
          ) ?? priorChars[i]
          return {
            ...(prior || {}),
            name: name0,
            role: prior?.role || c.role,
            traits: c.traits,
            personality: prior?.personality || `${c.role}. ${c.traits}`.trim()
          }
        }),
        { country, theme: backendTheme }
      )
      const baseChars = enrichedCast.map((c, i) => {
        const prior = priorChars.find(
          (p) => p.name.trim().toLowerCase() === String(c.name).trim().toLowerCase()
        ) ?? priorChars[i]
        const gender =
          String(c.gender || prior?.gender || 'neutral').toLowerCase() === 'unknown'
            ? 'neutral'
            : String(c.gender || prior?.gender || 'neutral')
        return {
          id: prior?.id ?? `c${i + 1}`,
          name: String(c.name),
          personality: String(c.personality || c.traits || '').trim(),
          visualIdentity: String(c.visualIdentity || prior?.visualIdentity || '').trim(),
          baseImagePrompt:
            prior?.baseImagePrompt ||
            `${c.name}, ${c.storyRole || c.role}, ${c.visualIdentity || c.traits}`.slice(0, 520),
          gender,
          age: String(c.age || prior?.age || 'adult'),
          role: String(c.storyRole || c.role || c.name),
          appearance: String(c.appearance || c.visualIdentity || '').trim(),
          ...(prior?.referenceImages?.length ? { referenceImages: prior.referenceImages } : {}),
          ...(prior?.baseImageUrl ? { baseImageUrl: prior.baseImageUrl } : {}),
          ...(prior?.leonardoSeed != null ? { leonardoSeed: prior.leonardoSeed } : {})
        }
      })
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
                  episode1 as unknown as Record<string, unknown>,
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
          episode1 as unknown as Record<string, unknown>,
          pipelineResult.metadata
        ),
        ...(pipelineResult.metadata?.productionDirectives
          ? { productionDirectives: pipelineResult.metadata.productionDirectives }
          : {}),
        ...(pipelineResult.metadata?.sceneProductionStates
          ? { sceneProductionStates: pipelineResult.metadata.sceneProductionStates }
          : {}),
        ...(pipelineResult.metadata?.productionMemory
          ? { productionMemory: pipelineResult.metadata.productionMemory }
          : {}),
        ...(pipelineResult.metadata?.masterStoryContext
          ? { masterStoryContext: pipelineResult.metadata.masterStoryContext as Record<string, unknown> }
          : {}),
        ...(pipelineResult.metadata?.storyBible
          ? { storyBible: pipelineResult.metadata.storyBible as Record<string, unknown> }
          : {}),
        outputLanguage:
          (pipelineResult.metadata?.outputLanguage as string | undefined) || 'English',
        regionalContext:
          (pipelineResult.metadata?.regionalContext as string | undefined) ||
          pipelineResult.metadata?.storyLanguage
      })
      const nextProject = withScriptReviewReady({
        ...baseProject,
        episodes: [episode1]
      })
      console.info('[katha:production]', 'script_review_ready', {
        projectId,
        scenes: episode1.scenes.length,
        scriptOnly: true
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
      const wsId =
        useStudioStore.getState().workspaceSlots[workspaceIx]?.project?.id ||
        useStudioStore.getState().project?.id
      const hasResume = wsId ? loadPipelineResume(wsId) : null
      let msg =
        normalizeStudioErrorMessage(
          humanizeGenerateError(serializePipelineError(e, 'Generation failed'), uiText)
        ) || uiText('generateTimeoutResume')
      if (hasResume?.story) {
        msg = uiText('generateResumeScriptStep')
      }
      if (e instanceof TypeError && /fetch|network|failed/i.test(msg)) {
        msg = uiText('generateNetworkError')
      }
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

