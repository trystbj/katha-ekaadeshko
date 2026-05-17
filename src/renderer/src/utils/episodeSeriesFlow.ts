import type { ProjectState } from '../types/story'

/** Episode count for wireframe stream bible from length + serialized preference. */
export function plannedTotalEpisodesFromStreamSetup(
  backendLength: string,
  episodeChainPreferred: boolean
): number {
  let n = backendLength === 'short' ? 3 : backendLength === 'long' ? 8 : 5
  if (episodeChainPreferred) n = Math.min(12, n + 2)
  return Math.max(2, n)
}

export function buildStreamSeriesOutline(
  totalEpisodes: number,
  country: string,
  backendTheme: string,
  backendGenre: string,
  seriesTitle: string
): { episode: number; beat: string }[] {
  const title = seriesTitle.trim() || 'Untitled'
  return Array.from({ length: totalEpisodes }, (_, i) => ({
    episode: i + 1,
    beat:
      i === 0
        ? `${country} · ${backendTheme} · ${backendGenre} — series premiere for «${title}».`
        : `Episode ${i + 1}: serialized continuation — resolve prior cliffhanger fallout, evolve relationships and wardrobe naturally, preserve narrator + visual medium from bible.`
  }))
}

export function episodeWrittenMax(project: ProjectState | null): number {
  if (!project?.episodes.length) return 0
  return project.episodes.reduce((m, e) => Math.max(m, e.number), 0)
}

export function previousEpisodeVideoExportDone(
  project: ProjectState | null,
  nextEpisodeNumber: number
): boolean {
  if (!project?.bible || nextEpisodeNumber <= 1) return true
  const prev = project.episodes.find((e) => e.number === nextEpisodeNumber - 1)
  return Boolean(prev?.videoExportComplete)
}

/** i18n key for arc ribbon (approximate position in season). */
export function episodeArcLabelKey(episodeNumber: number, totalEpisodes: number): string {
  if (totalEpisodes <= 1) return 'episodeArcSingle'
  if (episodeNumber <= 1) return 'episodeArcBeginning'
  if (episodeNumber >= totalEpisodes) return 'episodeArcFinale'
  const ratio = episodeNumber / totalEpisodes
  if (ratio < 0.35) return 'episodeArcRising'
  if (ratio < 0.55) return 'episodeArcConflict'
  if (ratio < 0.78) return 'episodeArcTwist'
  return 'episodeArcClimax'
}

export function seriesFullyExported(project: ProjectState | null): boolean {
  if (!project?.bible) return false
  const te = project.bible.totalEpisodes
  if (te <= 0 || project.episodes.length < te) return false
  for (let n = 1; n <= te; n++) {
    const ep = project.episodes.find((e) => e.number === n)
    if (!ep || !ep.videoExportComplete) return false
  }
  return true
}

export function allEpisodesWritten(project: ProjectState | null): boolean {
  if (!project?.bible) return false
  const te = project.bible.totalEpisodes
  return te > 0 && project.episodes.length >= te
}

export function canJumpToFinale(project: ProjectState | null): boolean {
  if (!project?.bible) return false
  const te = project.bible.totalEpisodes
  if (te <= 1) return false
  const hasFinale = project.episodes.some((e) => e.number === te)
  if (hasFinale) return false
  for (let n = 1; n < te; n++) {
    const ep = project.episodes.find((e) => e.number === n)
    if (!ep) return false
  }
  return true
}
