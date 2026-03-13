import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { toast } from '../components/toast/toastStore'
import { formatTimerDisplay } from '@shared/utils'
import { WorkStatus } from '@shared/types'
import {
  Clock, Coffee, LogOut, LogIn, Play, Pause,
  LayoutDashboard, Briefcase, ChevronDown
} from 'lucide-react'

export default function TopbarWidget() {
  const {
    session, isLoading, clients, projects,
    refreshSession, clockIn, clockOut, startBreak, endBreak,
    loadClients, loadProjects
  } = useAppStore()

  const [elapsed, setElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshSession()
    loadClients()
    loadProjects()
    const poll = setInterval(() => refreshSession(), 10000)
    return () => clearInterval(poll)
  }, [])

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
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session])

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const status = session?.status ?? WorkStatus.OffWork
  const statusDot = status === WorkStatus.Working
    ? 'bg-status-working animate-timer-pulse'
    : status === WorkStatus.OnBreak
    ? 'bg-status-break'
    : 'bg-status-off'

  const handleClockIn = async () => { try { await clockIn(); toast.success('Clocked in') } catch (e: any) { toast.error('Clock in failed', e.message) } }
  const handleClockOut = async () => { try { await clockOut(); toast.success('Clocked out') } catch (e: any) { toast.error('Clock out failed', e.message) } }
  const handleStartBreak = async () => { try { await startBreak(); toast.info('Break started') } catch (e: any) { toast.error('Break failed', e.message) } }
  const handleEndBreak = async () => { try { await endBreak(); toast.success('Break ended') } catch (e: any) { toast.error('Resume failed', e.message) } }
  const handleOpenDashboard = () => { window.api.openDashboard() }

  return (
    <div className="topbar-window h-full flex items-center px-3 gap-2 select-none" style={{ WebkitAppRegion: 'drag' } as any}>

      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-1">
        <Clock className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-bold text-text-primary tracking-tight">TimeDock</span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Status Dot + Label */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
        <span className={`text-2xs font-medium uppercase tracking-wider ${
          status === WorkStatus.Working ? 'text-status-working' :
          status === WorkStatus.OnBreak ? 'text-status-break' : 'text-status-off'
        }`}>
          {status === WorkStatus.Working ? 'Working' : status === WorkStatus.OnBreak ? 'Break' : 'Off'}
        </span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Timer */}
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm font-bold tracking-tight ${
          status === WorkStatus.Working ? 'text-status-working' :
          status === WorkStatus.OnBreak ? 'text-status-break' : 'text-text-tertiary'
        }`}>
          {formatTimerDisplay(elapsed)}
        </span>
        {status === WorkStatus.OnBreak && (
          <span className="flex items-center gap-1 text-2xs text-status-break">
            <Coffee className="w-3 h-3" />
            {formatTimerDisplay(breakElapsed)}
          </span>
        )}
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Current Project */}
      <div className="relative" ref={pickerRef} style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => setShowProjectPicker(!showProjectPicker)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-4 transition-colors text-xs"
        >
          <Briefcase className="w-3 h-3 text-text-tertiary" />
          <span className="text-text-primary max-w-[140px] truncate">
            {session?.entry.project?.name || 'No project'}
          </span>
          {session?.entry.client && (
            <span className="text-text-tertiary text-2xs">({session.entry.client.code || session.entry.client.name})</span>
          )}
          <ChevronDown className="w-3 h-3 text-text-tertiary" />
        </button>

        {showProjectPicker && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-surface-1 border border-border rounded-lg shadow-popup p-1.5 max-h-52 overflow-y-auto z-50 animate-slide-down">
            {projects.filter(p => p.active).map(project => {
              const client = clients.find(c => c.id === project.clientId)
              return (
                <button
                  key={project.id}
                  onClick={async () => {
                    await useAppStore.getState().switchProject(project.id, undefined, project.clientId)
                    setShowProjectPicker(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{project.name}</span>
                  {client && <span className="text-2xs text-text-tertiary ml-2 shrink-0">{client.code}</span>}
                </button>
              )
            })}
            {projects.filter(p => p.active).length === 0 && (
              <div className="text-2xs text-text-tertiary px-2 py-2 text-center">No active projects</div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {status === WorkStatus.OffWork ? (
          <button onClick={handleClockIn} disabled={isLoading} className="topbar-btn topbar-btn-success">
            <LogIn className="w-3.5 h-3.5" />
            <span>Clock In</span>
          </button>
        ) : (
          <>
            {status === WorkStatus.Working ? (
              <button onClick={handleStartBreak} disabled={isLoading} className="topbar-btn topbar-btn-warning">
                <Pause className="w-3.5 h-3.5" />
                <span>Break</span>
              </button>
            ) : (
              <button onClick={handleEndBreak} disabled={isLoading} className="topbar-btn topbar-btn-success">
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}
            <button onClick={handleClockOut} disabled={isLoading} className="topbar-btn topbar-btn-danger">
              <LogOut className="w-3.5 h-3.5" />
              <span>Out</span>
            </button>
          </>
        )}

        <div className="w-px h-5 bg-border mx-0.5" />

        <button onClick={handleOpenDashboard} className="topbar-btn topbar-btn-ghost" title="Open Dashboard">
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>
    </div>
  )
}
