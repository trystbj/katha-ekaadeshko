import { useEffect } from 'react'
import { useStudioStore } from '../store/useStudioStore'
import { REFERENCE_STUDIO_HERO_URL, REFERENCE_STUDIO_OVERLAY } from '../constants/studioReferenceTheme'
import { STUDIO_SEASON_PRESETS, normalizeStudioSeasonId } from '../constants/studioSeasonThemes'

type Props = {
  /**
   * Himalayan reference hero and seasonal tints.
   * When false, follows seasonal picker (`studioSeasonId`).
   */
  referenceTheme?: boolean
}

/** Fixed layers: seasonal hero, tint, vignette, soft particle shimmer. */
export function StudioAmbientBackdrop({ referenceTheme = false }: Props) {
  const rawSeason = useStudioStore((s) => s.studioSeasonId)
  const id = normalizeStudioSeasonId(rawSeason)
  const preset = STUDIO_SEASON_PRESETS[id]
  const heroUrl = referenceTheme ? REFERENCE_STUDIO_HERO_URL : preset.heroUrl
  const overlay = referenceTheme ? REFERENCE_STUDIO_OVERLAY : preset.overlay

  useEffect(() => {
    document.documentElement.dataset.studioSeason = id
    return () => {
      delete document.documentElement.dataset.studioSeason
    }
  }, [id])

  return (
    <div className={`studio-backdrop${referenceTheme ? ' studio-backdrop--reference' : ''}`} aria-hidden>
      <div className="studio-backdrop__nepal-base" aria-hidden />
      <div className="studio-backdrop__img" style={{ backgroundImage: `url(${heroUrl})` }} />
      <div className="studio-backdrop__tint" style={{ background: overlay }} />
      {referenceTheme ? <div className="studio-backdrop__sky-glow" /> : null}
      <div className="studio-backdrop__vignette" />
      <div className="studio-backdrop__particles" />
      <div className="studio-backdrop__rays" aria-hidden />
      <div className="studio-backdrop__landmark studio-backdrop__landmark--stupa" aria-hidden />
      <div className="studio-backdrop__landmark studio-backdrop__landmark--pagoda" aria-hidden />
    </div>
  )
}
