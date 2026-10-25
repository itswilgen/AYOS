import { useEffect, useRef } from 'react'

type Options = {
  /** Delay between runs while the tab is visible. */
  interval: number
  /** Delay while the tab is in the background. Defaults to 30 seconds. */
  hiddenInterval?: number
  enabled?: boolean
}

/**
 * Runs `task` on a timer, slowing down in background tabs and running at once when the tab regains focus.
 * The next run is only scheduled after the previous one settles, so slow responses never pile up.
 */
export function usePolling(task: () => Promise<unknown>, { interval, hiddenInterval = 30_000, enabled = true }: Options) {
  const latest = useRef(task)
  useEffect(() => { latest.current = task })

  useEffect(() => {
    if (!enabled) return
    let timer: number | undefined
    let running = false
    let stopped = false
    const schedule = () => {
      window.clearTimeout(timer)
      if (!stopped) timer = window.setTimeout(tick, document.hidden ? hiddenInterval : interval)
    }
    const tick = async () => {
      if (running) return
      running = true
      try { await latest.current() } catch { /* the caller shows its own error state */ } finally {
        running = false
        schedule()
      }
    }
    const onVisible = () => { if (!document.hidden) void tick() }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled, interval, hiddenInterval])
}
