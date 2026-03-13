import { useAppStore } from '../store'
import { WorkStatus } from '@shared/types'
import {
  LayoutDashboard, Clock, FolderOpen, Users,
  Download, Settings, Coffee
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'logs', label: 'Time Logs', icon: Clock },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'exports', label: 'Exports', icon: Download },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
  const { activePage, setActivePage, session } = useAppStore()
  const status = session?.status ?? WorkStatus.OffWork

  return (
    <aside className="w-56 bg-surface-1 border-r border-border flex flex-col pt-14 pb-4 shrink-0">
      {/* Brand */}
      <div className="px-5 mb-6 flex items-center gap-2.5 titlebar-no-drag">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary leading-none">TimeDock</div>
          <div className="text-2xs text-text-tertiary mt-0.5">Time Tracker</div>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-4 mb-5 titlebar-no-drag">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          ${status === WorkStatus.Working ? 'bg-status-working-bg text-status-working' :
            status === WorkStatus.OnBreak ? 'bg-status-break-bg text-status-break' :
            'bg-status-off-bg text-status-off'}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${
            status === WorkStatus.Working ? 'bg-status-working animate-timer-pulse' :
            status === WorkStatus.OnBreak ? 'bg-status-break' :
            'bg-status-off'}`}
          />
          {status === WorkStatus.Working ? 'Working' :
           status === WorkStatus.OnBreak ? 'On Break' : 'Off Work'}
          {status === WorkStatus.OnBreak && <Coffee className="w-3 h-3 ml-auto" />}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 titlebar-no-drag">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-100
                ${isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text-tertiary'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 pt-3 border-t border-border titlebar-no-drag">
        <div className="text-2xs text-text-tertiary">TimeDock v1.0.0</div>
      </div>
    </aside>
  )
}
