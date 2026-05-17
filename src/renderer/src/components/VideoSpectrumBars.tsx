type Props = {
  levels: readonly number[]
}

/** Frequency-reactive bars under the video player (Web Audio). */
export function VideoSpectrumBars({ levels }: Props) {
  return (
    <div className="video-spectrum-bars" aria-hidden>
      {levels.map((v, i) => (
        <span
          key={i}
          className="video-spectrum-bars__bar"
          style={{ transform: `scaleY(${Math.max(0.12, 0.2 + v * 2.2)})` }}
        />
      ))}
    </div>
  )
}
