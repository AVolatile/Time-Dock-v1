// ============================================================
// TimeDock — Shared Type Definitions
// ============================================================

// --- Enums ---

export enum WorkStatus {
  Working = 'working',
  OnBreak = 'on_break',
  OffWork = 'off_work'
}

export enum EntryStatus {
  Active = 'active',
  Completed = 'completed',
  Manual = 'manual'
}

export enum EntryCategory {
  Dev = 'dev',
  Design = 'design',
  Meeting = 'meeting',
  Planning = 'planning',
  Admin = 'admin',
  Other = 'other'
}

export enum ExportType {
  PDF = 'pdf',
  CSV = 'csv'
}

export enum EntrySource {
  Timer = 'timer',
  Manual = 'manual',
  Correction = 'correction'
}

// --- Data Models ---

export interface Workspace {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  workspaceId: string
  name: string
  code: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  clientId: string
  name: string
  code: string
  billableDefault: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  name: string
  category: EntryCategory
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  workspaceId: string
  clientId: string | null
  projectId: string | null
  taskId: string | null
  status: EntryStatus
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  billable: boolean
  note: string | null
  source: EntrySource
  createdAt: string
  updatedAt: string
}

export interface BreakEntry {
  id: string
  timeEntryId: string
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  createdAt: string
  updatedAt: string
}

export interface ExportRecord {
  id: string
  type: ExportType
  dateRangeStart: string
  dateRangeEnd: string
  filtersJson: string | null
  filePath: string
  createdAt: string
}

export interface AppSetting {
  id: string
  key: string
  valueJson: string
  updatedAt: string
}

// --- View Models / Aggregates ---

export interface TimeEntryWithRelations extends TimeEntry {
  client?: Client | null
  project?: Project | null
  task?: Task | null
  breaks: BreakEntry[]
  netDurationMinutes: number | null
}

export interface ActiveSession {
  entry: TimeEntryWithRelations
  activeBreak: BreakEntry | null
  status: WorkStatus
  elapsedSeconds: number
  breakElapsedSeconds: number
}

export interface DaySummary {
  date: string
  totalMinutes: number
  netMinutes: number
  breakMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  entryCount: number
}

export interface WeekSummary {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  netMinutes: number
  breakMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  entryCount: number
  days: DaySummary[]
}

// --- IPC Channel Definitions ---

export const IPC_CHANNELS = {
  // Time tracking
  CLOCK_IN: 'time:clock-in',
  CLOCK_OUT: 'time:clock-out',
  START_BREAK: 'time:start-break',
  END_BREAK: 'time:end-break',
  GET_ACTIVE_SESSION: 'time:get-active-session',
  SWITCH_PROJECT: 'time:switch-project',

  // Time entries
  GET_ENTRIES: 'entries:get',
  GET_ENTRY: 'entries:get-one',
  CREATE_ENTRY: 'entries:create',
  UPDATE_ENTRY: 'entries:update',
  DELETE_ENTRY: 'entries:delete',
  GET_DAY_SUMMARY: 'entries:day-summary',
  GET_WEEK_SUMMARY: 'entries:week-summary',

  // Clients
  GET_CLIENTS: 'clients:get',
  CREATE_CLIENT: 'clients:create',
  UPDATE_CLIENT: 'clients:update',
  DELETE_CLIENT: 'clients:delete',

  // Projects
  GET_PROJECTS: 'projects:get',
  CREATE_PROJECT: 'projects:create',
  UPDATE_PROJECT: 'projects:update',
  DELETE_PROJECT: 'projects:delete',

  // Tasks
  GET_TASKS: 'tasks:get',
  CREATE_TASK: 'tasks:create',
  UPDATE_TASK: 'tasks:update',
  DELETE_TASK: 'tasks:delete',

  // Exports
  EXPORT_PDF: 'export:pdf',
  EXPORT_CSV: 'export:csv',
  GET_EXPORT_HISTORY: 'export:history',

  // Settings
  GET_SETTING: 'settings:get',
  SET_SETTING: 'settings:set',

  // Windows
  OPEN_DASHBOARD: 'window:open-dashboard',
  CLOSE_TRAY_POPUP: 'window:close-tray-popup',

  // App
  GET_APP_INFO: 'app:info'
} as const

// --- IPC Payload Types ---

export interface ClockInPayload {
  projectId?: string
  taskId?: string
  clientId?: string
  note?: string
  billable?: boolean
}

export interface CreateEntryPayload {
  workspaceId?: string
  clientId?: string
  projectId?: string
  taskId?: string
  startedAt: string
  endedAt: string
  billable: boolean
  note?: string
  breaks?: { startedAt: string; endedAt: string }[]
}

export interface UpdateEntryPayload {
  id: string
  clientId?: string | null
  projectId?: string | null
  taskId?: string | null
  startedAt?: string
  endedAt?: string | null
  billable?: boolean
  note?: string | null
}

export interface EntriesFilter {
  startDate?: string
  endDate?: string
  clientId?: string
  projectId?: string
  taskId?: string
  billable?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface ExportPayload {
  startDate: string
  endDate: string
  clientId?: string
  projectId?: string
  includeNotes?: boolean
}

export interface ClientPayload {
  name: string
  code?: string
  active?: boolean
}

export interface ProjectPayload {
  clientId: string
  name: string
  code?: string
  billableDefault?: boolean
  active?: boolean
}

export interface TaskPayload {
  projectId: string
  name: string
  category?: EntryCategory
  active?: boolean
}
