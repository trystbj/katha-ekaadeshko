import { useEffect } from 'react'
import { useStudioStore } from '../store/useStudioStore'
import { delayMsBeforeNextChar, nextRevealVisibleLength, playLiveTypingTick } from '../utils/liveRevealTyping'

/** Advances stream-reveal typing timers (mounted once near app root). */
export function StreamRevealDriver() {
  const sr = useStudioStore((s) => s.streamReveal)

  useEffect(() => {
    if (!sr) return
    if (sr.visibleLen >= sr.fullDoc.length) {
      useStudioStore.getState().finalizeStreamReveal()
      return
    }
    if (sr.paused) return

    const ms = delayMsBeforeNextChar(sr.fullDoc, sr.visibleLen)
    const id = window.setTimeout(() => {
      const live = useStudioStore.getState().streamReveal
      if (!live || live.paused || live.visibleLen >= live.fullDoc.length) return
      const nextLen = nextRevealVisibleLength(live.fullDoc, live.visibleLen)
      useStudioStore.setState({
        streamReveal: { ...live, visibleLen: nextLen }
      })
      if (live.typingSound) playLiveTypingTick(0.032)
    }, ms)
    return () => window.clearTimeout(id)
  }, [sr])

  return null
}
