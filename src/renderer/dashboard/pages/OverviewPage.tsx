import { useEffect } from 'react'
import {
  Briefcase,
  CalendarDays,
  Clock,
  Coffee,
  DollarSign,
  LogIn,
  LogOut,
  Pause,
  Play,
  TimerReset,
  TrendingUp
} from 'lucide-react'
import { WorkStatus } from '@shared/types'
import { formatDuration, startOfDay } from '@shared/utils'
import { useAppStore } from '../../store'
import { toast } from '../../components/toast/toastStore'
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  SectionHeader,
  StatBlock,
  StatusBadge,
  TableShell
} from '../../components/ui'
import { useLiveSessionTimer } from '../../hooks/useLiveSessionTimer'
import {
  describeEntryContext,
  formatDate,
  formatEntryDuration,
  formatEntryWindow,
  getStatusMeta
} from '../../lib/viewUtils'

export default function OverviewPage() {
  const {
    session,
    entries,
    daySummary,
    weekSummary,
    isLoading,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    loadEntries
  } = useAppStore()
  const { status, timer, breakTimer } = useLiveSessionTimer(session)
  const statusMeta = getStatusMeta(status)

  useEffect(() => {
    loadEntries({ startDate: startOfDay(new Date()), limit: 10 })
  }, [])

  const handleClockIn = async () => {
    try {
      await clockIn()
      toast.success('Clocked in')
    } catch (error: any) {
      toast.error('Clock in failed', error.message)
    }
  }

  const handleClockOut = async () => {
    try {
      await clockOut()
      toast.success('Clocked out')
    } catch (error: any) {
      toast.error('Clock out failed', error.message)
    }
  }

  const handleStartBreak = async () => {
    try {
      await startBreak()
      toast.info('Break started')
    } catch (error: any) {
      toast.error('Break failed', error.message)
    }
  }

  const handleEndBreak = async () => {
    try {
      await endBreak()
      toast.success('Break ended')
    } catch (error: any) {
      toast.error('Resume failed', error.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Command Center"
        title="Overview"
        description="Track the active session, review today’s work, and check weekly billing rhythm without leaving the desktop flow."
        meta={<StatusBadge status={status} />}
      />

      <div className="td-split">
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <div className="flex items-start justify-between gap-5 border-b border-[color:var(--td-line)] p-5">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={status} />
                  {session?.entry.project && (
                    <span className="td-pill td-pill-accent">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {session.entry.client?.name ? `${session.entry.client.name} / ` : ''}
                        {session.entry.project.name}
                      </span>
                    </span>
                  )}
                </div>
                <div className={`td-mono text-[42px] font-bold leading-none ${statusMeta.textClass}`}>
                  {session ? timer : '00:00:00'}
                </div>
                {status === WorkStatus.OnBreak && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--td-warning)]">
                    <Coffee className="h-4 w-4" />
                    Break timer: <span className="td-mono font-semibold">{breakTimer}</span>
                  </div>
                )}
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--td-text-secondary)]">
                  {session
                    ? session.entry.note || 'Current session is live and stored locally for reporting.'
                    : 'Choose a project from the utility widget or clock in directly when the work is unassigned.'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {status === WorkStatus.OffWork ? (
                  <Button onClick={handleClockIn} disabled={isLoading} variant="success">
                    <LogIn className="h-4 w-4" />
                    Clock In
                  </Button>
                ) : (
                  <>
                    {status === WorkStatus.Working ? (
                      <Button onClick={handleStartBreak} disabled={isLoading} variant="warning">
                        <Pause className="h-4 w-4" />
                        Break
                      </Button>
                    ) : (
                      <Button onClick={handleEndBreak} disabled={isLoading} variant="success">
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    )}
                    <Button onClick={handleClockOut} disabled={isLoading} variant="danger">
                      <LogOut className="h-4 w-4" />
                      Clock Out
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="td-grid-4 p-4">
              <StatBlock
                icon={<Clock className="h-4 w-4" />}
                label="Today"
                value={daySummary ? formatDuration(daySummary.netMinutes) : '0m'}
                detail={`${daySummary?.entryCount || 0} entries logged`}
                tone="accent"
              />
              <StatBlock
                icon={<TrendingUp className="h-4 w-4" />}
                label="This Week"
                value={weekSummary ? formatDuration(weekSummary.netMinutes) : '0m'}
                detail={`${weekSummary?.entryCount || 0} total entries`}
              />
              <StatBlock
                icon={<DollarSign className="h-4 w-4" />}
                label="Billable"
                value={weekSummary ? formatDuration(weekSummary.billableMinutes) : '0m'}
                detail={weekSummary && weekSummary.netMinutes > 0
                  ? `${Math.round((weekSummary.billableMinutes / weekSummary.netMinutes) * 100)}% of net time`
                  : 'No billable time yet'}
                tone="success"
              />
              <StatBlock
                icon={<Coffee className="h-4 w-4" />}
                label="Breaks"
                value={weekSummary ? formatDuration(weekSummary.breakMinutes) : '0m'}
                detail="Tracked this week"
                tone="warning"
              />
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader
              title="Today’s Entries"
              description="A compact audit trail for the active day."
              compact
            />
            <RecentEntries entries={entries} />
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel className="p-4">
            <SectionHeader
              title="Week Rhythm"
              description={weekSummary ? `${formatDate(weekSummary.weekStart)} through ${formatDate(weekSummary.weekEnd)}` : 'Current week'}
              compact
            />
            <div className="space-y-3">
              {(weekSummary?.days || []).map(day => {
                const max = Math.max(weekSummary?.days.reduce((largest, item) => Math.max(largest, item.netMinutes), 1) || 1, 1)
                const width = Math.max(5, Math.round((day.netMinutes / max) * 100))
                return (
                  <div key={day.date}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-[color:var(--td-text-secondary)]">
                        {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                      </span>
                      <span className="td-mono text-[color:var(--td-text-tertiary)]">{formatDuration(day.netMinutes)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--td-track)]">
                      <div className="h-full rounded-full bg-[color:var(--td-accent)]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
              {!weekSummary?.days?.length && (
                <EmptyState
                  compact
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="No weekly data yet"
                  description="Clock in or add a manual entry to build the week view."
                />
              )}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader title="Session Context" compact />
            <div className="space-y-3 text-sm">
              <InfoRow label="Client" value={session?.entry.client?.name || 'Unassigned'} />
              <InfoRow label="Project" value={session?.entry.project?.name || 'No project selected'} />
              <InfoRow label="Task" value={session?.entry.task?.name || 'No task'} />
              <InfoRow label="Billable" value={session?.entry.billable ? 'Yes' : 'No'} />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function RecentEntries({ entries }: { entries: ReturnType<typeof useAppStore.getState>['entries'] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        icon={<TimerReset className="h-5 w-5" />}
        title="No entries today"
        description="Clock in from the topbar or create a manual entry from Time Logs."
      />
    )
  }

  return (
    <TableShell>
      <div className="td-table-wrap">
        <table className="td-table">
          <thead>
            <tr>
              <th>Window</th>
              <th>Work</th>
              <th>Billing</th>
              <th className="text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 8).map(entry => (
              <tr key={entry.id}>
                <td className="td-mono whitespace-nowrap">{formatEntryWindow(entry)}</td>
                <td>
                  <div className="font-medium text-[color:var(--td-text)]">{entry.project?.name || 'No project'}</div>
                  <div className="truncate text-[11px] text-[color:var(--td-text-tertiary)]">{describeEntryContext(entry)}</div>
                </td>
                <td>
                  <span className={`td-pill ${entry.billable ? 'td-pill-success' : 'td-pill-neutral'}`}>
                    {entry.billable ? 'Billable' : 'Non-billable'}
                  </span>
                </td>
                <td className="td-mono text-right font-semibold text-[color:var(--td-text)]">{formatEntryDuration(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--td-line)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[12px] text-[color:var(--td-text-tertiary)]">{label}</span>
      <span className="truncate text-right text-[12px] font-medium text-[color:var(--td-text)]">{value}</span>
    </div>
  )
}
