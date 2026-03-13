import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store'
import { toast } from '../components/toast/toastStore'
import { formatTimerDisplay } from '@shared/utils'
import { WorkStatus } from '@shared/types'
import {
  Clock, Coffee, LogOut, LogIn, Play, Pause,
  LayoutDashboard, ChevronDown, Briefcase
} from 'lucide-react'

export default function TrayWidget() {
  const { session, isLoading, clients, projects, refreshSession, clockIn, clockOut, startBreak, endBreak, loadClients, loadProjects } = useAppStore()

  const [elapsed, setElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Load initial data
  useEffect(() => {
    refreshSession()
    loadClients()
    loadProjects()
  }, [])

  // Timer tick
  useEffect(() => {
    if (session) {
      setElapsed(session.elapsedSeconds)
      setBreakElapsed(session.breakElapsedSeconds)

      timerRef.current = setInterval(() => {
        if (session.status === WorkStatus.Working) {
          setElapsed(prev => prev + 1)
        } else if (session.status === WorkStatus.OnBreak) {
          setBreakElapsed(prev => prev + 1)
        }
      }, 1000)
    } else {
      setElapsed(0)
      setBreakElapsed(0)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session])

  const status = session?.status ?? WorkStatus.OffWork
  const statusLabel = status === WorkStatus.Working ? 'Working' : status === WorkStatus.OnBreak ? 'On Break' : 'Off Work'
  const statusColor = status === WorkStatus.Working ? 'text-status-working' : status === WorkStatus.OnBreak ? 'text-status-break' : 'text-status-off'
  const statusBgColor = status === WorkStatus.Working ? 'bg-status-working-bg' : status === WorkStatus.OnBreak ? 'bg-status-break-bg' : 'bg-status-off-bg'

  const handleClockIn = async () => {
    try { await clockIn(); toast.success('Clocked in') } catch (e: any) { toast.error('Clock in failed', e.message) }
  }
  const handleClockOut = async () => {
    try { await clockOut(); toast.success('Clocked out') } catch (e: any) { toast.error('Clock out failed', e.message) }
  }
  const handleStartBreak = async () => {
    try { await startBreak(); toast.info('Break started') } catch (e: any) { toast.error('Break failed', e.message) }
  }
  const handleEndBreak = async () => {
    try { await endBreak(); toast.success('Break ended') } catch (e: any) { toast.error('Resume failed', e.message) }
  }
  const handleOpenDashboard = async () => {
    await window.api.openDashboard()
    await window.api.closeTrayPopup()
  }

  return (
    <div className="tray-window h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">TimeDock</span>
        </div>
        <button
          onClick={handleOpenDashboard}
          className="btn btn-ghost btn-sm gap-1.5"
          title="Open Dashboard"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>

      <div className="divider mx-4" />

      {/* Status Section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor.replace('text-', 'bg-')} ${status === WorkStatus.Working ? 'animate-timer-pulse' : ''}`} />
          <div className={`badge ${status === WorkStatus.Working ? 'badge-working' : status === WorkStatus.OnBreak ? 'badge-break' : 'badge-off'}`}>
            {statusLabel}
          </div>
        </div>

        {/* Timer */}
        <div className="mb-4">
          <div className={`font-mono text-3xl font-bold tracking-tight ${statusColor}`}>
            {formatTimerDisplay(elapsed)}
          </div>
          {status === WorkStatus.OnBreak && (
            <div className="font-mono text-sm text-status-break mt-1 flex items-center gap-1.5">
              <Coffee className="w-3 h-3" />
              Break: {formatTimerDisplay(breakElapsed)}
            </div>
          )}
        </div>

        {/* Current Project */}
        {session && (
          <div className="mb-4">
            <div className="text-2xs uppercase tracking-wider text-text-tertiary mb-1">Current Project</div>
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="flex items-center gap-2 text-sm text-text-primary hover:text-accent transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5 text-text-tertiary" />
              <span>{session.entry.project?.name || 'No project'}</span>
              {session.entry.client && (
                <span className="text-text-tertiary">· {session.entry.client.name}</span>
              )}
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </button>
          </div>
        )}

        {/* Project Picker */}
        {showProjectPicker && (
          <div className="mb-4 bg-surface-0 border border-border rounded-lg p-2 max-h-40 overflow-y-auto animate-slide-down">
            {projects.filter(p => p.active).map(project => {
              const client = clients.find(c => c.id === project.clientId)
              return (
                <button
                  key={project.id}
                  onClick={async () => {
                    await useAppStore.getState().switchProject(project.id, undefined, project.clientId)
                    setShowProjectPicker(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-sm text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors flex items-center justify-between"
                >
                  <span>{project.name}</span>
                  {client && <span className="text-2xs text-text-tertiary">{client.code}</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Note */}
        {session?.entry.note && (
          <div className="text-xs text-text-tertiary italic mb-4 line-clamp-2">
            "{session.entry.note}"
          </div>
        )}
      </div>

      <div className="divider mx-4" />

      {/* Actions */}
      <div className="px-4 py-4 mt-auto">
        {status === WorkStatus.OffWork ? (
          <button
            onClick={handleClockIn}
            disabled={isLoading}
            className="btn btn-success w-full justify-center gap-2 py-2.5"
          >
            <LogIn className="w-4 h-4" />
            Clock In
          </button>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {status === WorkStatus.Working ? (
                <button
                  onClick={handleStartBreak}
                  disabled={isLoading}
                  className="btn btn-warning justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Break
                </button>
              ) : (
                <button
                  onClick={handleEndBreak}
                  disabled={isLoading}
                  className="btn btn-success justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              )}
              <button
                onClick={handleClockOut}
                disabled={isLoading}
                className="btn btn-danger justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Clock Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
