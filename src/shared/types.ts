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

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'discovery',
  'proposal_sent',
  'negotiation',
  'won',
  'lost'
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]

export const LEAD_SOURCES = [
  'cold_call',
  'referral',
  'inbound',
  'networking',
  'repeat_client',
  'other'
] as const

export type LeadSource = typeof LEAD_SOURCES[number]

export interface Lead {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  website: string | null
  source: LeadSource
  status: LeadStatus
  estimatedValueCents: number
  serviceType: string | null
  lastContactAt: string | null
  nextFollowUpAt: string | null
  nextAction: string | null
  notes: string | null
  isArchived: boolean
  displayOrder: number
  convertedClientId: string | null
  convertedAt: string | null
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

export type KanbanContentBlockType = 'text' | 'image' | 'code' | 'link' | 'video_link'

export interface KanbanBoard {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface KanbanSection {
  id: string
  boardId: string
  title: string
  color: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface KanbanContentBlockBase {
  id: string
  type: KanbanContentBlockType
  position: number
}

export interface KanbanTextBlock extends KanbanContentBlockBase {
  type: 'text'
  content: string
}

export interface KanbanImageBlock extends KanbanContentBlockBase {
  type: 'image'
  src: string
  alt: string
  caption: string
}

export interface KanbanCodeBlock extends KanbanContentBlockBase {
  type: 'code'
  language: string
  content: string
}

export interface KanbanLinkBlock extends KanbanContentBlockBase {
  type: 'link'
  url: string
  title: string
  description: string
}

export interface KanbanVideoLinkBlock extends KanbanContentBlockBase {
  type: 'video_link'
  url: string
  title: string
  platform: string
}

export type KanbanContentBlock =
  | KanbanTextBlock
  | KanbanImageBlock
  | KanbanCodeBlock
  | KanbanLinkBlock
  | KanbanVideoLinkBlock

export interface KanbanCard {
  id: string
  boardId: string
  sectionId: string
  title: string
  description: string
  accentColor: string
  labels: string[]
  contentBlocks: KanbanContentBlock[]
  position: number
  createdAt: string
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

export interface KanbanSectionWithCards extends KanbanSection {
  cards: KanbanCard[]
}

export interface KanbanBoardWithSections extends KanbanBoard {
  sections: KanbanSectionWithCards[]
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

  // Leads
  GET_LEADS: 'leads:get',
  CREATE_LEAD: 'leads:create',
  UPDATE_LEAD: 'leads:update',
  ARCHIVE_LEAD: 'leads:archive',
  CONVERT_LEAD_TO_CLIENT: 'leads:convert-to-client',

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

  // KanBan notes
  KANBAN_GET_BOARD: 'kanban:get-board',
  KANBAN_CREATE_SECTION: 'kanban:create-section',
  KANBAN_UPDATE_SECTION: 'kanban:update-section',
  KANBAN_DELETE_SECTION: 'kanban:delete-section',
  KANBAN_REORDER_SECTIONS: 'kanban:reorder-sections',
  KANBAN_CREATE_CARD: 'kanban:create-card',
  KANBAN_UPDATE_CARD: 'kanban:update-card',
  KANBAN_DELETE_CARD: 'kanban:delete-card',
  KANBAN_MOVE_CARD: 'kanban:move-card',
  KANBAN_REORDER_CARDS: 'kanban:reorder-cards',

  // Settings
  GET_SETTING: 'settings:get',
  SET_SETTING: 'settings:set',

  // Windows
  OPEN_DASHBOARD: 'window:open-dashboard',
  CLOSE_TRAY_POPUP: 'window:close-tray-popup',
  SET_TOPBAR_MENU_OPEN: 'window:set-topbar-menu-open',
  SET_TOPBAR_MINIMIZED: 'window:set-topbar-minimized',
  SET_TOPBAR_EXPANDED: 'window:set-topbar-expanded',

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

export interface LeadsFilter {
  status?: LeadStatus
  search?: string
  includeArchived?: boolean
}

export interface LeadPayload {
  companyName: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  source: LeadSource
  status: LeadStatus
  estimatedValueCents?: number
  serviceType?: string | null
  lastContactAt?: string | null
  nextFollowUpAt?: string | null
  nextAction?: string | null
  notes?: string | null
  isArchived?: boolean
  displayOrder?: number
}

export interface UpdateLeadPayload extends Partial<LeadPayload> {
  id: string
}

export interface ConvertLeadToClientResult {
  lead: Lead
  client: Client
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

export interface KanbanSectionPayload {
  boardId?: string
  title: string
  color?: string
}

export interface UpdateKanbanSectionPayload {
  id: string
  title?: string
  color?: string
}

export interface ReorderKanbanSectionsPayload {
  boardId?: string
  orderedSectionIds: string[]
}

export interface KanbanCardPayload {
  boardId?: string
  sectionId: string
  title: string
  description?: string
  accentColor?: string
  labels?: string[]
  contentBlocks?: KanbanContentBlock[]
}

export interface UpdateKanbanCardPayload {
  id: string
  sectionId?: string
  title?: string
  description?: string
  accentColor?: string
  labels?: string[]
  contentBlocks?: KanbanContentBlock[]
}

export interface MoveKanbanCardPayload {
  cardId: string
  targetSectionId: string
  targetPosition: number
}

export interface ReorderKanbanCardsPayload {
  sectionId: string
  orderedCardIds: string[]
}
