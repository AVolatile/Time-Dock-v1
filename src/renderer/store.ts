import { create } from 'zustand'
import type {
  ActiveSession,
  Client,
  Project,
  Task,
  TimeEntryWithRelations,
  DaySummary,
  WeekSummary,
  EntriesFilter
} from '@shared/types'
import { WorkStatus } from '@shared/types'

interface AppState {
  // Session state
  session: ActiveSession | null
  isLoading: boolean

  // Entity data
  clients: Client[]
  projects: Project[]
  tasks: Task[]

  // Logs
  entries: TimeEntryWithRelations[]
  entriesFilter: EntriesFilter
  daySummary: DaySummary | null
  weekSummary: WeekSummary | null

  // UI state
  activePage: string

  // Actions
  setActivePage: (page: string) => void
  refreshSession: () => Promise<void>
  clockIn: (payload?: any) => Promise<void>
  clockOut: () => Promise<void>
  startBreak: () => Promise<void>
  endBreak: () => Promise<void>
  switchProject: (projectId: string, taskId?: string, clientId?: string) => Promise<void>
  loadClients: () => Promise<void>
  loadProjects: (clientId?: string) => Promise<void>
  loadTasks: (projectId?: string) => Promise<void>
  createTask: (payload: any) => Promise<void>
  updateTask: (payload: { id: string } & any) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  loadEntries: (filter?: EntriesFilter) => Promise<void>
  loadDaySummary: (date?: string) => Promise<void>
  loadWeekSummary: (date?: string) => Promise<void>
  setEntriesFilter: (filter: Partial<EntriesFilter>) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  isLoading: false,
  clients: [],
  projects: [],
  tasks: [],
  entries: [],
  entriesFilter: {},
  daySummary: null,
  weekSummary: null,
  activePage: 'overview',

  setActivePage: (page) => set({ activePage: page }),

  refreshSession: async () => {
    try {
      const session = await window.api.getActiveSession()
      set({ session: session as ActiveSession })
    } catch {
      set({ session: null })
    }
  },

  clockIn: async (payload) => {
    set({ isLoading: true })
    try {
      const session = await window.api.clockIn(payload)
      set({ session: session as ActiveSession, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false })
      throw e
    }
  },

  clockOut: async () => {
    set({ isLoading: true })
    try {
      await window.api.clockOut()
      set({ session: null, isLoading: false })
      // Refresh summaries
      get().loadDaySummary()
      get().loadWeekSummary()
    } catch (e: any) {
      set({ isLoading: false })
      throw e
    }
  },

  startBreak: async () => {
    set({ isLoading: true })
    try {
      const session = await window.api.startBreak()
      set({ session: session as ActiveSession, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false })
      throw e
    }
  },

  endBreak: async () => {
    set({ isLoading: true })
    try {
      const session = await window.api.endBreak()
      set({ session: session as ActiveSession, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false })
      throw e
    }
  },

  switchProject: async (projectId, taskId, clientId) => {
    set({ isLoading: true })
    try {
      const session = await window.api.switchProject({ projectId, taskId, clientId })
      set({ session: session as ActiveSession, isLoading: false })
    } catch (e: any) {
      set({ isLoading: false })
      throw e
    }
  },

  loadClients: async () => {
    const clients = await window.api.getClients()
    set({ clients: clients as Client[] })
  },

  loadProjects: async (clientId) => {
    const projects = await window.api.getProjects(clientId)
    set({ projects: projects as Project[] })
  },

  loadTasks: async (projectId) => {
    const tasks = await window.api.getTasks(projectId)
    set({ tasks: tasks as Task[] })
  },

  createTask: async (payload) => {
    await window.api.createTask(payload)
    get().loadTasks()
  },

  updateTask: async (payload) => {
    await window.api.updateTask(payload)
    get().loadTasks()
  },

  deleteTask: async (id) => {
    await window.api.deleteTask(id)
    get().loadTasks()
  },

  loadEntries: async (filter) => {
    const currentFilter = filter || get().entriesFilter
    const entries = await window.api.getEntries(currentFilter)
    set({ entries: entries as TimeEntryWithRelations[], entriesFilter: currentFilter })
  },

  loadDaySummary: async (date) => {
    const daySummary = await window.api.getDaySummary(date)
    set({ daySummary: daySummary as DaySummary })
  },

  loadWeekSummary: async (date) => {
    const weekSummary = await window.api.getWeekSummary(date)
    set({ weekSummary: weekSummary as WeekSummary })
  },

  setEntriesFilter: (filter) => {
    const newFilter = { ...get().entriesFilter, ...filter }
    set({ entriesFilter: newFilter })
    get().loadEntries(newFilter)
  }
}))
