import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Handshake,
  LayoutDashboard,
  PanelsTopLeft,
  StickyNote
} from 'lucide-react'
import { WorkStatus, type Client, type KanbanCardPayload, type Lead, type Project, type TimeEntryWithRelations } from '@shared/types'
import { formatDuration, startOfDay } from '@shared/utils'
import { useAppStore } from '../store'
import { toast, useToastStore } from '../components/toast/toastStore'
import { UtilitySessionActions } from '../components/time/UtilitySessionActions'
import { useLiveSessionTimer } from '../hooks/useLiveSessionTimer'
import { formatEntryWindow, getEntryNetMinutes, getProjectClient, getStatusMeta } from '../lib/viewUtils'
import OperatorOverview, { LeadFollowUpsSection, QuickCaptureSection } from './OperatorOverview'

type ActiveMenu = 'clients' | 'projects' | null
type WidgetTab = 'overview' | 'leads' | 'notes'

interface MenuPosition {
  left: number
  top: number
  maxHeight: number
}

const MENU_MARGIN = 10
const MENU_WIDTHS: Record<Exclude<ActiveMenu, null>, number> = {
  clients: 284,
  projects: 340
}
const WIDGET_TRANSITION_MS = 280

export default function TopbarWidget() {
  const {
    session,
    isLoading,
    clients,
    projects,
    leads,
    entries,
    kanbanBoard,
    refreshSession,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    switchProject,
    switchClient,
    loadClients,
    loadProjects,
    loadLeads,
    loadEntries,
    loadKanbanBoard,
    createKanbanCard,
    updateLead,
    setActivePage
  } = useAppStore()
  const toastCount = useToastStore(state => state.toasts.length)
  const { status, timer, breakTimer } = useLiveSessionTimer(session)
  const statusMeta = getStatusMeta(status)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isExpandedContentMounted, setIsExpandedContentMounted] = useState(false)
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null)
  const [activeTab, setActiveTab] = useState<WidgetTab>('overview')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [pendingProjectId, setPendingProjectId] = useState('')
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 14, top: 84, maxHeight: 280 })

  const clientButtonRef = useRef<HTMLButtonElement>(null)
  const projectButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<number | null>(null)
  const expandFrameRef = useRef<number | null>(null)

  const activeClients = useMemo(() => clients.filter(client => client.active), [clients])
  const activeProjects = useMemo(() => projects.filter(project => project.active), [projects])
  const selectedClient = selectedClientId ? clients.find(client => client.id === selectedClientId) || null : null
  const pendingProject = pendingProjectId ? projects.find(project => project.id === pendingProjectId) || null : null
  const currentProject = session?.entry.project || pendingProject || null
  const currentClient = session?.entry.client || getProjectClient(currentProject, clients) || selectedClient
  const visibleProjects = selectedClientId ? activeProjects.filter(project => project.clientId === selectedClientId) : activeProjects
  const recentEntries = entries.slice(0, 6)
  const mediumSurfaceVisible = isExpanded || isExpandedContentMounted

  const clearWidgetTransitionTimers = useCallback(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }

    if (expandFrameRef.current) {
      window.cancelAnimationFrame(expandFrameRef.current)
      expandFrameRef.current = null
    }
  }, [])

  const expandWidget = useCallback(() => {
    clearWidgetTransitionTimers()
    window.api.setTopbarExpanded(true).catch(() => undefined)
    setIsExpandedContentMounted(true)
    expandFrameRef.current = window.requestAnimationFrame(() => {
      setIsExpanded(true)
      expandFrameRef.current = null
    })
  }, [clearWidgetTransitionTimers])

  const collapseWidget = useCallback(() => {
    clearWidgetTransitionTimers()
    setActiveMenu(null)
    setIsExpanded(false)
    collapseTimerRef.current = window.setTimeout(() => {
      setIsExpandedContentMounted(false)
      collapseTimerRef.current = null
      window.api.setTopbarExpanded(false).catch(() => undefined)
    }, WIDGET_TRANSITION_MS)
  }, [clearWidgetTransitionTimers])

  useEffect(() => {
    refreshSession()
    loadClients()
    loadProjects()
    refreshPanelData()

    const interval = window.setInterval(() => {
      refreshSession()
    }, 10000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const sessionClientId = session?.entry.clientId || session?.entry.project?.clientId || ''
    if (sessionClientId) {
      setSelectedClientId(sessionClientId)
      setPendingProjectId('')
    }
  }, [session?.entry.clientId, session?.entry.project?.clientId])

  useEffect(() => {
    const surfaceOpen = !mediumSurfaceVisible && toastCount > 0
    window.api.setTopbarMenuOpen(surfaceOpen).catch(() => undefined)
  }, [mediumSurfaceVisible, toastCount])

  useEffect(() => {
    return () => {
      clearWidgetTransitionTimers()
      window.api.setTopbarExpanded(false).catch(() => undefined)
      window.api.setTopbarMenuOpen(false).catch(() => undefined)
    }
  }, [clearWidgetTransitionTimers])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!activeMenu) return
      const target = event.target as Node
      const activeButton = activeMenu === 'clients' ? clientButtonRef.current : projectButtonRef.current
      if (menuRef.current?.contains(target) || activeButton?.contains(target)) return
      setActiveMenu(null)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeMenu])

  useLayoutEffect(() => {
    if (!activeMenu || !isExpanded) return

    const updatePosition = () => {
      const trigger = activeMenu === 'clients' ? clientButtonRef.current : projectButtonRef.current
      if (!trigger) return
      const width = MENU_WIDTHS[activeMenu]
      const rect = trigger.getBoundingClientRect()
      const maxLeft = Math.max(MENU_MARGIN, window.innerWidth - width - MENU_MARGIN)
      const left = Math.min(Math.max(MENU_MARGIN, rect.left), maxLeft)
      const top = Math.min(rect.bottom + 8, window.innerHeight - 190)
      const availableHeight = Math.max(180, window.innerHeight - top - MENU_MARGIN)
      setMenuPosition({ left, top, maxHeight: Math.min(activeMenu === 'projects' ? 308 : 270, availableHeight) })
    }

    updatePosition()
    const resizeTimer = window.setTimeout(updatePosition, 80)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', updatePosition)
    }
  }, [activeMenu, clients.length, isExpanded, projects.length])

  async function refreshPanelData() {
    await Promise.all([
      loadLeads({ includeArchived: false }),
      loadKanbanBoard(),
      loadEntries({ startDate: startOfDay(new Date()), limit: 8 })
    ])
  }

  const toggleMenu = (menu: Exclude<ActiveMenu, null>) => {
    if (!isExpanded) expandWidget()
    setActiveMenu(current => (current === menu ? null : menu))
  }

  const handleClockIn = async () => {
    const project = pendingProject
    const payload = project
      ? { projectId: project.id, clientId: project.clientId, billable: project.billableDefault }
      : selectedClientId
      ? { clientId: selectedClientId }
      : undefined

    try {
      await clockIn(payload)
      setPendingProjectId('')
      refreshPanelData().catch(() => undefined)
      toast.success(project ? `Clocked in to ${project.name}` : 'Clocked in')
    } catch (error: any) {
      toast.error('Clock in failed', error.message)
    }
  }

  const handleClockOut = async () => {
    try {
      await clockOut()
      refreshPanelData().catch(() => undefined)
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

  const applyClientSelection = (clientId: string) => {
    setSelectedClientId(clientId)
    if (clientId && pendingProject && pendingProject.clientId !== clientId) setPendingProjectId('')
  }

  const handleClientSelection = (clientId: string) => {
    applyClientSelection(clientId)
    setActiveMenu('projects')
  }

  const handleClientScopeSelection = async (clientId: string) => {
    applyClientSelection(clientId)
    setActiveMenu(null)
    if (!clientId || status === WorkStatus.OffWork || session?.entry.clientId === clientId) return

    const client = clients.find(item => item.id === clientId)
    try {
      await switchClient(clientId)
      setPendingProjectId('')
      refreshPanelData().catch(() => undefined)
      toast.success('Client switched', client?.name || 'Active client updated')
    } catch (error: any) {
      toast.error('Client switch failed', error.message || 'The active client could not be updated.')
    }
  }

  const handleProjectSelection = async (project: Project) => {
    setSelectedClientId(project.clientId)
    setActiveMenu(null)

    if (status === WorkStatus.OffWork) {
      setPendingProjectId(project.id)
      toast.info('Project selected', `${project.name} will be used when you clock in.`)
      return
    }

    if (session?.entry.projectId === project.id) return

    try {
      await switchProject(project.id, undefined, project.clientId)
      refreshPanelData().catch(() => undefined)
      toast.success('Project switched', project.name)
    } catch (error: any) {
      toast.error('Project switch failed', error.message)
    }
  }

  const handleOpenDashboard = async (page: string = 'overview') => {
    setActiveMenu(null)
    setActivePage(page)
    try {
      await window.api.openDashboard()
    } catch (error: any) {
      toast.error('Dashboard failed to open', error.message)
    }
  }

  const handleCreateKanbanCard = async (payload: KanbanCardPayload) => {
    await createKanbanCard(payload)
  }

  const handleLeadContacted = async (lead: Lead) => {
    try {
      await updateLead({
        id: lead.id,
        lastContactAt: new Date().toISOString(),
        status: lead.status === 'new' ? 'contacted' : lead.status
      })
      toast.success('Lead marked contacted', lead.companyName)
    } catch (error: any) {
      toast.error('Lead update failed', error.message || 'The lead could not be updated.')
    }
  }

  return (
    <div className="topbar-stage td-utility select-none">
      <section
        className={`timedock-widget ${isExpanded ? 'timedock-widget-expanded' : 'timedock-widget-compact'} ${
          isExpandedContentMounted ? 'timedock-widget-medium-mounted' : ''
        }`}
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <header className="widget-header">
          <div className="widget-traffic" aria-hidden="true">
            <span className="bg-[#ff5f57]" />
            <span className="bg-[#febc2e]" />
            <span className="bg-[#28c840]" />
          </div>

          <div className="widget-live">
            <span className={`td-status-dot ${statusMeta.dotClass}`} />
            <div className="min-w-0">
              <div className={`td-mono text-sm font-bold ${utilityStatusClass(status)}`}>{timer}</div>
              <div className="truncate text-[11px] utility-muted">
                {currentProject?.name || statusMeta.label}
                {status === WorkStatus.OnBreak ? ` / Break ${breakTimer}` : ''}
              </div>
            </div>
          </div>

          {isExpandedContentMounted && (
            <div className={`widget-context ${isExpanded ? 'widget-content-enter' : 'widget-content-exit'}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                ref={clientButtonRef}
                type="button"
                onClick={() => toggleMenu('clients')}
                className={`topbar-selector widget-selector ${activeMenu === 'clients' ? 'topbar-selector-active' : ''}`}
                aria-expanded={activeMenu === 'clients'}
                aria-haspopup="menu"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{selectedClient?.name || currentClient?.name || 'All clients'}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </button>
              <button
                ref={projectButtonRef}
                type="button"
                onClick={() => toggleMenu('projects')}
                className={`topbar-selector widget-selector widget-selector-project ${activeMenu === 'projects' ? 'topbar-selector-active' : ''}`}
                aria-expanded={activeMenu === 'projects'}
                aria-haspopup="menu"
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{currentProject?.name || 'No project selected'}</span>
                {currentClient?.code && <span className="shrink-0 text-[10px] utility-muted">{currentClient.code}</span>}
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          )}

          <div className="widget-actions" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <UtilitySessionActions
              compact
              status={status}
              isLoading={isLoading}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
            />
            {isExpandedContentMounted && (
              <button type="button" onClick={() => handleOpenDashboard(activeTab === 'leads' ? 'leads' : activeTab === 'notes' ? 'kanban' : 'overview')} className="topbar-icon-btn" aria-label="Open dashboard">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => { isExpanded ? collapseWidget() : expandWidget() }}
              className="topbar-icon-btn widget-expand-btn"
              aria-label={isExpanded ? 'Collapse widget' : 'Expand widget'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        {isExpandedContentMounted && (
          <div className={`widget-dashboard ${isExpanded ? 'widget-content-enter' : 'widget-content-exit'}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="widget-tabbar" role="tablist" aria-label="Topbar widget sections">
              <WidgetTabButton active={activeTab === 'overview'} icon={<PanelsTopLeft className="h-3.5 w-3.5" />} label="Overview" onClick={() => setActiveTab('overview')} />
              <WidgetTabButton active={activeTab === 'leads'} icon={<Handshake className="h-3.5 w-3.5" />} label="Leads" onClick={() => setActiveTab('leads')} />
              <WidgetTabButton active={activeTab === 'notes'} icon={<StickyNote className="h-3.5 w-3.5" />} label="Notes" onClick={() => setActiveTab('notes')} />
            </div>

            {activeTab === 'overview' && (
              <div className="widget-overview-stack">
                <OperatorOverview
                  breakTimer={breakTimer}
                  clients={clients}
                  currentClient={currentClient}
                  currentProject={currentProject}
                  currentProjectId={session?.entry.projectId || pendingProjectId}
                  onClientSelect={handleClientScopeSelection}
                  onProjectSelect={handleProjectSelection}
                  projects={projects}
                  selectedClientId={selectedClientId}
                  status={status}
                  timer={timer}
                />
                <LogsPanel entries={recentEntries} onOpenDashboard={() => handleOpenDashboard('logs')} />
              </div>
            )}
            {activeTab === 'leads' && (
              <LeadFollowUpsSection
                leads={leads}
                onLeadContacted={handleLeadContacted}
                onOpenLeads={() => handleOpenDashboard('leads')}
              />
            )}
            {activeTab === 'notes' && (
              <QuickCaptureSection
                currentClient={currentClient}
                currentProject={currentProject}
                kanbanBoard={kanbanBoard}
                onCreateKanbanCard={handleCreateKanbanCard}
                onOpenKanban={() => handleOpenDashboard('kanban')}
              />
            )}
          </div>
        )}

        {activeMenu && isExpanded && (
          <div
            ref={menuRef}
            className="topbar-menu animate-slide-down"
            role="menu"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              width: MENU_WIDTHS[activeMenu],
              maxHeight: menuPosition.maxHeight,
              WebkitAppRegion: 'no-drag'
            } as any}
          >
            {activeMenu === 'clients' ? (
              <ClientMenu clients={activeClients} selectedClientId={selectedClientId} onSelect={handleClientSelection} />
            ) : (
              <ProjectMenu clients={clients} projects={visibleProjects} currentProjectId={session?.entry.projectId || pendingProjectId} onSelect={handleProjectSelection} />
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function WidgetTabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`widget-tab ${active ? 'widget-tab-active' : ''}`} role="tab" aria-selected={active}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function LogsPanel({ entries, onOpenDashboard }: { entries: TimeEntryWithRelations[]; onOpenDashboard: () => void }) {
  return (
    <section className="widget-section widget-section-fill">
      <SectionHeader title="Recent Time Logs" actionLabel="Open Logs" onAction={onOpenDashboard} />
      <EntryList entries={entries} />
    </section>
  )
}

function SectionHeader({ actionLabel, onAction, title }: { actionLabel?: string; onAction?: () => void; title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-[10px] font-bold uppercase utility-muted">{title}</h3>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-[10px] font-bold text-[color:var(--td-u-accent)]">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function EntryList({ entries, compact = false }: { entries: TimeEntryWithRelations[]; compact?: boolean }) {
  if (entries.length === 0) return <div className="utility-empty">No entries today</div>

  return (
    <div className={`widget-entry-list ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
      {entries.map(entry => (
        <div key={entry.id} className="widget-entry-row">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold utility-title">{entry.project?.name || 'No project'}</div>
            <div className="mt-0.5 truncate text-[10px] utility-muted">
              {formatEntryWindow(entry)}
              {entry.client?.name ? ` / ${entry.client.name}` : ''}
            </div>
          </div>
          <div className="td-mono shrink-0 text-right text-xs utility-secondary">
            {entry.endedAt ? formatDuration(getEntryNetMinutes(entry)) : 'Active'}
          </div>
        </div>
      ))}
    </div>
  )
}

function ClientMenu({ clients, selectedClientId, onSelect }: { clients: Client[]; selectedClientId: string; onSelect: (clientId: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="px-2 pb-1 text-[10px] font-bold uppercase utility-muted">Clients</div>
      <button type="button" onClick={() => onSelect('')} className={`topbar-menu-row ${!selectedClientId ? 'topbar-menu-row-active' : ''}`} role="menuitem" aria-selected={!selectedClientId}>
        <span className="truncate">All clients</span>
        {!selectedClientId && <Check className="h-3.5 w-3.5 text-[color:var(--td-u-accent)]" />}
      </button>
      {clients.map(client => (
        <button key={client.id} type="button" onClick={() => onSelect(client.id)} className={`topbar-menu-row ${selectedClientId === client.id ? 'topbar-menu-row-active' : ''}`} role="menuitem" aria-selected={selectedClientId === client.id}>
          <span className="min-w-0">
            <span className="block truncate">{client.name}</span>
            {client.code && <span className="block truncate text-[10px] utility-muted">{client.code}</span>}
          </span>
          {selectedClientId === client.id && <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--td-u-accent)]" />}
        </button>
      ))}
      {clients.length === 0 && <div className="utility-empty">No active clients</div>}
    </div>
  )
}

function ProjectMenu({
  clients,
  projects,
  currentProjectId,
  onSelect
}: {
  clients: Client[]
  projects: Project[]
  currentProjectId?: string | null
  onSelect: (project: Project) => void
}) {
  return (
    <div className="space-y-1">
      <div className="px-2 pb-1 text-[10px] font-bold uppercase utility-muted">Projects</div>
      {projects.map(project => {
        const client = getProjectClient(project, clients)
        const current = currentProjectId === project.id
        return (
          <button key={project.id} type="button" onClick={() => onSelect(project)} className={`topbar-menu-row ${current ? 'topbar-menu-row-active' : ''}`} role="menuitem" aria-selected={current}>
            <span className="min-w-0">
              <span className="block truncate">{project.name}</span>
              <span className="block truncate text-[10px] utility-muted">{[client?.name, project.code].filter(Boolean).join(' / ') || 'Uncoded project'}</span>
            </span>
            {current && <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--td-u-accent)]" />}
          </button>
        )
      })}
      {projects.length === 0 && <div className="utility-empty">No active projects for this client</div>}
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
