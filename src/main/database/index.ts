import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'timedock.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspaceId) REFERENCES workspaces(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      billableDefault INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL,
      clientId TEXT,
      projectId TEXT,
      taskId TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      durationMinutes REAL,
      billable INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      source TEXT NOT NULL DEFAULT 'timer',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS break_entries (
      id TEXT PRIMARY KEY,
      timeEntryId TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      durationMinutes REAL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (timeEntryId) REFERENCES time_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS export_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      dateRangeStart TEXT NOT NULL,
      dateRangeEnd TEXT NOT NULL,
      filtersJson TEXT,
      filePath TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      valueJson TEXT NOT NULL DEFAULT '{}',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
    CREATE INDEX IF NOT EXISTS idx_time_entries_startedAt ON time_entries(startedAt);
    CREATE INDEX IF NOT EXISTS idx_time_entries_projectId ON time_entries(projectId);
    CREATE INDEX IF NOT EXISTS idx_time_entries_clientId ON time_entries(clientId);
    CREATE INDEX IF NOT EXISTS idx_break_entries_timeEntryId ON break_entries(timeEntryId);

    -- Default workspace
    INSERT OR IGNORE INTO workspaces (id, name) VALUES ('default', 'Default Workspace');
  `)
}
