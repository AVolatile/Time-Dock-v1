import { getDatabase } from '../index'
import { generateId, nowISO, minutesBetween } from '@shared/utils'
import type { BreakEntry } from '@shared/types'

export const breakEntryRepo = {
  getById(id: string): BreakEntry | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM break_entries WHERE id = ?').get(id) as BreakEntry | null
  },

  getByTimeEntryId(timeEntryId: string): BreakEntry[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM break_entries WHERE timeEntryId = ? ORDER BY startedAt').all(timeEntryId) as BreakEntry[]
  },

  getActiveForEntry(timeEntryId: string): BreakEntry | null {
    const db = getDatabase()
    return db.prepare('SELECT * FROM break_entries WHERE timeEntryId = ? AND endedAt IS NULL').get(timeEntryId) as BreakEntry | null
  },

  create(data: { timeEntryId: string; startedAt: string }): BreakEntry {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()

    db.prepare(`
      INSERT INTO break_entries (id, timeEntryId, startedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.timeEntryId, data.startedAt, now, now)

    return this.getById(id)!
  },

  end(id: string, endedAt: string): BreakEntry {
    const db = getDatabase()
    const existing = this.getById(id)!
    const duration = minutesBetween(existing.startedAt, endedAt)
    const now = nowISO()

    db.prepare('UPDATE break_entries SET endedAt = ?, durationMinutes = ?, updatedAt = ? WHERE id = ?')
      .run(endedAt, duration, now, id)

    return this.getById(id)!
  },

  getTotalBreakMinutes(timeEntryId: string): number {
    const db = getDatabase()
    const result = db.prepare('SELECT COALESCE(SUM(durationMinutes), 0) as total FROM break_entries WHERE timeEntryId = ? AND endedAt IS NOT NULL')
      .get(timeEntryId) as { total: number }
    return result.total
  },

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM break_entries WHERE id = ?').run(id)
  }
}
