type Props = {
  active: boolean
  bars?: number
}

/** Lightweight faux waveform — CSS-driven, no Web Audio API required. */
export function VoiceReactiveBars({ active, bars = 5 }: Props) {
  return (
    <div className={`voice-reactive-bars ${active ? 'voice-reactive-bars--on' : ''}`} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="voice-reactive-bars__bar" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  )
}
