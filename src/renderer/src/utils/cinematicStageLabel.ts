/** Pick the closest cinematic stage label for banner transitions (English-regex heuristics). */
export function cinematicStageLabelKey(stage: string, logTail: string): string {
  const blob = `${stage}\n${logTail}`.toLowerCase()
  if (/understand|prompt|seed|parse/.test(blob)) return 'cinemaStageUnderstandingStory'
  if (/screenplay|script write|writing script/.test(blob)) return 'cinemaStageWritingScreenplay'
  if (/character|cast|portrait|leonardo/.test(blob)) return 'cinemaStageGeneratingCharacters'
  if (/environment|world|setting|location/.test(blob)) return 'cinemaStageBuildingEnvironments'
  if (/image\s*\d|still|scene render|generating images/.test(blob)) return 'cinemaStageRenderingScenes'
  if (/style|visual lock|leonardo/.test(blob)) return 'cinemaStageApplyingStyle'
  if (/tts|voice|narrat|audio sync/.test(blob)) return 'cinemaStageSyncingNarration'
  if (/subtitle|caption|vtt/.test(blob)) return 'cinemaStageAddingSubtitles'
  if (/soundtrack|music|mix|ambient|sfx/.test(blob)) return 'cinemaStageMixingSoundtrack'
  if (/ffmpeg|encode|1080p|4k|upscale/.test(blob)) return 'cinemaStageCompositingVideo'
  if (/optim|export|mux/.test(blob)) return 'cinemaStageOptimizingExport'
  if (/preview|upload|done|complete/.test(blob)) return 'cinemaStagePreparingPreview'
  return 'cinemaStageWorking'
}

/** Refined ETA: linear rate from server progress, nudged when scene slice lags/leads overall %. */
export function refinedEtaSeconds(opts: {
  progress: number
  elapsedSec: number
  sceneSlice: { current: number; total: number } | null
  sceneTotalFallback: number
}): number | null {
  const { progress, elapsedSec, sceneSlice } = opts
  const p = Math.min(99.5, Math.max(0, progress))
  if (p < 0.5 || elapsedSec < 0.4) return null
  if (p >= 98.5) return 0

  const linearRate = p / elapsedSec
  if (linearRate < 0.02) return null
  let eta = (100 - p) / linearRate

  if (sceneSlice && sceneSlice.total > 0 && sceneSlice.current > 0) {
    const sceneFrac = sceneSlice.current / sceneSlice.total
    const progFrac = p / 100
    if (sceneFrac < progFrac - 0.08) eta *= 1.18
    else if (sceneFrac > progFrac + 0.1) eta *= 0.9
  }

  return Math.max(0, Math.round(Math.min(eta, elapsedSec * 22)))
}
