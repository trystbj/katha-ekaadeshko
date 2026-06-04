import type { AssetRef, ProjectState, StoryScene } from '../types/story'

/** Resolve 1-based scene index from a pipeline script row or image row. */
export function sceneIndexFromPipelineRow(
  row: { scene?: string | number } | null | undefined,
  fallback: number
): number {
  const n = Number(row?.scene)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function buildSceneAssetsFromPipeline(
  images: {
    image_url?: string
    imageUrl?: string
    scene?: string | number
    prompt?: string
    leonardoSeed?: number
    leonardoImageId?: string
    leonardoGenerationId?: string
  }[]
): AssetRef[] {
  const assets: AssetRef[] = []
  for (let i = 0; i < images.length; i++) {
    const row = images[i]
    const url = row?.image_url || row?.imageUrl
    if (!url || typeof url !== 'string') continue
    const sceneNum = sceneIndexFromPipelineRow(row, i + 1)
    const key = `scene:${sceneNum}`
    assets.push({
      id: `a_scene_${sceneNum}_${i}`,
      kind: 'scene',
      key,
      url,
      prompt: String(row.prompt ?? ''),
      ...(row.leonardoSeed != null ? { seed: row.leonardoSeed } : {}),
      ...(row.leonardoImageId ? { leonardoImageId: row.leonardoImageId } : {}),
      ...(row.leonardoGenerationId ? { leonardoGenerationId: row.leonardoGenerationId } : {}),
      createdAt: new Date().toISOString()
    })
    console.info('[katha:scene-map]', 'asset_from_pipeline', { key, index: i, sceneNum })
  }
  return assets
}

export function mergeSceneMotionIntoAssets(
  assets: AssetRef[],
  videos: { scene?: string | number; video_url?: string }[]
): AssetRef[] {
  if (!videos.length) return assets
  return assets.map((a) => {
    if (a.kind !== 'scene') return a
    const sceneNum = Number(/^scene:(\d+)$/.exec(a.key)?.[1] ?? 0)
    const hit = videos.find((v) => Number(v.scene) === sceneNum)
    const motionUrl = hit?.video_url
    return motionUrl ? { ...a, motionUrl: String(motionUrl) } : a
  })
}

export function sceneMotionUrlForIndex(project: ProjectState | null, sceneIndex: number): string | undefined {
  if (!project?.assets?.length || !sceneIndex) return undefined
  const key = `scene:${sceneIndex}`
  const hit = project.assets.find((a) => a.kind === 'scene' && a.key === key)
  return hit?.motionUrl
}

export function episodeNeedsMotionGeneration(project: ProjectState | null, episodeScenes: StoryScene[]): boolean {
  if (!project || !episodeScenes.length) return false
  const hasStill = episodeScenes.some((s) => Boolean(sceneUrlForIndex(project, s.index)))
  if (!hasStill) return false
  return episodeScenes.some((s) => sceneUrlForIndex(project, s.index) && !sceneMotionUrlForIndex(project, s.index))
}

/** Merge incoming scene assets by key; preserve non-scene assets from existing. */
export function mergeProjectAssets(existing: AssetRef[] = [], incoming: AssetRef[] = []): AssetRef[] {
  const sceneByKey = new Map<string, AssetRef>()
  const other: AssetRef[] = []
  for (const a of existing) {
    if (a.kind === 'scene') sceneByKey.set(a.key, a)
    else other.push(a)
  }
  for (const a of incoming) {
    if (a.kind === 'scene') sceneByKey.set(a.key, a)
    else other.push(a)
  }
  const merged = [...other, ...sceneByKey.values()].sort((a, b) => {
    if (a.kind !== 'scene' || b.kind !== 'scene') return 0
    const na = Number(/^scene:(\d+)$/.exec(a.key)?.[1] ?? 0)
    const nb = Number(/^scene:(\d+)$/.exec(b.key)?.[1] ?? 0)
    return na - nb
  })
  console.info('[katha:scene-map]', 'merge_assets', {
    existingScenes: existing.filter((x) => x.kind === 'scene').length,
    incomingScenes: incoming.filter((x) => x.kind === 'scene').length,
    totalScenes: sceneByKey.size
  })
  return merged
}

/** Remove scene still assets so regeneration does not reuse bad URLs. */
export function removeSceneAssetsForIndices(
  project: ProjectState,
  sceneIndices: number[]
): ProjectState {
  const drop = new Set(sceneIndices.map((n) => `scene:${n}`))
  return {
    ...project,
    assets: (project.assets ?? []).filter((a) => !(a.kind === 'scene' && drop.has(String(a.key)))),
    updatedAt: new Date().toISOString()
  }
}

export function sceneUrlForIndex(project: ProjectState | null, sceneIndex: number): string | undefined {
  if (!project?.assets?.length || !sceneIndex) return undefined
  const key = `scene:${sceneIndex}`
  const hit = project.assets.find((a) => a.kind === 'scene' && a.key === key && a.url)
  return hit?.url
}

/** Drop repeated non-empty URLs (thumbnail strips only — keeps scene row order). */
export function dedupeScenePreviewUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.map((u) => {
    const key = String(u || '').trim()
    if (!key) return ''
    if (seen.has(key)) return ''
    seen.add(key)
    return u
  })
}

/** Scene still URLs ordered to match episode `scenes[]` row order (by each row's `index`). */
export function sceneStillUrlsForEpisode(
  project: ProjectState | null,
  episodeScenes: StoryScene[] = []
): string[] {
  const seenIndex = new Set<number>()
  const urls: string[] = []
  for (const s of episodeScenes) {
    if (seenIndex.has(s.index)) continue
    seenIndex.add(s.index)
    urls.push(sceneUrlForIndex(project, s.index) ?? '')
  }
  return urls
}

/** Ordered scene image URLs for preview carousel (falls back to any scene assets). */
export function orderedSceneImageUrls(
  project: ProjectState | null,
  episodeScenes?: StoryScene[]
): string[] {
  if (!project?.assets?.length) return []
  const byIndex = new Map<number, string>()
  for (const a of project.assets) {
    if (a.kind !== 'scene' || !a.url) continue
    const m = /^scene:(\d+)$/.exec(String(a.key).trim())
    if (m) byIndex.set(Number(m[1]), a.url)
  }
  if (episodeScenes?.length) {
    const ordered = episodeScenes.map((s) => byIndex.get(s.index) ?? '')
    console.info('[katha:preview]', 'ordered_scene_urls', {
      count: ordered.length,
      withImage: ordered.filter(Boolean).length,
      mode: 'episode_aligned'
    })
    return ordered
  }
  const fallback = [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, u]) => u)
  console.info('[katha:preview]', 'ordered_scene_urls', { count: fallback.length, mode: 'assets' })
  return fallback
}
