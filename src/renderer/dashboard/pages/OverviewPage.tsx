import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '../../store'
import { toast } from '../../components/toast/toastStore'
import { WorkStatus } from '@shared/types'
import { formatTimerDisplay, formatDuration } from '@shared/utils'
import {
  Clock, TrendingUp, DollarSign, Coffee,
  LogIn, LogOut, Pause, Play, Briefcase
} from 'lucide-react'

export default function OverviewPage() {
  const { session, daySummary, weekSummary, isLoading, clockIn, clockOut, startBreak, endBreak } = useAppStore()
  const [elapsed, setElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const status = session?.status ?? WorkStatus.OffWork

  useEffect(() => {
    if (session) {
      setElapsed(session.elapsedSeconds)
      setBreakElapsed(session.breakElapsedSeconds)
      timerRef.current = setInterval(() => {
        if (session.status === WorkStatus.Working) {
          setElapsed(prev => prev + 1)
        } else {
          setBreakElapsed(prev => prev + 1)
        }
      }, 1000)
    } else {
      setElapsed(0)
      setBreakElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session])

  const handleClockIn = async () => { try { await clockIn(); toast.success('Clocked in') } catch (e: any) { toast.error('Clock in failed', e.message) } }
  const handleClockOut = async () => { try { await clockOut(); toast.success('Clocked out') } catch (e: any) { toast.error('Clock out failed', e.message) } }
  const handleStartBreak = async () => { try { await startBreak(); toast.info('Break started') } catch (e: any) { toast.error('Break failed', e.message) } }
  const handleEndBreak = async () => { try { await endBreak(); toast.success('Break ended') } catch (e: any) { toast.error('Resume failed', e.message) } }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Your time tracking command center</p>
      </div>

      {/* Live Session Card */}
      <div className={`card mb-6 relative overflow-hidden ${
        status === WorkStatus.Working ? 'border-status-working/30' :
        status === WorkStatus.OnBreak ? 'border-status-break/30' : ''
      }`}>
        {status !== WorkStatus.OffWork && (
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${
            status === WorkStatus.Working ? 'bg-status-working' : 'bg-status-break'
          }`} />
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`badge ${
                status === WorkStatus.Working ? 'badge-working' :
                status === WorkStatus.OnBreak ? 'badge-break' : 'badge-off'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  status === WorkStatus.Working ? 'bg-status-working animate-timer-pulse' :
                  status === WorkStatus.OnBreak ? 'bg-status-break' : 'bg-status-off'
                }`} />
                {status === WorkStatus.Working ? 'Working' :
                 status === WorkStatus.OnBreak ? 'On Break' : 'Off Work'}
              </div>
              {session?.entry.project && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Briefcase className="w-3 h-3" />
                  {session.entry.client?.name && <span>{session.entry.client.name} ·</span>}
                  <span className="text-text-primary font-medium">{session.entry.project.name}</span>
                </div>
              )}
            </div>

            <div className={`font-mono text-4xl font-bold tracking-tight ${
              status === WorkStatus.Working ? 'text-status-working' :
              status === WorkStatus.OnBreak ? 'text-status-break' : 'text-text-tertiary'
            }`}>
              {session ? formatTimerDisplay(elapsed) : '00:00:00'}
            </div>

            {status === WorkStatus.OnBreak && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-status-break">
                <Coffee className="w-3.5 h-3.5" />
                Break: {formatTimerDisplay(breakElapsed)}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {status === WorkStatus.OffWork ? (
              <button onClick={handleClockIn} disabled={isLoading} className="btn btn-success gap-2">
                <LogIn className="w-4 h-4" />
                Clock In
              </button>
            ) : (
              <>
                {status === WorkStatus.Working ? (
                  <button onClick={handleStartBreak} disabled={isLoading} className="btn btn-warning gap-2">
                    <Pause className="w-4 h-4" />
                    Break
                  </button>
                ) : (
                  <button onClick={handleEndBreak} disabled={isLoading} className="btn btn-success gap-2">
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                )}
                <button onClick={handleClockOut} disabled={isLoading} className="btn btn-danger gap-2">
                  <LogOut className="w-4 h-4" />
                  Clock Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label="Today"
          value={daySummary ? formatDuration(daySummary.netMinutes) : '0m'}
          detail={`${daySummary?.entryCount || 0} entries`}
          color="text-accent"
        />
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="This Week"
          value={weekSummary ? formatDuration(weekSummary.netMinutes) : '0m'}
          detail={`${weekSummary?.entryCount || 0} entries`}
          color="text-info"
        />
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Billable (Week)"
          value={weekSummary ? formatDuration(weekSummary.billableMinutes) : '0m'}
          detail={weekSummary && weekSummary.netMinutes > 0
            ? `${Math.round((weekSummary.billableMinutes / weekSummary.netMinutes) * 100)}% utilization`
            : '0% utilization'}
          color="text-success"
        />
        <SummaryCard
          icon={<Coffee className="w-4 h-4" />}
          label="Break Time (Week)"
          value={weekSummary ? formatDuration(weekSummary.breakMinutes) : '0m'}
          detail={weekSummary && weekSummary.totalMinutes > 0
            ? `${Math.round((weekSummary.breakMinutes / weekSummary.totalMinutes) * 100)}% of total`
            : '—'}
          color="text-warning"
        />
      </div>

      {/* Recent Entries */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Today's Entries</h3>
        <RecentEntries />
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, detail, color }: {
  icon: React.ReactNode; label: string; value: string; detail: string; color: string
}) {
  return (
    <div className="card-hover">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} opacity-70`}>{icon}</div>
        <span className="text-xs text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-2xs text-text-tertiary mt-1">{detail}</div>
    </div>
  )
}

function RecentEntries() {
  const { entries, loadEntries } = useAppStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      loadEntries({ startDate: today.toISOString(), limit: 10 })
      setLoaded(true)
    }
  }, [loaded])

  if (entries.length === 0) {
    return <div className="text-sm text-text-tertiary py-4 text-center">No entries today</div>
  }

  return (
    <div className="space-y-1">
      {entries.map(entry => {
        const startTime = entry.startedAt ? new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
        const endTime = entry.endedAt ? new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'
        const breakMins = entry.breaks.reduce((s, b) => s + (b.durationMinutes || 0), 0)
        const netMins = (entry.durationMinutes || 0) - breakMins

        return (
          <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-surface-3 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-xs text-text-tertiary font-mono w-24">
                {startTime} — {endTime}
              </div>
              <div className="text-sm text-text-primary">
                {entry.project?.name || 'No project'}
              </div>
              {entry.client && (
                <div className="text-xs text-text-tertiary">{entry.client.name}</div>
              )}
              {entry.billable && (
                <div className="badge badge-working text-2xs">$</div>
              )}
            </div>
            <div className="text-sm font-mono text-text-secondary">
              {entry.endedAt ? formatDuration(netMins) : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
