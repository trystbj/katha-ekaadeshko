import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { parsePipelinePayloadFromEpisode } from './productionWorkflow'

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function sceneNarration(scene: StoryScene): string {
  return String(scene.narrationText || scene.text || '').trim()
}

/** Leonardo-ready visual line when pipeline omitted visual_description. */
export function synthesizeSceneVisualDescription(
  scene: StoryScene,
  project: ProjectState
): string {
  const narration = sceneNarration(scene)
  const setting = String(project.bible?.concept || project.bible?.title || '').trim()
  const env = String(scene.environment || '').trim()
  const action = String(scene.characterActions || '').trim()
  const mood = String(scene.emotionalTone || '').trim()
  const camera = String(scene.cameraDirection || '').trim()
  const parts = [
    env || setting.slice(0, 120),
    narration.slice(0, 420),
    action,
    mood ? `Mood: ${mood}.` : '',
    camera ? `Camera: ${camera}.` : ''
  ].filter(Boolean)
  const merged = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (merged.length > 80) return merged.slice(0, 1200)
  return `${setting ? `${setting.slice(0, 100)}. ` : ''}Cinematic story beat for scene ${scene.index}. ${narration.slice(0, 320)}`.trim()
}

export function scriptRowFromScene(
  scene: StoryScene,
  project: ProjectState
): Record<string, unknown> {
  const narration = sceneNarration(scene)
  const visual =
    String(scene.visualDescription || '').trim() ||
    synthesizeSceneVisualDescription(scene, project)
  return {
    scene: scene.index,
    narration,
    composed_narration: narration,
    dialogue: (scene.dialogueLines ?? []).map((d) => ({
      character: d.character,
      line: d.line,
      ...(typeof d.durationSec === 'number' ? { duration: d.durationSec } : {})
    })),
    visual_description: visual,
    mood: scene.emotionalTone ?? '',
    camera: scene.cameraDirection ?? '',
    environment: scene.environment ?? '',
    ...(scene.timeOfDay ? { time_of_day: scene.timeOfDay } : {}),
    ...(scene.weather ? { weather: scene.weather } : {}),
    ...(scene.lighting ? { lighting: scene.lighting } : {}),
    ...(typeof scene.narrationDurationSec === 'number'
      ? { narration_duration: scene.narrationDurationSec }
      : {}),
    ...(typeof scene.sceneDurationSec === 'number'
      ? { scene_duration: scene.sceneDurationSec }
      : {}),
    action: scene.characterActions ?? '',
    scene_title: scene.sceneTitle ?? `Scene ${scene.index}`
  }
}

export function scriptRowsFromEpisodeScenes(
  project: ProjectState,
  episode: StoryEpisode
): Record<string, unknown>[] {
  return (episode.scenes ?? []).map((s) => scriptRowFromScene(s, project))
}

function enrichScriptRow(
  row: Record<string, unknown>,
  scene: StoryScene | undefined,
  project: ProjectState
): Record<string, unknown> {
  const sceneNum = Number(row.scene) || scene?.index || 0
  const narration =
    strField(row, 'narration', 'composed_narration') || (scene ? sceneNarration(scene) : '')
  let visual = strField(row, 'visual_description', 'visualDescription')
  if (!visual && scene) {
    visual =
      String(scene.visualDescription || '').trim() ||
      synthesizeSceneVisualDescription(scene, project)
  }
  if (!visual && narration) {
    visual = synthesizeSceneVisualDescription(
      scene ?? {
        index: sceneNum,
        lineType: 'Dialogue',
        character: 'Narration',
        text: narration,
        narrationText: narration
      },
      project
    )
  }
  return {
    ...row,
    scene: sceneNum || row.scene,
    narration: narration || row.narration,
    composed_narration: strField(row, 'composed_narration', 'narration') || narration,
    visual_description: visual
  }
}

function storyPayloadFromProject(project: ProjectState): Record<string, unknown> {
  return {
    title: project.title,
    setting: project.bible?.concept ?? '',
    characters: (project.bible?.characters ?? []).map((c) => ({
      name: c.name,
      role: c.role || c.personality,
      traits: c.visualIdentity || c.appearance || c.personality,
      appearance: c.appearance || c.visualIdentity,
      visualIdentity: c.visualIdentity,
      gender: c.gender,
      age: c.age,
      baseImageUrl: c.baseImageUrl,
      baseImagePrompt: c.baseImagePrompt,
      characterDNA: (c as { characterDNA?: Record<string, unknown> }).characterDNA
    }))
  }
}

/** Build Leonardo visual pipeline payload — always prefers live episode scenes when raw script is empty. */
export function buildVisualPipelinePayload(
  project: ProjectState,
  episodeNumber: number
): {
  story: Record<string, unknown>
  script: Record<string, unknown>[]
  images: Record<string, unknown>[]
  metadata?: Record<string, unknown>
} | null {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  if (!ep) return null
  if (!project.bible?.characters?.length && !ep.scenes?.length) return null

  const liveScript = scriptRowsFromEpisodeScenes(project, ep)
  const fromRaw = parsePipelinePayloadFromEpisode(ep)
  const sceneByIndex = new Map((ep.scenes ?? []).map((s) => [s.index, s]))

  let script: Record<string, unknown>[] = []
  let story: Record<string, unknown> = storyPayloadFromProject(project)
  let images: Record<string, unknown>[] = []
  let metadata: Record<string, unknown> | undefined = ep.cinematicDirectorPlan
    ? { cinematicDirectorPlan: ep.cinematicDirectorPlan }
    : undefined

  if (fromRaw?.script?.length) {
    story = fromRaw.story ?? story
    images = fromRaw.images ?? []
    metadata = fromRaw.metadata ?? metadata
    script = fromRaw.script.map((row, i) => {
      const sceneNum = Number(row.scene) > 0 ? Number(row.scene) : i + 1
      return enrichScriptRow(row as Record<string, unknown>, sceneByIndex.get(sceneNum), project)
    })
  }

  if (!script.length && liveScript.length) {
    script = liveScript
  } else if (liveScript.length && script.length < liveScript.length) {
    const covered = new Set(script.map((r) => Number(r.scene)))
    for (const row of liveScript) {
      const n = Number(row.scene)
      if (!covered.has(n)) script.push(row)
    }
    script.sort((a, b) => Number(a.scene) - Number(b.scene))
  }

  script = script
    .map((row, i) => {
      const sceneNum = Number(row.scene) > 0 ? Number(row.scene) : i + 1
      return enrichScriptRow(row, sceneByIndex.get(sceneNum), project)
    })
    .filter((row) => {
      const vd = strField(row as Record<string, unknown>, 'visual_description')
      const nar = strField(row as Record<string, unknown>, 'narration', 'composed_narration')
      return Boolean(vd || nar)
    })

  if (!script.length) return null

  return { story, script, images, metadata: metadata ?? {} }
}
