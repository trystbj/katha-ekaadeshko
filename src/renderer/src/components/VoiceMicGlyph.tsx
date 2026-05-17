type Props = {
  /** Root class for layout hooks (e.g. voice strip vs FAB). */
  className?: string
}

/**
 * Voice-input mic mark — vector outline reads more reliably than emoji on wallpaper / gradients.
 */
export function VoiceMicGlyph({ className }: Props) {
  return (
    <span className={className ?? ''} aria-hidden>
      <svg
        className="voice-mic-glyph__svg"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M19 10v1a7 7 0 0 1-14 0v-1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}
