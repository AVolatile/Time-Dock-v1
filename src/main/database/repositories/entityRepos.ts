import { getDatabase } from '../index'
import { generateId, nowISO } from '@shared/utils'
import type { Client, Project, Task } from '@shared/types'

export const clientRepo = {
  getAll(workspaceId = 'default'): Client[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM clients WHERE workspaceId = ? ORDER BY name').all(workspaceId) as any[])
      .map(c => ({ ...c, active: Boolean(c.active) }))
  },

  getActive(workspaceId = 'default'): Client[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM clients WHERE workspaceId = ? AND active = 1 ORDER BY name').all(workspaceId) as any[])
      .map(c => ({ ...c, active: Boolean(c.active) }))
  },

  getById(id: string): Client | null {
    const db = getDatabase()
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any
    return c ? { ...c, active: Boolean(c.active) } : null
  },

  create(data: { name: string; code?: string; workspaceId?: string; active?: boolean }): Client {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    db.prepare('INSERT INTO clients (id, workspaceId, name, code, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, data.workspaceId || 'default', data.name, data.code || '', data.active !== false ? 1 : 0, now, now)
    return this.getById(id)!
  },

  update(id: string, data: Partial<{ name: string; code: string; active: boolean }>): Client {
    const db = getDatabase()
    const now = nowISO()
    const sets: string[] = ['updatedAt = ?']
    const vals: any[] = [now]
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.code !== undefined) { sets.push('code = ?'); vals.push(data.code) }
    if (data.active !== undefined) { sets.push('active = ?'); vals.push(data.active ? 1 : 0) }
    vals.push(id)
    db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.getById(id)!
  },

  delete(id: string): void {
    const db = getDatabase()
    // Manual cascade for existing DBs
    db.prepare('DELETE FROM break_entries WHERE timeEntryId IN (SELECT id FROM time_entries WHERE clientId = ?)').run(id)
    db.prepare('DELETE FROM tasks WHERE projectId IN (SELECT id FROM projects WHERE clientId = ?)').run(id)
    db.prepare('DELETE FROM time_entries WHERE clientId = ?').run(id)
    db.prepare('DELETE FROM projects WHERE clientId = ?').run(id)
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
  }
}

export const projectRepo = {
  getAll(): Project[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM projects ORDER BY name').all() as any[])
      .map(p => ({ ...p, active: Boolean(p.active), billableDefault: Boolean(p.billableDefault) }))
  },

  getActive(): Project[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM projects WHERE active = 1 ORDER BY name').all() as any[])
      .map(p => ({ ...p, active: Boolean(p.active), billableDefault: Boolean(p.billableDefault) }))
  },

  getByClientId(clientId: string): Project[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM projects WHERE clientId = ? ORDER BY name').all(clientId) as any[])
      .map(p => ({ ...p, active: Boolean(p.active), billableDefault: Boolean(p.billableDefault) }))
  },

  getById(id: string): Project | null {
    const db = getDatabase()
    const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
    return p ? { ...p, active: Boolean(p.active), billableDefault: Boolean(p.billableDefault) } : null
  },

  create(data: { clientId: string; name: string; code?: string; billableDefault?: boolean; active?: boolean }): Project {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    db.prepare('INSERT INTO projects (id, clientId, name, code, billableDefault, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, data.clientId, data.name, data.code || '', data.billableDefault !== false ? 1 : 0, data.active !== false ? 1 : 0, now, now)
    return this.getById(id)!
  },

  update(id: string, data: Partial<{ clientId: string; name: string; code: string; billableDefault: boolean; active: boolean }>): Project {
    const db = getDatabase()
    const now = nowISO()
    const sets: string[] = ['updatedAt = ?']
    const vals: any[] = [now]
    if (data.clientId !== undefined) { sets.push('clientId = ?'); vals.push(data.clientId) }
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.code !== undefined) { sets.push('code = ?'); vals.push(data.code) }
    if (data.billableDefault !== undefined) { sets.push('billableDefault = ?'); vals.push(data.billableDefault ? 1 : 0) }
    if (data.active !== undefined) { sets.push('active = ?'); vals.push(data.active ? 1 : 0) }
    vals.push(id)
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.getById(id)!
  },

  delete(id: string): void {
    const db = getDatabase()
    // Manual cascade for existing DBs
    db.prepare('DELETE FROM break_entries WHERE timeEntryId IN (SELECT id FROM time_entries WHERE projectId = ?)').run(id)
    db.prepare('DELETE FROM tasks WHERE projectId = ?').run(id)
    db.prepare('DELETE FROM time_entries WHERE projectId = ?').run(id)
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }
}

export const taskRepo = {
  getAll(): Task[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM tasks ORDER BY name').all() as any[])
      .map(t => ({ ...t, active: Boolean(t.active) }))
  },

  getByProjectId(projectId: string): Task[] {
    const db = getDatabase()
    return (db.prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY name').all(projectId) as any[])
      .map(t => ({ ...t, active: Boolean(t.active) }))
  },

  getActive(projectId?: string): Task[] {
    const db = getDatabase()
    if (projectId) {
      return (db.prepare('SELECT * FROM tasks WHERE projectId = ? AND active = 1 ORDER BY name').all(projectId) as any[])
        .map(t => ({ ...t, active: Boolean(t.active) }))
    }
    return (db.prepare('SELECT * FROM tasks WHERE active = 1 ORDER BY name').all() as any[])
      .map(t => ({ ...t, active: Boolean(t.active) }))
  },

  getById(id: string): Task | null {
    const db = getDatabase()
    const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    return t ? { ...t, active: Boolean(t.active) } : null
  },

  create(data: { projectId: string; name: string; category?: string; active?: boolean }): Task {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    db.prepare('INSERT INTO tasks (id, projectId, name, category, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, data.projectId, data.name, data.category || 'other', data.active !== false ? 1 : 0, now, now)
    return this.getById(id)!
  },

  update(id: string, data: Partial<{ projectId: string; name: string; category: string; active: boolean }>): Task {
    const db = getDatabase()
    const now = nowISO()
    const sets: string[] = ['updatedAt = ?']
    const vals: any[] = [now]
    if (data.projectId !== undefined) { sets.push('projectId = ?'); vals.push(data.projectId) }
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
    if (data.category !== undefined) { sets.push('category = ?'); vals.push(data.category) }
    if (data.active !== undefined) { sets.push('active = ?'); vals.push(data.active ? 1 : 0) }
    vals.push(id)
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.getById(id)!
  },

  delete(id: string): void {
    const db = getDatabase()
    // Manual set null for existing DBs if cascade not active
    db.prepare('UPDATE time_entries SET taskId = NULL WHERE taskId = ?').run(id)
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }
}
