import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectState } from '../types/story'
import { useStudioStore } from '../store/useStudioStore'
import { pushStoryToHistory } from '../utils/storyHistory'

export type AutoSaveState = 'idle' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 2000
const SAVED_BANNER_MS = 2500

/**
 * Debounced save when a project is loaded and the user is signed in (and `katha` exposes projectsSave).
 * Reads the latest `project` from the store on flush.
 */
export function useAutoSaveProject(opts: {
  project: ProjectState | null
  authEmail: string | null
  afterSave?: () => void
}) {
  const { project, authEmail, afterSave } = opts
  const [state, setState] = useState<AutoSaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const lastFlushedRef = useRef<string | null>(null)
  const projectIdRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedBannerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushChainRef = useRef<Promise<void>>(Promise.resolve())
  const afterRef = useRef(afterSave)

  useEffect(() => {
    afterRef.current = afterSave
  }, [afterSave])

  useEffect(() => {
    const id = project?.id ?? null
    if (id !== projectIdRef.current) {
      projectIdRef.current = id
      lastFlushedRef.current = null
    }
  }, [project?.id])

  const flush = useCallback(async () => {
    const k = window.katha
    if (!authEmail || !k?.projectsSave) return

    const run = async () => {
      const latest = useStudioStore.getState().project
      if (!latest || !k?.projectsSave) return
      const snap = JSON.stringify(latest)
      if (snap === lastFlushedRef.current) return

      setState('saving')
      const z = useStudioStore.getState()
      const payload: ProjectState = {
        ...latest,
        updatedAt: new Date().toISOString(),
        uiLanguage: z.uiLanguage
      }
      try {
        await k.projectsSave(payload)
        lastFlushedRef.current = JSON.stringify(useStudioStore.getState().project)
        setLastSavedAt(new Date().toISOString())
        setState('saved')
        await pushStoryToHistory(useStudioStore.getState().project)
        afterRef.current?.()
        if (savedBannerRef.current) clearTimeout(savedBannerRef.current)
        savedBannerRef.current = setTimeout(() => setState('idle'), SAVED_BANNER_MS)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('Not authenticated') || msg.includes('401')) {
          setState('idle')
          return
        }
        setState('error')
      }
    }

    flushChainRef.current = flushChainRef.current.then(run, run)
    await flushChainRef.current
  }, [authEmail])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!project || !authEmail || !window.katha?.projectsSave) {
      return
    }
    const k = window.katha
    if (!k?.projectsSave) return

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flush()
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [project, authEmail, flush])

  useEffect(
    () => () => {
      if (savedBannerRef.current) clearTimeout(savedBannerRef.current)
    },
    []
  )

  return { autoSaveState: state, lastSavedAt }
}
