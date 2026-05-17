import { useId } from 'react'
import { useUiText } from '../i18n/useAppI18n'
/**
 * Animated Nepal double-pennon for header (CSS loop — no raster asset required).
 *
 * Export options:
 * - Static SVG (transparent silhouette): `/nepal-flag-static.svg` in public/
 * - Video (WebM/GIF): record this header at 1920×1080 with transparent BG using OBS + browser source,
 *   or run headless puppeteer; encode VP9 WebM with alpha: ffmpeg -i frames_%05d.png -c:v libvpx-vp9 …
 * - Lottie: optional future — trace SVG in AE/Bodymovin if motion designers need it.
 */
type Props = {
  className?: string
  /** Larger hero variant */
  size?: 'header' | 'lg'
  title?: string
}

function FlagSvg({ uid }: { uid: string }) {
  const gi = `nk-${uid}`
  return (
    <svg
      className="nepal-flag-svg"
      viewBox="-14 -14 292 412"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${gi}-cloth`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e02448" />
          <stop offset="38%" stopColor="#C8102E" />
          <stop offset="100%" stopColor="#8a0b22" />
        </linearGradient>
        <linearGradient id={`${gi}-rim`} x1="0%" y1="100%" x2="95%" y2="0%">
          <stop offset="0%" stopColor="#002d72" />
          <stop offset="100%" stopColor="#003893" />
        </linearGradient>
        <filter id={`${gi}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.25" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Double pennon: hoist left; fly — upper apex, junction, lower apex */}
      <path
        fill={`url(#${gi}-cloth)`}
        stroke={`url(#${gi}-rim)`}
        strokeWidth={10}
        strokeLinejoin="miter"
        strokeLinecap="butt"
        filter={`url(#${gi}-soft)`}
        d="M 0,0 L 0,384 L 240,276 L 18,190 L 228,94 L 0,0 Z"
      />
      {/* Moon + eight rays */}
      <g transform="translate(92,108)" fill="#FFFFFF">
        <path d="M 6,-18 A 18 18 0 1 1 6 18 A 13 13 0 1 0 6 -18 Z" />
        <g opacity={0.94}>
          <path d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(45)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(90)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(135)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(180)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(225)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(270)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
          <path transform="rotate(315)" d="M 0,-26 L 2,-20 L -2,-20 Z" />
        </g>
      </g>
      {/* Sun + twelve rays */}
      <g transform="translate(102,286)" fill="#FFFFFF">
        <circle r={17} cx={0} cy={0} />
        <g stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round">
          <line x1="0" y1="-34" x2="0" y2="-24" />
          <line x1="29.4" y1="-17" x2="21.2" y2="-12.2" />
          <line x1="29.4" y1="17" x2="21.2" y2="12.2" />
          <line x1="0" y1="34" x2="0" y2="24" />
          <line x1="-29.4" y1="17" x2="-21.2" y2="12.2" />
          <line x1="-29.4" y1="-17" x2="-21.2" y2="-12.2" />
          <line x1="17" y1="-29.4" x2="12.2" y2="-21.2" />
          <line x1="-17" y1="-29.4" x2="-12.2" y2="-21.2" />
          <line x1="17" y1="29.4" x2="12.2" y2="21.2" />
          <line x1="-17" y1="29.4" x2="-12.2" y2="21.2" />
          <line x1="34" y1="0" x2="24" y2="0" />
          <line x1="-34" y1="0" x2="-24" y2="0" />
        </g>
      </g>
    </svg>
  )
}

export function NepalFlagAnimated({ className = '', size = 'header', title }: Props) {
  const uid = useId().replace(/:/g, '')
  const uiText = useUiText()
  const sizeCls = size === 'lg' ? 'nepal-flag-ambient--lg' : ''
  const resolvedTitle = title?.trim() ? title : uiText('nepalCountryName')

  return (
    <div
      className={`nepal-flag-ambient ${sizeCls} ${className}`.trim()}
      role="img"
      aria-label={uiText('nepalFlagAria', { country: resolvedTitle })}
      title={resolvedTitle}
    >
      <span className="nepal-flag-breeze" aria-hidden />
      <span className="nepal-flag-sparkles" aria-hidden />
      <span className="nepal-flag-shine" aria-hidden />
      <div className="nepal-flag-wave-stack">
        <div className="nepal-flag-wave-layer nepal-flag-wave-layer--back" aria-hidden>
          <FlagSvg uid={`${uid}-a`} />
        </div>
        <div className="nepal-flag-wave-layer nepal-flag-wave-layer--mid" aria-hidden>
          <FlagSvg uid={`${uid}-b`} />
        </div>
        <div className="nepal-flag-wave-layer nepal-flag-wave-layer--front" aria-hidden="true">
          <FlagSvg uid={`${uid}-c`} />
        </div>
      </div>
    </div>
  )
}
