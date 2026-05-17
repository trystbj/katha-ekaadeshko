/** Inline SVGs for day/night theme and optional “system” in Settings. */
export function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" />
      </g>
    </svg>
  )
}

export function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M20 14.5A8.5 8.5 0 0 1 8.1 3.1 8.4 8.4 0 0 0 12 21a8.5 8.5 0 0 0 8-6.5z"
        opacity="0.95"
      />
    </svg>
  )
}

export function IconSystem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 16v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** Editorial pen — Scene | Script | Voice header (filled paths read reliably at ~1rem). */
export function IconStudioScriptPen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  )
}
