import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Check, Clock, Coffee, LayoutDashboard, Search, TimerReset } from 'lucide-react'
import { WorkStatus, type Project } from '@shared/types'
import { useAppStore } from '../store'
import { toast } from '../components/toast/toastStore'
import { UtilitySessionActions } from '../components/time/UtilitySessionActions'
import { useLiveSessionTimer } from '../hooks/useLiveSessionTimer'
import { getProjectClient, getStatusMeta } from '../lib/viewUtils'

export default function TrayWidget() {
  const {
    session,
    isLoading,
    clients,
    projects,
    refreshSession,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    switchProject,
    loadClients,
    loadProjects
  } = useAppStore()
  const { status, timer, breakTimer } = useLiveSessionTimer(session)
  const statusMeta = getStatusMeta(status)
  const [query, setQuery] = useState('')

  useEffect(() => {
    refreshSession()
    loadClients()
    loadProjects()
  }, [])

  const activeProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return projects
      .filter(project => project.active)
      .filter(project => {
        if (!normalized) return true
        const client = getProjectClient(project, clients)
        return `${project.name} ${project.code} ${client?.name || ''} ${client?.code || ''}`.toLowerCase().includes(normalized)
      })
      .slice(0, 8)
  }, [clients, projects, query])

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

  const handleProjectSelect = async (project: Project) => {
    try {
      if (status === WorkStatus.OffWork) {
        await clockIn({ projectId: project.id, clientId: project.clientId, billable: project.billableDefault })
        toast.success(`Clocked in to ${project.name}`)
      } else if (session?.entry.projectId !== project.id) {
        await switchProject(project.id, undefined, project.clientId)
        toast.success('Project switched', project.name)
      }
    } catch (error: any) {
      toast.error('Project action failed', error.message)
    }
  }

  const handleOpenDashboard = async () => {
    try {
      await window.api.openDashboard()
      await window.api.closeTrayPopup()
    } catch (error: any) {
      toast.error('Dashboard failed to open', error.message)
    }
  }

  return (
    <div className="tray-window td-utility select-none">
      <header className="utility-header">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--td-u-line)] bg-[rgba(255,255,255,0.08)] text-[color:var(--td-u-accent)]">
          <TimerReset className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold utility-title">TimeDock</div>
          <div className="text-[11px] utility-muted">Quick control panel</div>
        </div>
        <button type="button" onClick={handleOpenDashboard} className="utility-button" title="Open dashboard">
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-3">
        <section className="utility-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={`utility-badge ${utilityBadgeClass(status)}`}>
              <span className={`td-status-dot ${statusMeta.dotClass}`} />
              {statusMeta.label}
            </span>
            <span className="text-[11px] utility-muted">{session?.entry.billable ? 'Billable' : 'Non-billable'}</span>
          </div>

          <div className={`td-mono text-[38px] font-bold leading-none ${utilityStatusClass(status)}`}>
            {session ? timer : '00:00:00'}
          </div>
          {status === WorkStatus.OnBreak && (
            <div className="mt-2 flex items-center gap-2 text-xs utility-status-break">
              <Coffee className="h-3.5 w-3.5" />
              Break <span className="td-mono font-bold">{breakTimer}</span>
            </div>
          )}

          <div className="mt-4 rounded-md border border-[color:var(--td-u-line)] bg-[rgba(0,0,0,0.12)] p-3">
            <div className="mb-1 text-[10px] font-bold uppercase utility-muted">Current Work</div>
            <div className="truncate text-sm font-semibold utility-title">{session?.entry.project?.name || 'No project selected'}</div>
            <div className="mt-1 truncate text-[11px] utility-muted">
              {session?.entry.client?.name || 'Unassigned client'}
              {session?.entry.task?.name ? ` / ${session.entry.task.name}` : ''}
            </div>
          </div>
        </section>

        <section className="mt-3 utility-panel p-3">
          <div className="mb-3 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-[color:var(--td-u-accent)]" />
            <span className="text-xs font-bold utility-title">Project Switcher</span>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 utility-muted" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter active projects..."
              className="utility-input w-full pl-9"
            />
          </div>
          <div className="max-h-[210px] space-y-1 overflow-auto">
            {activeProjects.map(project => {
              const client = getProjectClient(project, clients)
              const current = session?.entry.projectId === project.id
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleProjectSelect(project)}
                  className={`utility-list-row ${current ? 'utility-list-row-active' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{project.name}</span>
                    <span className="block truncate text-[10px] utility-muted">
                      {[client?.name, project.code].filter(Boolean).join(' / ') || 'Uncoded project'}
                    </span>
                  </span>
                  {current && <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--td-u-accent)]" />}
                </button>
              )
            })}
            {activeProjects.length === 0 && <div className="utility-empty">No active projects match this filter</div>}
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--td-u-line)] p-3">
        <UtilitySessionActions
          fullWidth
          status={status}
          isLoading={isLoading}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
        />
      </footer>
    </div>
  )
}

function utilityStatusClass(status: WorkStatus): string {
  if (status === WorkStatus.Working) return 'utility-status-working'
  if (status === WorkStatus.OnBreak) return 'utility-status-break'
  return 'utility-status-off'
}

function utilityBadgeClass(status: WorkStatus): string {
  if (status === WorkStatus.Working) return 'utility-badge-working'
  if (status === WorkStatus.OnBreak) return 'utility-badge-break'
  return 'utility-badge-off'
}
