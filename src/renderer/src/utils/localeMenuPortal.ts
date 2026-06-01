import type { CSSProperties } from 'react'

export type LocaleMenuPortalOptions = {
  /** Upper bound for menu width inside wrap (compact flag column ~103px; gen-defaults wider). */
  maxWidthCapPx?: number
  /** Upper bound for dropdown height (long menus scroll). */
  maxHeightPx?: number
  /** Extra mm tuck toward wrap right edge (subtract from CSS `right`; reduces outer gap). */
  extraRightTuckMm?: number
  /** `above` — menu grows upward from trigger (preview subtitle rail CC). Default `below`. */
  placement?: 'below' | 'above'
}

/** Portal dropdown under trigger, clipped to wrap — idea wrap + monitor body share this. */
export function computeLocaleMenuPortalStyle(
  trigger: HTMLElement,
  wrap: HTMLElement,
  options?: LocaleMenuPortalOptions
): CSSProperties {
  const tr = trigger.getBoundingClientRect()
  const wr = wrap.getBoundingClientRect()
  const pad = 8
  const gap = 4
  const mmToPx = 96 / 25.4
  const tuckMm = 6 + (options?.extraRightTuckMm ?? 0)
  const right = Math.max(0, wr.right - tr.right - tuckMm * mmToPx)
  const heightCap = options?.maxHeightPx ?? 280
  const room = Math.floor(Math.max(0, tr.right - wr.left - pad))
  const widthCap = options?.maxWidthCapPx ?? Math.round(100 * 1.03)
  const maxW = room > 0 ? Math.min(room, widthCap) : 0
  const shared = {
    position: 'absolute' as const,
    right,
    left: 'auto' as const,
    width: 'fit-content' as const,
    maxWidth: maxW > 0 ? maxW : undefined,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    boxSizing: 'border-box' as const,
    zIndex: 90
  }

  if (options?.placement === 'above') {
    const trTop = tr.top - wr.top
    const bottom = Math.max(0, wr.height - trTop + gap)
    const innerAbove = trTop - pad
    const maxH = Math.min(Math.max(innerAbove, 0), heightCap)
    return {
      ...shared,
      top: 'auto',
      bottom,
      maxHeight: maxH
    }
  }

  const top = Math.max(0, tr.bottom - wr.top + gap)
  const innerBelow = wr.height - top - pad
  const maxH = Math.min(Math.max(innerBelow, 0), heightCap)
  return {
    ...shared,
    top,
    bottom: 'auto',
    maxHeight: maxH
  }
}
