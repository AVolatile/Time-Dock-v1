import { useEffect } from 'react'
import { CalendarDays, Clock3, Database, HardDrive } from 'lucide-react'
import { useAppStore } from '../store'
import Sidebar, { navItems } from './Sidebar'
import OverviewPage from './pages/OverviewPage'
import TimeLogsPage from './pages/TimeLogsPage'
import ProjectsPage from './pages/ProjectsPage'
import ClientsPage from './pages/ClientsPage'
import LeadsPage from './pages/LeadsPage'
import KanbanNotesPage from './pages/KanbanNotesPage'
import ExportsPage from './pages/ExportsPage'
import SettingsPage from './pages/SettingsPage'
import { AppearanceToggle, StatusBadge } from '../components/ui'
import { useLiveSessionTimer } from '../hooks/useLiveSessionTimer'
import { useDashboardTheme } from '../hooks/useDashboardTheme'

export default function Dashboard() {
  const {
    activePage,
    session,
    refreshSession,
    loadClients,
    loadProjects,
    loadTasks,
    loadLeads,
    loadDaySummary,
    loadWeekSummary
  } = useAppStore()
  const { status, timer } = useLiveSessionTimer(session)
  const { theme, setTheme } = useDashboardTheme()
  const activeNavItem = navItems.find(item => item.id === activePage) || navItems[0]
  const ActiveIcon = activeNavItem.icon

  useEffect(() => {
    refreshSession()
    loadClients()
    loadProjects()
    loadTasks()
    loadLeads()
    loadDaySummary()
    loadWeekSummary()

    const interval = window.setInterval(() => {
      refreshSession()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="td-dashboard-window">
      <div className="td-titlebar titlebar-drag" />
      <Sidebar />
      <main className="td-dashboard-main">
        <div className="td-dashboard-toolbar titlebar-no-drag">
          <div className="td-toolbar-context">
            <ActiveIcon className="h-4 w-4" />
            <span className="td-toolbar-title">{activeNavItem.label}</span>
            <span aria-hidden="true">/</span>
            <span>Local workspace</span>
          </div>
          <div className="td-toolbar-context">
            <AppearanceToggle theme={theme} onChange={setTheme} />
            <StatusBadge status={status} compact />
            <span className="td-mono">{timer}</span>
            <span className="td-row gap-1">
              <HardDrive className="h-3.5 w-3.5" />
              SQLite
            </span>
            <span className="td-row gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <Clock3 className="h-3.5 w-3.5" />
            <Database className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="td-content-scroll">
          <div className="td-content">
            {renderPage(activePage)}
          </div>
        </div>
      </main>
    </div>
  )
}

function renderPage(activePage: string) {
  switch (activePage) {
    case 'overview':
      return <OverviewPage />
    case 'logs':
      return <TimeLogsPage />
    case 'projects':
      return <ProjectsPage />
    case 'clients':
      return <ClientsPage />
    case 'leads':
      return <LeadsPage />
    case 'kanban':
      return <KanbanNotesPage />
    case 'exports':
      return <ExportsPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <OverviewPage />
  }
}
