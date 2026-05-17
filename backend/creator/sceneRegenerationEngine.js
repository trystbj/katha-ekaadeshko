/**
 * Smart partial scene regeneration — plans targets while preserving continuity.
 */

/**
 * @param {string} target RegenerationTarget
 * @param {number} sceneIndex
 * @param {object} episode context
 */
export function buildRegenerationPlan(target, sceneIndex, episode) {
  const plan = episode?.cinematicDirectorPlan
  const scenes = plan?.scenes || []
  const sc = scenes[sceneIndex] || scenes[sceneIndex - 1]
  const preserve = {
    storyMemory: Boolean(episode?.storyMemorySnapshot),
    timelineSync: true,
    adjacentScenes: [sceneIndex - 1, sceneIndex + 1].filter((i) => i >= 0 && i < scenes.length)
  }

  const jobs = []
  const t = String(target || 'full_scene')

  if (t === 'visuals' || t === 'full_scene') jobs.push({ slot: 'leonardo:scene', sceneIndex, priority: 1 })
  if (t === 'narration' || t === 'full_scene') jobs.push({ slot: 'tts:scene', sceneIndex, priority: 2 })
  if (t === 'subtitles' || t === 'full_scene') jobs.push({ slot: 'subtitles:retime', sceneIndex, priority: 3 })
  if (t === 'soundtrack' || t === 'full_scene') jobs.push({ slot: 'audio:bed', sceneIndex, priority: 4 })
  if (t === 'ambience' || t === 'full_scene') jobs.push({ slot: 'audio:ambience', sceneIndex, priority: 5 })
  if (t === 'transitions') jobs.push({ slot: 'cinematic:transition', sceneIndex, priority: 6 })
  if (t === 'acting' || t === 'full_scene') jobs.push({ slot: 'cinematic:acting', sceneIndex, priority: 7 })
  if (t === 'camera' || t === 'full_scene') jobs.push({ slot: 'cinematic:camera', sceneIndex, priority: 8 })
  if (t === 'pacing') jobs.push({ slot: 'cinematic:pacing', sceneIndex, priority: 9 })

  return {
    architectureVersion: 1,
    target: t,
    sceneIndex,
    preserve,
    jobs: jobs.sort((a, b) => a.priority - b.priority),
    sceneSnapshot: sc ? JSON.parse(JSON.stringify(sc)) : null,
    status: 'planned'
  }
}
