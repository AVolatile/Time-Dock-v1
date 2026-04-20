import { ipcMain } from 'electron'
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
import { timeTrackingService } from '../services/timeTrackingService'
import { entryService } from '../services/entryService'
import { exportService } from '../services/exportService'
import { clientRepo, projectRepo, taskRepo } from '../database/repositories/entityRepos'
import { leadRepo } from '../database/repositories/leadRepo'
import { kanbanRepo } from '../database/repositories/kanbanRepo'

function handleError(fn: (...args: any[]) => any) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
    try {
      return { success: true, data: await fn(...args) }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' }
    }
  }
}

export function registerIpcHandlers(): void {
  // --- Time Tracking ---
  ipcMain.handle(IPC_CHANNELS.CLOCK_IN, handleError((payload: ClockInPayload) => {
    return timeTrackingService.clockIn(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.CLOCK_OUT, handleError(() => {
    return timeTrackingService.clockOut()
  }))

  ipcMain.handle(IPC_CHANNELS.START_BREAK, handleError(() => {
    return timeTrackingService.startBreak()
  }))

  ipcMain.handle(IPC_CHANNELS.END_BREAK, handleError(() => {
    return timeTrackingService.endBreak()
  }))

  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_SESSION, handleError(() => {
    return timeTrackingService.getActiveSession()
  }))

  ipcMain.handle(IPC_CHANNELS.SWITCH_PROJECT, handleError((payload: { projectId: string; taskId?: string; clientId?: string }) => {
    return timeTrackingService.switchProject(payload.projectId, payload.taskId, payload.clientId)
  }))

  // --- Entries ---
  ipcMain.handle(IPC_CHANNELS.GET_ENTRIES, handleError((filter: EntriesFilter) => {
    return entryService.getEntries(filter)
  }))

  ipcMain.handle(IPC_CHANNELS.GET_ENTRY, handleError((id: string) => {
    return entryService.getEntry(id)
  }))

  ipcMain.handle(IPC_CHANNELS.CREATE_ENTRY, handleError((payload: CreateEntryPayload) => {
    return entryService.createManualEntry(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.UPDATE_ENTRY, handleError((payload: UpdateEntryPayload) => {
    return entryService.updateEntry(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.DELETE_ENTRY, handleError((id: string) => {
    entryService.deleteEntry(id)
    return true
  }))

  ipcMain.handle(IPC_CHANNELS.GET_DAY_SUMMARY, handleError((dateStr?: string) => {
    return entryService.getDaySummary(dateStr ? new Date(dateStr) : undefined)
  }))

  ipcMain.handle(IPC_CHANNELS.GET_WEEK_SUMMARY, handleError((dateStr?: string) => {
    return entryService.getWeekSummary(dateStr ? new Date(dateStr) : undefined)
  }))

  // --- Clients ---
  ipcMain.handle(IPC_CHANNELS.GET_CLIENTS, handleError(() => {
    return clientRepo.getAll()
  }))

  ipcMain.handle(IPC_CHANNELS.CREATE_CLIENT, handleError((payload: ClientPayload) => {
    return clientRepo.create(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.UPDATE_CLIENT, handleError((payload: { id: string } & Partial<ClientPayload>) => {
    const { id, ...data } = payload
    return clientRepo.update(id, data)
  }))

  ipcMain.handle(IPC_CHANNELS.DELETE_CLIENT, handleError((id: string) => {
    clientRepo.delete(id)
    return true
  }))

  // --- Leads ---
  ipcMain.handle(IPC_CHANNELS.GET_LEADS, handleError((filter?: LeadsFilter) => {
    return leadRepo.getAll(filter || {})
  }))

  ipcMain.handle(IPC_CHANNELS.CREATE_LEAD, handleError((payload: LeadPayload) => {
    return leadRepo.create(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.UPDATE_LEAD, handleError((payload: UpdateLeadPayload) => {
    return leadRepo.update(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.ARCHIVE_LEAD, handleError((id: string, archived?: boolean) => {
    return leadRepo.archive(id, archived !== false)
  }))

  ipcMain.handle(IPC_CHANNELS.CONVERT_LEAD_TO_CLIENT, handleError((id: string) => {
    return leadRepo.convertToClient(id)
  }))

  // --- Projects ---
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, handleError((clientId?: string) => {
    return clientId ? projectRepo.getByClientId(clientId) : projectRepo.getAll()
  }))

  ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, handleError((payload: ProjectPayload) => {
    return projectRepo.create(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, handleError((payload: { id: string } & Partial<ProjectPayload>) => {
    const { id, ...data } = payload
    return projectRepo.update(id, data)
  }))

  ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, handleError((id: string) => {
    projectRepo.delete(id)
    return true
  }))

  // --- Tasks ---
  ipcMain.handle(IPC_CHANNELS.GET_TASKS, handleError((projectId?: string) => {
    return projectId ? taskRepo.getByProjectId(projectId) : taskRepo.getAll()
  }))

  ipcMain.handle(IPC_CHANNELS.CREATE_TASK, handleError((payload: TaskPayload) => {
    return taskRepo.create(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.UPDATE_TASK, handleError((payload: { id: string } & Partial<TaskPayload>) => {
    const { id, ...data } = payload
    return taskRepo.update(id, data)
  }))

  ipcMain.handle(IPC_CHANNELS.DELETE_TASK, handleError((id: string) => {
    taskRepo.delete(id)
    return true
  }))

  // --- Exports ---
  ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, handleError((payload: ExportPayload) => {
    return exportService.exportPDF(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.EXPORT_CSV, handleError((payload: ExportPayload) => {
    return exportService.exportCSV(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.GET_EXPORT_HISTORY, handleError(() => {
    return exportService.getExportHistory()
  }))

  // --- KanBan Notes ---
  ipcMain.handle(IPC_CHANNELS.KANBAN_GET_BOARD, handleError((boardId?: string) => {
    return kanbanRepo.getBoard(boardId)
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_CREATE_SECTION, handleError((payload: KanbanSectionPayload) => {
    return kanbanRepo.createSection(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_UPDATE_SECTION, handleError((payload: UpdateKanbanSectionPayload) => {
    return kanbanRepo.updateSection(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_DELETE_SECTION, handleError((id: string) => {
    kanbanRepo.deleteSection(id)
    return true
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_REORDER_SECTIONS, handleError((payload: ReorderKanbanSectionsPayload) => {
    kanbanRepo.reorderSections(payload)
    return true
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_CREATE_CARD, handleError((payload: KanbanCardPayload) => {
    return kanbanRepo.createCard(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_UPDATE_CARD, handleError((payload: UpdateKanbanCardPayload) => {
    return kanbanRepo.updateCard(payload)
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_DELETE_CARD, handleError((id: string) => {
    kanbanRepo.deleteCard(id)
    return true
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_MOVE_CARD, handleError((payload: MoveKanbanCardPayload) => {
    kanbanRepo.moveCard(payload)
    return true
  }))

  ipcMain.handle(IPC_CHANNELS.KANBAN_REORDER_CARDS, handleError((payload: ReorderKanbanCardsPayload) => {
    kanbanRepo.reorderCards(payload)
    return true
  }))
}
