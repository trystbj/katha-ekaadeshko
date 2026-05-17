import type { CSSProperties } from 'react'

export type LocaleMenuPortalOptions = {
  /** Upper bound for menu width inside wrap (compact flag column ~103px; gen-defaults wider). */
  maxWidthCapPx?: number
  /** Upper bound for dropdown height (long menus scroll). */
  maxHeightPx?: number
  /** Extra mm tuck toward wrap right edge (subtract from CSS `right`; reduces outer gap). */
  extraRightTuckMm?: number
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
  const mmToPx = 96 / 25.4
  const top = Math.max(0, tr.bottom - wr.top + 4)
  const tuckMm = 6 + (options?.extraRightTuckMm ?? 0)
  const right = Math.max(0, wr.right - tr.right - tuckMm * mmToPx)
  const innerBelow = wr.height - top - pad
  const heightCap = options?.maxHeightPx ?? 280
  const maxH = Math.min(Math.max(innerBelow, 0), heightCap)
  const room = Math.floor(Math.max(0, tr.right - wr.left - pad))
  const widthCap = options?.maxWidthCapPx ?? Math.round(100 * 1.03)
  const maxW = room > 0 ? Math.min(room, widthCap) : 0
  return {
    position: 'absolute',
    top,
    right,
    left: 'auto',
    width: 'fit-content',
    maxWidth: maxW > 0 ? maxW : undefined,
    maxHeight: maxH,
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    zIndex: 90
  }
}
