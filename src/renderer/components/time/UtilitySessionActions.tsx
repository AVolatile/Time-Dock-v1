import { LogIn, LogOut, Pause, Play } from 'lucide-react'
import { WorkStatus } from '@shared/types'

export function UtilitySessionActions({
  status,
  isLoading,
  compact = false,
  fullWidth = false,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak
}: {
  status: WorkStatus
  isLoading: boolean
  compact?: boolean
  fullWidth?: boolean
  onClockIn: () => void
  onClockOut: () => void
  onStartBreak: () => void
  onEndBreak: () => void
}) {
  if (status === WorkStatus.OffWork) {
    return (
      <button
        type="button"
        onClick={onClockIn}
        disabled={isLoading}
        className={`${fullWidth ? 'w-full' : ''} ${compact ? 'topbar-btn topbar-btn-success' : 'utility-button utility-button-success'}`}
        aria-label="Clock in"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Clock In</span>
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
      {status === WorkStatus.Working ? (
        <button
          type="button"
          onClick={onStartBreak}
          disabled={isLoading}
          className={`${fullWidth ? 'flex-1' : ''} ${compact ? 'topbar-icon-btn topbar-icon-btn-warning' : 'utility-button utility-button-warning'}`}
          aria-label="Start break"
        >
          <Pause className="h-3.5 w-3.5" />
          {!compact && <span>Break</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEndBreak}
          disabled={isLoading}
          className={`${fullWidth ? 'flex-1' : ''} ${compact ? 'topbar-icon-btn topbar-icon-btn-success' : 'utility-button utility-button-success'}`}
          aria-label="Resume"
        >
          <Play className="h-3.5 w-3.5" />
          {!compact && <span>Resume</span>}
        </button>
      )}
      <button
        type="button"
        onClick={onClockOut}
        disabled={isLoading}
        className={`${fullWidth ? 'flex-1' : ''} ${compact ? 'topbar-icon-btn topbar-icon-btn-danger' : 'utility-button utility-button-danger'}`}
        aria-label="Clock out"
      >
        <LogOut className="h-3.5 w-3.5" />
        {!compact && <span>Clock Out</span>}
      </button>
    </div>
  )
}
