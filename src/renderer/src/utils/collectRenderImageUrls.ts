import type { ProjectState } from '../types/story'
import { orderedSceneImageUrls } from './sceneAssetMap'

/** Prefer scene/background stills in script order; fall back to character portraits for slideshow render. */
export function collectRenderImageUrls(project: ProjectState | null): string[] {
  if (!project?.assets?.length) return []
  const ep = project.episodes?.[project.episodes.length - 1]
  const ordered = orderedSceneImageUrls(project, ep?.scenes)
  if (ordered.length) return ordered
  const withUrl = project.assets.filter(
    (a): a is (typeof a & { url: string }) => typeof a.url === 'string' && a.url.length > 0
  )
  const sceneBg = withUrl.filter((a) => a.kind === 'scene' || a.kind === 'background').map((a) => a.url)
  if (sceneBg.length) return sceneBg
  return withUrl.filter((a) => a.kind === 'character').map((a) => a.url)
}
