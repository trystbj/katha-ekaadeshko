import { useCallback, useEffect, useRef, useState } from 'react'

const BIN_COUNT = 20

/**
 * Routes `<video>` audio through AnalyserNode for reactive spectrum bars.
 * Falls back to `unsupported` when CORS or the browser blocks `createMediaElementSource`.
 * Pass `resetKey` (e.g. `videoUrl`) when the media element is remounted so the graph can attach again.
 */
export function useMediaElementSpectrum(
  mediaRef: React.RefObject<HTMLVideoElement | null>,
  resetKey: string
) {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BIN_COUNT }, () => 0.08))
  const [unsupported, setUnsupported] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const attachedRef = useRef(false)
  const rafRef = useRef(0)

  const attach = useCallback(async () => {
    const el = mediaRef.current
    if (!el || attachedRef.current || unsupported) return
    try {
      const ctx = new AudioContext()
      const src = ctx.createMediaElementSource(el)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      an.smoothingTimeConstant = 0.65
      src.connect(an)
      an.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = an
      attachedRef.current = true
      if (ctx.state === 'suspended') await ctx.resume()
    } catch {
      setUnsupported(true)
      attachedRef.current = false
    }
  }, [mediaRef, unsupported])

  const start = useCallback(() => {
    if (!analyserRef.current) return
    cancelAnimationFrame(rafRef.current)
    const tick = () => {
      const a = analyserRef.current
      if (!a) return
      const buf = new Uint8Array(a.frequencyBinCount)
      a.getByteFrequencyData(buf)
      const out: number[] = []
      const step = Math.max(1, Math.floor(buf.length / BIN_COUNT))
      for (let i = 0; i < BIN_COUNT; i++) {
        let s = 0
        for (let k = 0; k < step; k++) s += buf[(i * step + k) % buf.length] ?? 0
        out.push(Math.min(1, (s / step / 255) * 1.15))
      }
      setLevels(out)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setLevels(Array.from({ length: BIN_COUNT }, () => 0.08))
  }, [])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    void ctxRef.current?.close()
    ctxRef.current = null
    analyserRef.current = null
    attachedRef.current = false
    setUnsupported(false)
    setLevels(Array.from({ length: BIN_COUNT }, () => 0.08))
  }, [resetKey])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      void ctxRef.current?.close()
      ctxRef.current = null
      analyserRef.current = null
      attachedRef.current = false
    }
  }, [])

  return { levels, unsupported, attach, start, stop }
}
