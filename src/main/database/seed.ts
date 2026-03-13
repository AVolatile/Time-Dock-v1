import { getDatabase } from './index'
import { generateId, nowISO } from '@shared/utils'

export function seedDatabase(): void {
  const db = getDatabase()

  // Check if we already have data
  const clientCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as any).count
  if (clientCount > 0) return

  const now = new Date()
  const ts = nowISO()

  // --- Clients ---
  const clients = [
    { id: generateId(), name: 'FirmGuide', code: 'FG' },
    { id: generateId(), name: 'Acme Corp', code: 'ACME' },
    { id: generateId(), name: 'Internal', code: 'INT' }
  ]

  for (const c of clients) {
    db.prepare('INSERT INTO clients (id, workspaceId, name, code, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .run(c.id, 'default', c.name, c.code, ts, ts)
  }

  // --- Projects ---
  const projects = [
    { id: generateId(), clientId: clients[0].id, name: 'Platform Development', code: 'FG-PLAT', billable: 1 },
    { id: generateId(), clientId: clients[0].id, name: 'Admin Dashboard', code: 'FG-ADMIN', billable: 1 },
    { id: generateId(), clientId: clients[1].id, name: 'Website Redesign', code: 'ACME-WEB', billable: 1 },
    { id: generateId(), clientId: clients[1].id, name: 'API Integration', code: 'ACME-API', billable: 1 },
    { id: generateId(), clientId: clients[2].id, name: 'Internal Tools', code: 'INT-TOOLS', billable: 0 },
    { id: generateId(), clientId: clients[2].id, name: 'TimeDock Development', code: 'INT-TD', billable: 0 }
  ]

  for (const p of projects) {
    db.prepare('INSERT INTO projects (id, clientId, name, code, billableDefault, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .run(p.id, p.clientId, p.name, p.code, p.billable, ts, ts)
  }

  // --- Tasks ---
  const tasks = [
    { id: generateId(), projectId: projects[0].id, name: 'Feature Development', category: 'dev' },
    { id: generateId(), projectId: projects[0].id, name: 'Bug Fixes', category: 'dev' },
    { id: generateId(), projectId: projects[0].id, name: 'Code Review', category: 'dev' },
    { id: generateId(), projectId: projects[1].id, name: 'UI Design', category: 'design' },
    { id: generateId(), projectId: projects[1].id, name: 'Implementation', category: 'dev' },
    { id: generateId(), projectId: projects[2].id, name: 'Design', category: 'design' },
    { id: generateId(), projectId: projects[2].id, name: 'Frontend Dev', category: 'dev' },
    { id: generateId(), projectId: projects[3].id, name: 'API Development', category: 'dev' },
    { id: generateId(), projectId: projects[3].id, name: 'Testing', category: 'dev' },
    { id: generateId(), projectId: projects[4].id, name: 'Planning', category: 'planning' },
    { id: generateId(), projectId: projects[4].id, name: 'Admin Tasks', category: 'admin' },
    { id: generateId(), projectId: projects[5].id, name: 'Development', category: 'dev' }
  ]

  for (const t of tasks) {
    db.prepare('INSERT INTO tasks (id, projectId, name, category, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .run(t.id, t.projectId, t.name, t.category, ts, ts)
  }

  // --- Sample Time Entries (past week) ---
  const entries: { id: string; startHour: number; endHour: number; dayOffset: number; project: number; task: number; billable: boolean; note: string }[] = [
    // Monday
    { id: generateId(), startHour: 9, endHour: 12, dayOffset: -4, project: 0, task: 0, billable: true, note: 'Working on authentication flow' },
    { id: generateId(), startHour: 13, endHour: 17, dayOffset: -4, project: 0, task: 1, billable: true, note: 'Fixed login redirect bug' },
    // Tuesday
    { id: generateId(), startHour: 9, endHour: 11.5, dayOffset: -3, project: 2, task: 5, billable: true, note: 'Homepage wireframes' },
    { id: generateId(), startHour: 12, endHour: 15, dayOffset: -3, project: 2, task: 6, billable: true, note: 'Implemented hero section' },
    { id: generateId(), startHour: 15.5, endHour: 17.5, dayOffset: -3, project: 4, task: 10, billable: false, note: 'Sprint planning' },
    // Wednesday
    { id: generateId(), startHour: 8.5, endHour: 12, dayOffset: -2, project: 1, task: 3, billable: true, note: 'Admin dashboard mockups' },
    { id: generateId(), startHour: 13, endHour: 17, dayOffset: -2, project: 1, task: 4, billable: true, note: 'Settings page implementation' },
    // Thursday
    { id: generateId(), startHour: 9, endHour: 12.5, dayOffset: -1, project: 3, task: 7, billable: true, note: 'REST API endpoints' },
    { id: generateId(), startHour: 13.5, endHour: 16, dayOffset: -1, project: 3, task: 8, billable: true, note: 'Integration tests' },
    { id: generateId(), startHour: 16, endHour: 17.5, dayOffset: -1, project: 5, task: 11, billable: false, note: 'TimeDock tray widget' },
    // Today
    { id: generateId(), startHour: 9, endHour: 11, dayOffset: 0, project: 0, task: 2, billable: true, note: 'PR reviews for team' }
  ]

  for (const e of entries) {
    const start = new Date(now)
    start.setDate(start.getDate() + e.dayOffset)
    start.setHours(Math.floor(e.startHour), (e.startHour % 1) * 60, 0, 0)

    const end = new Date(now)
    end.setDate(end.getDate() + e.dayOffset)
    end.setHours(Math.floor(e.endHour), (e.endHour % 1) * 60, 0, 0)

    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60

    db.prepare(`
      INSERT INTO time_entries (id, workspaceId, clientId, projectId, taskId, status, startedAt, endedAt, durationMinutes, billable, note, source, createdAt, updatedAt)
      VALUES (?, 'default', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, 'timer', ?, ?)
    `).run(
      e.id,
      clients[e.project < 2 ? 0 : e.project < 4 ? 1 : 2].id,
      projects[e.project].id,
      tasks[e.task].id,
      start.toISOString(),
      end.toISOString(),
      durationMinutes,
      e.billable ? 1 : 0,
      e.note,
      ts, ts
    )

    // Add a break entry for longer sessions
    if (durationMinutes > 120) {
      const breakStart = new Date(start)
      breakStart.setMinutes(breakStart.getMinutes() + 90)
      const breakEnd = new Date(breakStart)
      breakEnd.setMinutes(breakEnd.getMinutes() + 15)

      db.prepare(`
        INSERT INTO break_entries (id, timeEntryId, startedAt, endedAt, durationMinutes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 15, ?, ?)
      `).run(generateId(), e.id, breakStart.toISOString(), breakEnd.toISOString(), ts, ts)
    }
  }
}
