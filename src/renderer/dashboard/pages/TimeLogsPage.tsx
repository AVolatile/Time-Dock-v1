import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2
} from 'lucide-react'
import { formatDurationHHMM } from '@shared/utils'
import type { CreateEntryPayload, TimeEntryWithRelations, UpdateEntryPayload } from '@shared/types'
import { useAppStore } from '../../store'
import { toast, useToastStore } from '../../components/toast/toastStore'
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  Panel,
  Pill,
  SelectInput,
  SwitchControl,
  TableShell,
  TextArea,
  TextInput,
  Toolbar
} from '../../components/ui'
import {
  describeEntryContext,
  formatDate,
  formatEntryWindow,
  formatTime,
  getEntryBreakMinutes,
  getEntryNetMinutes,
  toDateTimeLocalValue
} from '../../lib/viewUtils'

type SortKey = 'startedAt' | 'endedAt' | 'client' | 'project' | 'task' | 'billable' | 'net'

export default function TimeLogsPage() {
  const {
    entries,
    clients,
    projects,
    tasks,
    loadEntries,
    loadClients,
    loadProjects,
    loadTasks,
    setEntriesFilter
  } = useAppStore()
  const [searchText, setSearchText] = useState('')
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithRelations | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('startedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterBillable, setFilterBillable] = useState('')

  useEffect(() => {
    loadEntries()
    loadClients()
    loadProjects()
    loadTasks()
  }, [])

  const activeFilterCount = [
    searchText,
    startDate,
    endDate,
    filterClient,
    filterProject,
    filterBillable
  ].filter(Boolean).length

  const filteredProjects = filterClient ? projects.filter(project => project.clientId === filterClient) : projects

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const valA = getSortValue(a, sortKey)
      const valB = getSortValue(b, sortKey)
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [entries, sortDir, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  const applyFilters = () => {
    const filter: Record<string, string | boolean> = {}
    if (startDate) filter.startDate = new Date(startDate).toISOString()
    if (endDate) {
      const value = new Date(endDate)
      value.setHours(23, 59, 59, 999)
      filter.endDate = value.toISOString()
    }
    if (filterClient) filter.clientId = filterClient
    if (filterProject) filter.projectId = filterProject
    if (filterBillable === 'true') filter.billable = true
    if (filterBillable === 'false') filter.billable = false
    if (searchText.trim()) filter.search = searchText.trim()
    setEntriesFilter(filter)
  }

  const clearFilters = () => {
    setSearchText('')
    setStartDate('')
    setEndDate('')
    setFilterClient('')
    setFilterProject('')
    setFilterBillable('')
    setEntriesFilter({})
  }

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete time entry',
      message: 'This removes the time entry and its break records from local history.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteEntry(id)
          await loadEntries()
          toast.success('Entry deleted')
        } catch (error: any) {
          toast.error('Failed to delete entry', error.message || 'The entry could not be removed.')
        }
      }
    })
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Data Management"
        title="Time Logs"
        description="Filter, audit, create, and correct local time entries with desktop table density."
        meta={<Pill tone="neutral">{entries.length} entries loaded</Pill>}
        actions={
          <Button onClick={() => setIsCreating(true)} variant="primary">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        }
      />

      <Panel className="mb-4 p-3">
        <Toolbar className="border-0 bg-transparent p-0">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--td-text-tertiary)]" />
            <TextInput
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && applyFilters()}
              placeholder="Search notes, clients, projects..."
              className="pl-9"
            />
          </div>
          <TextInput type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="w-36" />
          <span className="text-xs text-[color:var(--td-text-tertiary)]">to</span>
          <TextInput type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="w-36" />
          <SelectInput value={filterClient} onChange={event => { setFilterClient(event.target.value); setFilterProject('') }} className="w-40">
            <option value="">All clients</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </SelectInput>
          <SelectInput value={filterProject} onChange={event => setFilterProject(event.target.value)} className="w-40">
            <option value="">All projects</option>
            {filteredProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </SelectInput>
          <SelectInput value={filterBillable} onChange={event => setFilterBillable(event.target.value)} className="w-32">
            <option value="">All billing</option>
            <option value="true">Billable</option>
            <option value="false">Non-billable</option>
          </SelectInput>
          <Button onClick={applyFilters} size="sm" variant="secondary">
            <Filter className="h-3.5 w-3.5" />
            Apply
          </Button>
          <Button onClick={clearFilters} size="sm" variant="ghost" disabled={activeFilterCount === 0}>
            Clear
          </Button>
        </Toolbar>
      </Panel>

      <TableShell>
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <SortableTh label="Date" column="startedAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Window</th>
                <SortableTh label="Client" column="client" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Project" column="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Task" column="task" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Break</th>
                <SortableTh label="Net" column="net" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Bill" column="billable" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Notes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map(entry => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-[color:var(--td-text)]">{formatDate(entry.startedAt)}</div>
                    <div className="text-[11px] text-[color:var(--td-text-tertiary)]">{formatTime(entry.startedAt)}</div>
                  </td>
                  <td className="td-mono whitespace-nowrap">{formatEntryWindow(entry)}</td>
                  <td>{entry.client?.name || '-'}</td>
                  <td>
                    <div className="font-medium text-[color:var(--td-text)]">{entry.project?.name || '-'}</div>
                    <div className="text-[11px] text-[color:var(--td-text-tertiary)]">{entry.project?.code || ''}</div>
                  </td>
                  <td>{entry.task?.name || '-'}</td>
                  <td className="text-[color:var(--td-text-tertiary)]">{getEntryBreakMinutes(entry) ? formatDurationHHMM(getEntryBreakMinutes(entry)) : '-'}</td>
                  <td className="td-mono font-semibold text-[color:var(--td-text)]">
                    {entry.endedAt ? formatDurationHHMM(getEntryNetMinutes(entry)) : <Pill tone="success">Active</Pill>}
                  </td>
                  <td>
                    {entry.billable ? (
                      <Pill tone="success"><DollarSign className="h-3 w-3" /> Billable</Pill>
                    ) : (
                      <Pill tone="neutral">No</Pill>
                    )}
                  </td>
                  <td className="max-w-[180px] truncate text-[11px]">{entry.note || describeEntryContext(entry)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <IconButton onClick={() => setEditingEntry(entry)} aria-label="Edit entry">
                        <Edit3 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(entry.id)} tone="danger" aria-label="Delete entry">
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedEntries.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="No time entries match this view"
              description="Clear filters, clock in, or add a manual entry to start building your local log."
              action={<Button onClick={() => setIsCreating(true)} variant="primary"><Plus className="h-4 w-4" /> New Entry</Button>}
            />
          </div>
        )}
      </TableShell>

      {editingEntry && (
        <EntryModal
          entry={editingEntry}
          onClose={() => { setEditingEntry(null); loadEntries() }}
        />
      )}

      {isCreating && (
        <EntryModal onClose={() => { setIsCreating(false); loadEntries() }} />
      )}
    </div>
  )
}

function SortableTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort
}: {
  label: string
  column: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (column: SortKey) => void
}) {
  return (
    <th>
      <button type="button" onClick={() => onSort(column)} className="flex items-center gap-1">
        {label}
        {sortKey === column && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  )
}

function EntryModal({ entry, onClose }: { entry?: TimeEntryWithRelations; onClose: () => void }) {
  const { clients, projects, tasks } = useAppStore()
  const isEdit = Boolean(entry)
  const [clientId, setClientId] = useState(entry?.clientId || '')
  const [projectId, setProjectId] = useState(entry?.projectId || '')
  const [taskId, setTaskId] = useState(entry?.taskId || '')
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(entry?.startedAt))
  const [endDate, setEndDate] = useState(toDateTimeLocalValue(entry?.endedAt))
  const [billable, setBillable] = useState(entry?.billable ?? true)
  const [note, setNote] = useState(entry?.note || '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredProjects = clientId ? projects.filter(project => project.clientId === clientId) : projects
  const filteredTasks = projectId ? tasks.filter(task => task.projectId === projectId) : tasks

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!startDate) nextErrors.startDate = 'Start time is required.'
    if (!isEdit && !endDate) nextErrors.endDate = 'End time is required for manual entries.'
    if (startDate && endDate && new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      nextErrors.endDate = 'End time must be after the start time.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (isEdit) {
        const payload: UpdateEntryPayload = {
          id: entry!.id,
          clientId: clientId || null,
          projectId: projectId || null,
          taskId: taskId || null,
          startedAt: startDate ? new Date(startDate).toISOString() : undefined,
          endedAt: endDate ? new Date(endDate).toISOString() : null,
          billable,
          note: note.trim() || null
        }
        await window.api.updateEntry(payload)
        toast.success('Entry updated')
      } else {
        const payload: CreateEntryPayload = {
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          startedAt: new Date(startDate).toISOString(),
          endedAt: new Date(endDate).toISOString(),
          billable,
          note: note.trim() || undefined
        }
        await window.api.createEntry(payload)
        toast.success('Entry created')
      }
      onClose()
    } catch (error: any) {
      toast.error('Save failed', error.message || 'The entry could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={isEdit ? 'Edit Time Entry' : 'New Manual Entry'}
      description="Keep corrections precise so exports and summaries stay trustworthy."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Entry'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="td-form-grid">
          <Field label="Start" error={errors.startDate}>
            <TextInput type="datetime-local" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </Field>
          <Field label="End" error={errors.endDate}>
            <TextInput type="datetime-local" value={endDate} onChange={event => setEndDate(event.target.value)} />
          </Field>
        </div>

        <Field label="Client">
          <SelectInput value={clientId} onChange={event => { setClientId(event.target.value); setProjectId(''); setTaskId('') }}>
            <option value="">No client</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </SelectInput>
        </Field>

        <Field label="Project">
          <SelectInput value={projectId} onChange={event => { setProjectId(event.target.value); setTaskId('') }}>
            <option value="">No project</option>
            {filteredProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </SelectInput>
        </Field>

        <Field label="Task">
          <SelectInput value={taskId} onChange={event => setTaskId(event.target.value)}>
            <option value="">No task</option>
            {filteredTasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
          </SelectInput>
        </Field>

        <Panel className="p-3">
          <SwitchControl
            checked={billable}
            onChange={setBillable}
            label="Billable entry"
            description="Include this time in invoice-ready summaries and PDF exports."
          />
        </Panel>

        <Field label="Notes">
          <TextArea value={note} onChange={event => setNote(event.target.value)} placeholder="Optional context for reports..." />
        </Field>
      </div>
    </Dialog>
  )
}

function getSortValue(entry: TimeEntryWithRelations, key: SortKey): string | number | boolean {
  switch (key) {
    case 'client':
      return entry.client?.name || ''
    case 'project':
      return entry.project?.name || ''
    case 'task':
      return entry.task?.name || ''
    case 'billable':
      return entry.billable ? 1 : 0
    case 'net':
      return getEntryNetMinutes(entry)
    default:
      return entry[key] || ''
  }
}
