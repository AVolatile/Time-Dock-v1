import { formatDuration } from '@shared/utils'
import { WorkStatus, type Client, type Project, type TimeEntryWithRelations } from '@shared/types'

export function getStatusMeta(status: WorkStatus) {
  if (status === WorkStatus.Working) {
    return {
      label: 'Working',
      shortLabel: 'Work',
      textClass: 'td-status-text-working',
      dotClass: 'td-status-dot-working',
      badgeClass: 'td-status-badge-working',
      tone: 'success' as const
    }
  }

  if (status === WorkStatus.OnBreak) {
    return {
      label: 'On Break',
      shortLabel: 'Break',
      textClass: 'td-status-text-break',
      dotClass: 'td-status-dot-break',
      badgeClass: 'td-status-badge-break',
      tone: 'warning' as const
    }
  }

  return {
    label: 'Off Work',
    shortLabel: 'Off',
    textClass: 'td-status-text-off',
    dotClass: 'td-status-dot-off',
    badgeClass: 'td-status-badge-off',
    tone: 'neutral' as const
  }
}

export function getProjectClient(project: Project | null | undefined, clients: Client[]): Client | null {
  if (!project) return null
  return clients.find(client => client.id === project.clientId) || null
}

export function getEntryNetMinutes(entry: TimeEntryWithRelations): number {
  if (typeof entry.netDurationMinutes === 'number') {
    return Math.max(0, entry.netDurationMinutes)
  }

  const breakMinutes = entry.breaks.reduce((sum, item) => sum + (item.durationMinutes || 0), 0)
  return Math.max(0, (entry.durationMinutes || 0) - breakMinutes)
}

export function getEntryBreakMinutes(entry: TimeEntryWithRelations): number {
  return entry.breaks.reduce((sum, item) => sum + (item.durationMinutes || 0), 0)
}

export function formatEntryWindow(entry: TimeEntryWithRelations): string {
  return `${formatTime(entry.startedAt)} - ${entry.endedAt ? formatTime(entry.endedAt) : 'Active'}`
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatFullDate(iso?: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatEntryDuration(entry: TimeEntryWithRelations): string {
  if (!entry.endedAt) return 'Active'
  return formatDuration(getEntryNetMinutes(entry))
}

export function toDateTimeLocalValue(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function groupProjectsByClient(projects: Project[], clients: Client[]) {
  const groups = new Map<string, { client: Client | null; projects: Project[] }>()

  for (const project of projects) {
    const client = clients.find(item => item.id === project.clientId) || null
    const key = client?.id || 'none'
    if (!groups.has(key)) groups.set(key, { client, projects: [] })
    groups.get(key)!.projects.push(project)
  }

  return Array.from(groups.values()).sort((a, b) => {
    const nameA = a.client?.name || 'No Client'
    const nameB = b.client?.name || 'No Client'
    return nameA.localeCompare(nameB)
  })
}

export function describeEntryContext(entry: TimeEntryWithRelations): string {
  return [
    entry.client?.name,
    entry.project?.name,
    entry.task?.name
  ].filter(Boolean).join(' / ') || 'Unassigned work'
}
