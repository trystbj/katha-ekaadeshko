import { useEffect, useState } from 'react'

/** Rotates placeholder i18n keys every `intervalMs`. */
export function useRotatingPlaceholder(keys: readonly string[], intervalMs = 4200): string {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (keys.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % keys.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [keys, intervalMs])
  return keys[index] ?? keys[0] ?? ''
}
