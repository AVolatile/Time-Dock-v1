import { useEffect, useMemo, useState } from 'react'
import { formatTimerDisplay } from '@shared/utils'
import { WorkStatus, type ActiveSession } from '@shared/types'

export function useLiveSessionTimer(session: ActiveSession | null) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0)
      setBreakElapsedSeconds(0)
      return
    }

    setElapsedSeconds(session.elapsedSeconds)
    setBreakElapsedSeconds(session.breakElapsedSeconds)

    const interval = window.setInterval(() => {
      if (session.status === WorkStatus.Working) {
        setElapsedSeconds(current => current + 1)
      }

      if (session.status === WorkStatus.OnBreak) {
        setBreakElapsedSeconds(current => current + 1)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [session])

  return useMemo(() => ({
    status: session?.status ?? WorkStatus.OffWork,
    elapsedSeconds,
    breakElapsedSeconds,
    timer: formatTimerDisplay(elapsedSeconds),
    breakTimer: formatTimerDisplay(breakElapsedSeconds)
  }), [breakElapsedSeconds, elapsedSeconds, session?.status])
}
