import {
  Clock,
  Download,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  TimerReset,
  Users
} from 'lucide-react'
import { useAppStore } from '../store'
import { StatusBadge } from '../components/ui'
import { useLiveSessionTimer } from '../hooks/useLiveSessionTimer'
import { CURRENT_APP_VERSION } from '../data/releaseHistory'

export const navItems = [
  { id: 'overview', label: 'Overview', group: 'Track', icon: LayoutDashboard },
  { id: 'logs', label: 'Time Logs', group: 'Track', icon: Clock },
  { id: 'projects', label: 'Projects', group: 'Manage', icon: FolderOpen },
  { id: 'clients', label: 'Clients', group: 'Manage', icon: Users },
  { id: 'kanban', label: 'KanBan', group: 'Output', icon: KanbanSquare },
  { id: 'exports', label: 'Exports', group: 'Output', icon: Download },
  { id: 'settings', label: 'Settings', group: 'Output', icon: Settings }
] as const

export default function Sidebar() {
  const { activePage, setActivePage, session, clients, projects } = useAppStore()
  const { status, timer } = useLiveSessionTimer(session)
  const grouped = navItems.reduce<Record<string, typeof navItems[number][]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <aside className="td-sidebar titlebar-no-drag">
      <div className="td-brand">
        <div className="td-brand-mark">
          <TimerReset className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="td-brand-title">TimeDock</div>
          <div className="td-brand-subtitle">Local time utility</div>
        </div>
      </div>

      <div className="td-sidebar-status">
        <StatusBadge status={status} compact />
        <div className="td-sidebar-status-time td-mono">{timer}</div>
        <div className="mt-1 truncate text-[11px] text-[color:var(--td-text-tertiary)]">
          {session?.entry.project?.name || 'No active project'}
        </div>
      </div>

      <nav className="td-sidebar-nav" aria-label="Dashboard sections">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="td-sidebar-group-label">{group}</div>
            <div className="flex flex-col gap-0.5">
              {items.map(item => {
                const Icon = item.icon
                const active = activePage === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    className={`td-sidebar-item ${active ? 'td-sidebar-item-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="td-sidebar-footer">
        <div className="flex items-center justify-between">
          <span>TimeDock v{CURRENT_APP_VERSION}</span>
          <span>{clients.length} clients</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Local SQLite</span>
          <span>{projects.length} projects</span>
        </div>
      </div>
    </aside>
  )
}
