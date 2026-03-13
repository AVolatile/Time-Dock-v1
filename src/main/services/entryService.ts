import { timeEntryRepo } from '../database/repositories/timeEntryRepo'
import { breakEntryRepo } from '../database/repositories/breakEntryRepo'
import { nowISO } from '@shared/utils'
import {
  EntryStatus,
  EntrySource,
  type CreateEntryPayload,
  type UpdateEntryPayload,
  type EntriesFilter,
  type TimeEntryWithRelations,
  type DaySummary,
  type WeekSummary
} from '@shared/types'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from '@shared/utils'

export const entryService = {
  getEntries(filter: EntriesFilter): TimeEntryWithRelations[] {
    return timeEntryRepo.getByDateRange(filter)
  },

  getEntry(id: string): TimeEntryWithRelations | null {
    return timeEntryRepo.getWithRelations(id)
  },

  createManualEntry(payload: CreateEntryPayload): TimeEntryWithRelations {
    const entry = timeEntryRepo.create({
      workspaceId: payload.workspaceId || 'default',
      clientId: payload.clientId || null,
      projectId: payload.projectId || null,
      taskId: payload.taskId || null,
      status: EntryStatus.Completed,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      billable: payload.billable,
      note: payload.note || null,
      source: EntrySource.Manual
    })

    // Create breaks if provided
    if (payload.breaks) {
      for (const breakData of payload.breaks) {
        const be = breakEntryRepo.create({ timeEntryId: entry.id, startedAt: breakData.startedAt })
        breakEntryRepo.end(be.id, breakData.endedAt)
      }
    }

    return timeEntryRepo.getWithRelations(entry.id)!
  },

  updateEntry(payload: UpdateEntryPayload): TimeEntryWithRelations {
    const data: any = {}
    if (payload.clientId !== undefined) data.clientId = payload.clientId
    if (payload.projectId !== undefined) data.projectId = payload.projectId
    if (payload.taskId !== undefined) data.taskId = payload.taskId
    if (payload.startedAt !== undefined) data.startedAt = payload.startedAt
    if (payload.endedAt !== undefined) data.endedAt = payload.endedAt
    if (payload.billable !== undefined) data.billable = payload.billable
    if (payload.note !== undefined) data.note = payload.note

    timeEntryRepo.update(payload.id, data)
    return timeEntryRepo.getWithRelations(payload.id)!
  },

  deleteEntry(id: string): void {
    timeEntryRepo.delete(id)
  },

  getDaySummary(date?: Date): DaySummary {
    const d = date || new Date()
    const start = startOfDay(d)
    const end = endOfDay(d)

    const entries = timeEntryRepo.getByDateRange({ startDate: start, endDate: end })

    let totalMinutes = 0
    let breakMinutes = 0
    let billableMinutes = 0
    let nonBillableMinutes = 0

    for (const entry of entries) {
      const dur = entry.durationMinutes || 0
      const brk = entry.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0)
      const net = dur - brk

      totalMinutes += dur
      breakMinutes += brk

      if (entry.billable) {
        billableMinutes += net
      } else {
        nonBillableMinutes += net
      }
    }

    return {
      date: start,
      totalMinutes,
      netMinutes: totalMinutes - breakMinutes,
      breakMinutes,
      billableMinutes,
      nonBillableMinutes,
      entryCount: entries.length
    }
  },

  getWeekSummary(date?: Date): WeekSummary {
    const d = date || new Date()
    const weekStart = startOfWeek(d)
    const weekEnd = endOfWeek(d)
    
    const days: DaySummary[] = []
    const current = new Date(weekStart)
    
    for (let i = 0; i < 7; i++) {
      days.push(this.getDaySummary(new Date(current)))
      current.setDate(current.getDate() + 1)
    }

    return {
      weekStart,
      weekEnd,
      totalMinutes: days.reduce((s, d) => s + d.totalMinutes, 0),
      netMinutes: days.reduce((s, d) => s + d.netMinutes, 0),
      breakMinutes: days.reduce((s, d) => s + d.breakMinutes, 0),
      billableMinutes: days.reduce((s, d) => s + d.billableMinutes, 0),
      nonBillableMinutes: days.reduce((s, d) => s + d.nonBillableMinutes, 0),
      entryCount: days.reduce((s, d) => s + d.entryCount, 0),
      days
    }
  }
}
