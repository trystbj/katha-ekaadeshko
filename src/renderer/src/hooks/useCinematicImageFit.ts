import { useEffect, useState, type CSSProperties } from 'react'

export type CinematicFitAxis = 'height' | 'width'

/** Portrait → fill height; landscape → fill width (contain, max area, minimal letterboxing). */
export function useCinematicImageFit(url: string | null | undefined): CinematicFitAxis {
  const [axis, setAxis] = useState<CinematicFitAxis>('height')

  useEffect(() => {
    if (!url?.trim()) {
      setAxis('height')
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      setAxis(h >= w ? 'height' : 'width')
    }
    img.onerror = () => {
      if (!cancelled) setAxis('height')
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  return axis
}

export function cinematicFitBackgroundSize(axis: CinematicFitAxis): string {
  return axis === 'height' ? 'auto 100%' : '100% auto'
}

export function cinematicFitImgStyle(axis: CinematicFitAxis): CSSProperties {
  return axis === 'height'
    ? { height: '100%', width: 'auto', maxWidth: '100%' }
    : { width: '100%', height: 'auto', maxHeight: '100%' }
}
