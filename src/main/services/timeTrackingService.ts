import { timeEntryRepo } from '../database/repositories/timeEntryRepo'
import { breakEntryRepo } from '../database/repositories/breakEntryRepo'
import { nowISO, secondsSince } from '@shared/utils'
import {
  EntryStatus,
  EntrySource,
  WorkStatus,
  type ActiveSession,
  type ClockInPayload,
  type TimeEntryWithRelations
} from '@shared/types'

export const timeTrackingService = {
  getActiveSession(): ActiveSession | null {
    const entry = timeEntryRepo.getActive()
    if (!entry) return null

    const entryWithRelations = timeEntryRepo.getWithRelations(entry.id)
    if (!entryWithRelations) return null

    const activeBreak = breakEntryRepo.getActiveForEntry(entry.id)
    const totalElapsed = secondsSince(entry.startedAt)
    
    // Calculate total break seconds for completed breaks
    const completedBreaks = entryWithRelations.breaks.filter(b => b.endedAt)
    const completedBreakSeconds = completedBreaks.reduce((sum, b) => {
      return sum + (b.durationMinutes ? b.durationMinutes * 60 : 0)
    }, 0)

    // If there's an active break, add its current elapsed time
    const activeBreakSeconds = activeBreak ? secondsSince(activeBreak.startedAt) : 0
    const totalBreakSeconds = Math.round(completedBreakSeconds + activeBreakSeconds)

    const status = activeBreak ? WorkStatus.OnBreak : WorkStatus.Working
    const elapsedSeconds = totalElapsed - totalBreakSeconds

    return {
      entry: entryWithRelations,
      activeBreak,
      status,
      elapsedSeconds: Math.max(0, elapsedSeconds),
      breakElapsedSeconds: activeBreakSeconds
    }
  },

  clockIn(payload: ClockInPayload = {}): ActiveSession {
    // Enforce single active session
    const existing = timeEntryRepo.getActive()
    if (existing) {
      throw new Error('Cannot clock in — an active session already exists. Clock out first.')
    }

    const entry = timeEntryRepo.create({
      workspaceId: 'default',
      clientId: payload.clientId || null,
      projectId: payload.projectId || null,
      taskId: payload.taskId || null,
      status: EntryStatus.Active,
      startedAt: nowISO(),
      billable: payload.billable !== false,
      note: payload.note || null,
      source: EntrySource.Timer
    })

    return this.getActiveSession()!
  },

  clockOut(): TimeEntryWithRelations {
    const active = timeEntryRepo.getActive()
    if (!active) {
      throw new Error('Cannot clock out — no active session found.')
    }

    // End any active break first
    const activeBreak = breakEntryRepo.getActiveForEntry(active.id)
    if (activeBreak) {
      breakEntryRepo.end(activeBreak.id, nowISO())
    }

    // Finalize the time entry
    const endedAt = nowISO()
    const updated = timeEntryRepo.update(active.id, {
      status: EntryStatus.Completed,
      endedAt
    })

    return timeEntryRepo.getWithRelations(updated.id)!
  },

  startBreak(): ActiveSession {
    const active = timeEntryRepo.getActive()
    if (!active) {
      throw new Error('Cannot start break — no active session. Clock in first.')
    }

    const existingBreak = breakEntryRepo.getActiveForEntry(active.id)
    if (existingBreak) {
      throw new Error('Cannot start break — a break is already active.')
    }

    breakEntryRepo.create({
      timeEntryId: active.id,
      startedAt: nowISO()
    })

    return this.getActiveSession()!
  },

  endBreak(): ActiveSession {
    const active = timeEntryRepo.getActive()
    if (!active) {
      throw new Error('Cannot end break — no active session.')
    }

    const activeBreak = breakEntryRepo.getActiveForEntry(active.id)
    if (!activeBreak) {
      throw new Error('Cannot end break — no active break found.')
    }

    breakEntryRepo.end(activeBreak.id, nowISO())

    return this.getActiveSession()!
  },

  switchProject(projectId: string, taskId?: string, clientId?: string): ActiveSession {
    const active = timeEntryRepo.getActive()
    if (!active) {
      throw new Error('Cannot switch project — no active session. Clock in first.')
    }

    // End current session
    const endedAt = nowISO()
    const activeBreak = breakEntryRepo.getActiveForEntry(active.id)
    if (activeBreak) {
      breakEntryRepo.end(activeBreak.id, endedAt)
    }
    timeEntryRepo.update(active.id, {
      status: EntryStatus.Completed,
      endedAt
    })

    // Start new session with new project
    timeEntryRepo.create({
      workspaceId: 'default',
      clientId: clientId || active.clientId,
      projectId,
      taskId: taskId || null,
      status: EntryStatus.Active,
      startedAt: endedAt,
      billable: active.billable,
      note: null,
      source: EntrySource.Timer
    })

    return this.getActiveSession()!
  },

  restoreSession(): ActiveSession | null {
    return this.getActiveSession()
  }
}
