import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import type {
  ClockInPayload,
  CreateEntryPayload,
  UpdateEntryPayload,
  EntriesFilter,
  ExportPayload,
  ClientPayload,
  LeadsFilter,
  LeadPayload,
  UpdateLeadPayload,
  ProjectPayload,
  TaskPayload,
  KanbanSectionPayload,
  UpdateKanbanSectionPayload,
  ReorderKanbanSectionsPayload,
  KanbanCardPayload,
  UpdateKanbanCardPayload,
  MoveKanbanCardPayload,
  ReorderKanbanCardsPayload
} from '@shared/types'

type IpcResult<T = any> = { success: true; data: T } | { success: false; error: string }

async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  const result: IpcResult<T> = await ipcRenderer.invoke(channel, ...args)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

const api = {
  // Time tracking
  clockIn: (payload?: ClockInPayload) => invoke(IPC_CHANNELS.CLOCK_IN, payload || {}),
  clockOut: () => invoke(IPC_CHANNELS.CLOCK_OUT),
  startBreak: () => invoke(IPC_CHANNELS.START_BREAK),
  endBreak: () => invoke(IPC_CHANNELS.END_BREAK),
  getActiveSession: () => invoke(IPC_CHANNELS.GET_ACTIVE_SESSION),
  switchProject: (payload: { projectId: string; taskId?: string; clientId?: string }) =>
    invoke(IPC_CHANNELS.SWITCH_PROJECT, payload),

  // Time entries
  getEntries: (filter?: EntriesFilter) => invoke(IPC_CHANNELS.GET_ENTRIES, filter || {}),
  getEntry: (id: string) => invoke(IPC_CHANNELS.GET_ENTRY, id),
  createEntry: (payload: CreateEntryPayload) => invoke(IPC_CHANNELS.CREATE_ENTRY, payload),
  updateEntry: (payload: UpdateEntryPayload) => invoke(IPC_CHANNELS.UPDATE_ENTRY, payload),
  deleteEntry: (id: string) => invoke(IPC_CHANNELS.DELETE_ENTRY, id),
  getDaySummary: (date?: string) => invoke(IPC_CHANNELS.GET_DAY_SUMMARY, date),
  getWeekSummary: (date?: string) => invoke(IPC_CHANNELS.GET_WEEK_SUMMARY, date),

  // Clients
  getClients: () => invoke(IPC_CHANNELS.GET_CLIENTS),
  createClient: (payload: ClientPayload) => invoke(IPC_CHANNELS.CREATE_CLIENT, payload),
  updateClient: (payload: { id: string } & Partial<ClientPayload>) => invoke(IPC_CHANNELS.UPDATE_CLIENT, payload),
  deleteClient: (id: string) => invoke(IPC_CHANNELS.DELETE_CLIENT, id),

  // Leads
  getLeads: (filter?: LeadsFilter) => invoke(IPC_CHANNELS.GET_LEADS, filter || {}),
  createLead: (payload: LeadPayload) => invoke(IPC_CHANNELS.CREATE_LEAD, payload),
  updateLead: (payload: UpdateLeadPayload) => invoke(IPC_CHANNELS.UPDATE_LEAD, payload),
  archiveLead: (id: string, archived = true) => invoke(IPC_CHANNELS.ARCHIVE_LEAD, id, archived),
  convertLeadToClient: (id: string) => invoke(IPC_CHANNELS.CONVERT_LEAD_TO_CLIENT, id),

  // Projects
  getProjects: (clientId?: string) => invoke(IPC_CHANNELS.GET_PROJECTS, clientId),
  createProject: (payload: ProjectPayload) => invoke(IPC_CHANNELS.CREATE_PROJECT, payload),
  updateProject: (payload: { id: string } & Partial<ProjectPayload>) => invoke(IPC_CHANNELS.UPDATE_PROJECT, payload),
  deleteProject: (id: string) => invoke(IPC_CHANNELS.DELETE_PROJECT, id),

  // Tasks
  getTasks: (projectId?: string) => invoke(IPC_CHANNELS.GET_TASKS, projectId),
  createTask: (payload: TaskPayload) => invoke(IPC_CHANNELS.CREATE_TASK, payload),
  updateTask: (payload: { id: string } & Partial<TaskPayload>) => invoke(IPC_CHANNELS.UPDATE_TASK, payload),
  deleteTask: (id: string) => invoke(IPC_CHANNELS.DELETE_TASK, id),

  // Exports
  exportPDF: (payload: ExportPayload) => invoke(IPC_CHANNELS.EXPORT_PDF, payload),
  exportCSV: (payload: ExportPayload) => invoke(IPC_CHANNELS.EXPORT_CSV, payload),
  getExportHistory: () => invoke(IPC_CHANNELS.GET_EXPORT_HISTORY),

  // KanBan notes
  getKanbanBoard: (boardId?: string) => invoke(IPC_CHANNELS.KANBAN_GET_BOARD, boardId),
  createKanbanSection: (payload: KanbanSectionPayload) => invoke(IPC_CHANNELS.KANBAN_CREATE_SECTION, payload),
  updateKanbanSection: (payload: UpdateKanbanSectionPayload) => invoke(IPC_CHANNELS.KANBAN_UPDATE_SECTION, payload),
  deleteKanbanSection: (id: string) => invoke(IPC_CHANNELS.KANBAN_DELETE_SECTION, id),
  reorderKanbanSections: (payload: ReorderKanbanSectionsPayload) => invoke(IPC_CHANNELS.KANBAN_REORDER_SECTIONS, payload),
  createKanbanCard: (payload: KanbanCardPayload) => invoke(IPC_CHANNELS.KANBAN_CREATE_CARD, payload),
  updateKanbanCard: (payload: UpdateKanbanCardPayload) => invoke(IPC_CHANNELS.KANBAN_UPDATE_CARD, payload),
  deleteKanbanCard: (id: string) => invoke(IPC_CHANNELS.KANBAN_DELETE_CARD, id),
  moveKanbanCard: (payload: MoveKanbanCardPayload) => invoke(IPC_CHANNELS.KANBAN_MOVE_CARD, payload),
  reorderKanbanCards: (payload: ReorderKanbanCardsPayload) => invoke(IPC_CHANNELS.KANBAN_REORDER_CARDS, payload),

  // Windows
  openDashboard: () => invoke(IPC_CHANNELS.OPEN_DASHBOARD),
  closeTrayPopup: () => invoke(IPC_CHANNELS.CLOSE_TRAY_POPUP),
  setTopbarMenuOpen: (open: boolean) => invoke(IPC_CHANNELS.SET_TOPBAR_MENU_OPEN, open),
  setTopbarMinimized: (minimized: boolean) => invoke(IPC_CHANNELS.SET_TOPBAR_MINIMIZED, minimized),
  setTopbarExpanded: (expanded: boolean) => invoke(IPC_CHANNELS.SET_TOPBAR_EXPANDED, expanded)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
