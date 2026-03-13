import { getDatabase } from '../index'
import { generateId, nowISO, minutesBetween } from '@shared/utils'
import type { TimeEntry, EntriesFilter, TimeEntryWithRelations, BreakEntry } from '@shared/types'
import { EntryStatus, EntrySource } from '@shared/types'

export const timeEntryRepo = {
  getActive(): TimeEntry | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM time_entries WHERE status = ?').get(EntryStatus.Active) as TimeEntry | null
  },

  getById(id: string): TimeEntry | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as TimeEntry | null
  },

  getWithRelations(id: string): TimeEntryWithRelations | null {
    const db = getDatabase()
    const entry = db.prepare(`
      SELECT te.*,
        c.name as clientName, c.code as clientCode,
        p.name as projectName, p.code as projectCode,
        t.name as taskName, t.category as taskCategory
      FROM time_entries te
      LEFT JOIN clients c ON te.clientId = c.id
      LEFT JOIN projects p ON te.projectId = p.id
      LEFT JOIN tasks t ON te.taskId = t.id
      WHERE te.id = ?
    `).get(id) as (TimeEntry & { clientName?: string; projectName?: string; taskName?: string }) | null

    if (!entry) return null

    const breaks = db.prepare('SELECT * FROM break_entries WHERE timeEntryId = ? ORDER BY startedAt').all(id) as BreakEntry[]
    const breakMinutes = breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0)

    return {
      ...entry,
      billable: Boolean(entry.billable),
      client: entry.clientId ? { id: entry.clientId, name: (entry as any).clientName, code: (entry as any).clientCode, workspaceId: entry.workspaceId, active: true, createdAt: '', updatedAt: '' } : null,
      project: entry.projectId ? { id: entry.projectId, name: (entry as any).projectName, code: (entry as any).projectCode, clientId: entry.clientId || '', billableDefault: true, active: true, createdAt: '', updatedAt: '' } : null,
      task: entry.taskId ? { id: entry.taskId, name: (entry as any).taskName, projectId: entry.projectId || '', category: (entry as any).taskCategory || 'other', active: true, createdAt: '', updatedAt: '' } : null,
      breaks,
      netDurationMinutes: entry.durationMinutes ? entry.durationMinutes - breakMinutes : null
    }
  },

  getByDateRange(filter: EntriesFilter): TimeEntryWithRelations[] {
    const db = getDatabase()
    let sql = `
      SELECT te.*,
        c.name as clientName, c.code as clientCode,
        p.name as projectName, p.code as projectCode,
        t.name as taskName, t.category as taskCategory
      FROM time_entries te
      LEFT JOIN clients c ON te.clientId = c.id
      LEFT JOIN projects p ON te.projectId = p.id
      LEFT JOIN tasks t ON te.taskId = t.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filter.startDate) {
      sql += ' AND te.startedAt >= ?'
      params.push(filter.startDate)
    }
    if (filter.endDate) {
      sql += ' AND te.startedAt <= ?'
      params.push(filter.endDate)
    }
    if (filter.clientId) {
      sql += ' AND te.clientId = ?'
      params.push(filter.clientId)
    }
    if (filter.projectId) {
      sql += ' AND te.projectId = ?'
      params.push(filter.projectId)
    }
    if (filter.taskId) {
      sql += ' AND te.taskId = ?'
      params.push(filter.taskId)
    }
    if (filter.billable !== undefined) {
      sql += ' AND te.billable = ?'
      params.push(filter.billable ? 1 : 0)
    }
    if (filter.search) {
      sql += ' AND (te.note LIKE ? OR c.name LIKE ? OR p.name LIKE ? OR t.name LIKE ?)'
      const search = `%${filter.search}%`
      params.push(search, search, search, search)
    }

    sql += ' ORDER BY te.startedAt DESC'

    if (filter.limit) {
      sql += ' LIMIT ?'
      params.push(filter.limit)
    }
    if (filter.offset) {
      sql += ' OFFSET ?'
      params.push(filter.offset)
    }

    const entries = db.prepare(sql).all(...params) as any[]

    return entries.map(entry => {
      const breaks = db.prepare('SELECT * FROM break_entries WHERE timeEntryId = ? ORDER BY startedAt').all(entry.id) as BreakEntry[]
      const breakMinutes = breaks.reduce((sum: number, b: BreakEntry) => sum + (b.durationMinutes || 0), 0)

      return {
        ...entry,
        billable: Boolean(entry.billable),
        client: entry.clientId ? { id: entry.clientId, name: entry.clientName, code: entry.clientCode, workspaceId: entry.workspaceId, active: true, createdAt: '', updatedAt: '' } : null,
        project: entry.projectId ? { id: entry.projectId, name: entry.projectName, code: entry.projectCode, clientId: entry.clientId || '', billableDefault: true, active: true, createdAt: '', updatedAt: '' } : null,
        task: entry.taskId ? { id: entry.taskId, name: entry.taskName, projectId: entry.projectId || '', category: entry.taskCategory || 'other', active: true, createdAt: '', updatedAt: '' } : null,
        breaks,
        netDurationMinutes: entry.durationMinutes ? entry.durationMinutes - breakMinutes : null
      }
    })
  },

  create(data: {
    workspaceId?: string
    clientId?: string | null
    projectId?: string | null
    taskId?: string | null
    status?: EntryStatus
    startedAt: string
    endedAt?: string | null
    billable?: boolean
    note?: string | null
    source?: EntrySource
  }): TimeEntry {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    const duration = data.endedAt ? minutesBetween(data.startedAt, data.endedAt) : null

    db.prepare(`
      INSERT INTO time_entries (id, workspaceId, clientId, projectId, taskId, status, startedAt, endedAt, durationMinutes, billable, note, source, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.workspaceId || 'default',
      data.clientId || null,
      data.projectId || null,
      data.taskId || null,
      data.status || EntryStatus.Active,
      data.startedAt,
      data.endedAt || null,
      duration,
      data.billable !== false ? 1 : 0,
      data.note || null,
      data.source || EntrySource.Timer,
      now,
      now
    )

    return this.getById(id)!
  },

  update(id: string, data: Partial<{
    clientId: string | null
    projectId: string | null
    taskId: string | null
    status: EntryStatus
    startedAt: string
    endedAt: string | null
    billable: boolean
    note: string | null
  }>): TimeEntry {
    const db = getDatabase()
    const now = nowISO()
    const existing = this.getById(id)!
    
    const startedAt = data.startedAt ?? existing.startedAt
    const endedAt = data.endedAt !== undefined ? data.endedAt : existing.endedAt
    const duration = endedAt ? minutesBetween(startedAt, endedAt) : null

    const sets: string[] = ['updatedAt = ?']
    const values: any[] = [now]

    if (data.clientId !== undefined) { sets.push('clientId = ?'); values.push(data.clientId) }
    if (data.projectId !== undefined) { sets.push('projectId = ?'); values.push(data.projectId) }
    if (data.taskId !== undefined) { sets.push('taskId = ?'); values.push(data.taskId) }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }
    if (data.startedAt !== undefined) { sets.push('startedAt = ?'); values.push(data.startedAt) }
    if (data.endedAt !== undefined) { sets.push('endedAt = ?'); values.push(data.endedAt) }
    if (data.billable !== undefined) { sets.push('billable = ?'); values.push(data.billable ? 1 : 0) }
    if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note) }
    
    sets.push('durationMinutes = ?')
    values.push(duration)

    values.push(id)
    db.prepare(`UPDATE time_entries SET ${sets.join(', ')} WHERE id = ?`).run(...values)

    return this.getById(id)!
  },

  delete(id: string): void {
    const db = getDatabase()
    // Manual cascade for existing DBs
    db.prepare('DELETE FROM break_entries WHERE timeEntryId = ?').run(id)
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(id)
  }
}
