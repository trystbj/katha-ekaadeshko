import { isServerlessRuntime } from '../../backend/utils/runtime.js'

/** Smaller payload for SSE `result` on serverless — avoids truncation near Vercel body limits. */
export function slimStreamGenerateResult(result) {
  if (!isServerlessRuntime() || process.env.KATHA_STREAM_FULL_RESULT === '1') return result
  const meta = result?.metadata && typeof result.metadata === 'object' ? result.metadata : {}
  return {
    story: result.story,
    script: result.script,
    images: Array.isArray(result.images) ? result.images : [],
    audio: Array.isArray(result.audio) ? result.audio : [],
    metadata: {
      country: meta.country,
      region: meta.region,
      genre: meta.genre,
      theme: meta.theme,
      length: meta.length,
      storyLanguage: meta.storyLanguage,
      generationBlueprint: meta.generationBlueprint,
      aiProviders: meta.aiProviders,
      ambientBedUrl: meta.ambientBedUrl,
      storyAudioPlan: meta.storyAudioPlan,
      cinematicDirectorDegraded: meta.cinematicDirectorDegraded,
      memorySummaryPatch: meta.memorySummaryPatch,
      visualStyleProfileKey: meta.visualStyleProfileKey,
      visualStyleHybrid: meta.visualStyleHybrid,
      serverlessFastPath: Boolean(meta.serverlessFastPath),
      ...(meta.longStoryIntelligence ? { longStoryIntelligence: meta.longStoryIntelligence } : {}),
      ...(meta.scriptOnlyComplete ? { scriptOnlyComplete: true, productionStage: meta.productionStage } : {}),
      ...(meta.productionDirectives ? { productionDirectives: meta.productionDirectives } : {}),
      ...(meta.sceneProductionStates ? { sceneProductionStates: meta.sceneProductionStates } : {}),
      ...(meta.productionMemory ? { productionMemory: meta.productionMemory } : {})
    }
  }
}
