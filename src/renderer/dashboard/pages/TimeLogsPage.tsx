import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../../store'
import { toast, useToastStore } from '../../components/toast/toastStore'
import { formatDuration, formatDurationHHMM } from '@shared/utils'
import type { TimeEntryWithRelations, CreateEntryPayload, UpdateEntryPayload } from '@shared/types'
import {
  Search, Filter, Plus, Edit3, Trash2, X,
  ChevronUp, ChevronDown, Calendar, DollarSign
} from 'lucide-react'

export default function TimeLogsPage() {
  const { entries, clients, projects, tasks, loadEntries, loadClients, loadProjects, loadTasks, entriesFilter, setEntriesFilter } = useAppStore()
  const [searchText, setSearchText] = useState('')
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithRelations | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [sortKey, setSortKey] = useState<string>('startedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterBillable, setFilterBillable] = useState<string>('')

  useEffect(() => {
    loadEntries()
    loadClients()
    loadProjects()
    loadTasks()
  }, [])

  const handleApplyFilters = () => {
    const filter: any = {}
    if (startDate) filter.startDate = new Date(startDate).toISOString()
    if (endDate) {
      const ed = new Date(endDate)
      ed.setHours(23, 59, 59, 999)
      filter.endDate = ed.toISOString()
    }
    if (filterClient) filter.clientId = filterClient
    if (filterProject) filter.projectId = filterProject
    if (filterBillable === 'true') filter.billable = true
    if (filterBillable === 'false') filter.billable = false
    if (searchText) filter.search = searchText
    setEntriesFilter(filter)
  }

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setFilterClient('')
    setFilterProject('')
    setFilterBillable('')
    setSearchText('')
    setEntriesFilter({})
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a: any, b: any) => {
      const valA = a[sortKey] || ''
      const valB = b[sortKey] || ''
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [entries, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this time entry?',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteEntry(id)
          loadEntries()
          toast.success('Entry deleted')
        } catch (e: any) {
          toast.error('Failed to delete entry', e.message || 'Something went wrong.')
        }
      }
    })
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Time Logs</h1>
          <p className="text-sm text-text-secondary mt-1">{entries.length} entries</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
              placeholder="Search notes, projects, clients..."
              className="input pl-9"
            />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-36" />
          <span className="text-text-tertiary text-xs">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-36" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="select w-36">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="select w-36">
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterBillable} onChange={e => setFilterBillable(e.target.value)} className="select w-28">
            <option value="">All</option>
            <option value="true">Billable</option>
            <option value="false">Non-billable</option>
          </select>
          <button onClick={handleApplyFilters} className="btn btn-primary btn-sm">
            <Filter className="w-3.5 h-3.5" />
            Apply
          </button>
          <button onClick={handleClearFilters} className="btn btn-ghost btn-sm">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: 'startedAt', label: 'Date' },
                  { key: 'startedAt_time', label: 'Start' },
                  { key: 'endedAt', label: 'End' },
                  { key: 'break', label: 'Break' },
                  { key: 'net', label: 'Net Hours' },
                  { key: 'clientId', label: 'Client' },
                  { key: 'projectId', label: 'Project' },
                  { key: 'taskId', label: 'Task' },
                  { key: 'billable', label: 'Bill' },
                  { key: 'note', label: 'Notes' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="table-header text-left px-4 py-3 cursor-pointer hover:text-text-secondary transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon column={col.key} />
                    </div>
                  </th>
                ))}
                <th className="table-header text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map(entry => {
                const breakMins = entry.breaks.reduce((s, b) => s + (b.durationMinutes || 0), 0)
                const netMins = (entry.durationMinutes || 0) - breakMins
                return (
                  <tr key={entry.id} className="border-b border-border-subtle hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{entry.startedAt ? new Date(entry.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-text-secondary">{entry.startedAt ? new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-text-secondary">{entry.endedAt ? new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-working">Active</span>}</td>
                    <td className="px-4 py-3 text-sm text-text-tertiary">{breakMins > 0 ? formatDuration(breakMins) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium">{entry.endedAt ? formatDurationHHMM(netMins) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{entry.client?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{entry.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{entry.task?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {entry.billable ? (
                        <DollarSign className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <span className="text-text-tertiary text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-tertiary max-w-[120px] truncate">{entry.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingEntry(entry)} className="btn btn-ghost btn-icon" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} className="btn btn-ghost btn-icon text-danger" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="text-center py-12 text-text-tertiary text-sm">
            No time entries found. Adjust your filters or clock in to start tracking.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <EntryModal
          entry={editingEntry}
          onClose={() => { setEditingEntry(null); loadEntries() }}
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <EntryModal
          onClose={() => { setIsCreating(false); loadEntries() }}
        />
      )}
    </div>
  )
}

function EntryModal({
  entry,
  onClose
}: {
  entry?: TimeEntryWithRelations
  onClose: () => void
}) {
  const { clients, projects, tasks } = useAppStore()
  const isEdit = !!entry

  const [clientId, setClientId] = useState(entry?.clientId || '')
  const [projectId, setProjectId] = useState(entry?.projectId || '')
  const [taskId, setTaskId] = useState(entry?.taskId || '')
  const [startDate, setStartDate] = useState(entry?.startedAt ? new Date(entry.startedAt).toISOString().slice(0, 16) : '')
  const [endDate, setEndDate] = useState(entry?.endedAt ? new Date(entry.endedAt).toISOString().slice(0, 16) : '')
  const [billable, setBillable] = useState(entry?.billable ?? true)
  const [note, setNote] = useState(entry?.note || '')
  const [saving, setSaving] = useState(false)

  const filteredProjects = clientId ? projects.filter(p => p.clientId === clientId) : projects
  const filteredTasks = projectId ? tasks.filter(t => t.projectId === projectId) : tasks

  const handleSave = async () => {
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
          note: note || null
        }
        await window.api.updateEntry(payload)
        toast.success('Entry updated')
      } else {
        if (!startDate || !endDate) return
        const payload: CreateEntryPayload = {
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          startedAt: new Date(startDate).toISOString(),
          endedAt: new Date(endDate).toISOString(),
          billable,
          note: note || undefined
        }
        await window.api.createEntry(payload)
        toast.success('Entry created')
      }
      onClose()
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl w-full max-w-lg p-6 shadow-popup animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Entry' : 'New Entry'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start</label>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End</label>
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Client</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setProjectId(''); setTaskId('') }} className="select">
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Project</label>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId('') }} className="select">
              <option value="">No project</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Task</label>
            <select value={taskId} onChange={e => setTaskId(e.target.value)} className="select">
              <option value="">No task</option>
              {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="label mb-0">Billable</label>
            <button
              onClick={() => setBillable(!billable)}
              className={`w-10 h-5 rounded-full transition-colors ${billable ? 'bg-accent' : 'bg-surface-4'} relative`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${billable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input min-h-[60px] resize-y"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}
