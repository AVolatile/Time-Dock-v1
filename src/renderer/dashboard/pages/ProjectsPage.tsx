import { useEffect, useState } from 'react'
import { useAppStore } from '../../store'
import { toast, useToastStore } from '../../components/toast/toastStore'
import type { Project, Client } from '@shared/types'
import {
  Plus, Edit3, Trash2, X, FolderOpen,
  DollarSign, ToggleLeft, ToggleRight
} from 'lucide-react'

export default function ProjectsPage() {
  const { projects, clients, tasks, loadProjects, loadClients, loadTasks, createTask, updateTask, deleteTask } = useAppStore()
  const [editing, setEditing] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    loadClients()
    loadTasks()
  }, [])

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete Project',
      message: 'Delete this project? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteProject(id)
          loadProjects()
          toast.success('Project deleted')
        } catch (e: any) {
          toast.error('Failed to delete project', e.message || 'It might have active tasks or log entries.')
        }
      }
    })
  }

  const handleToggleActive = async (project: Project) => {
    await window.api.updateProject({ id: project.id, active: !project.active })
    loadProjects()
  }

  const handleDeleteTask = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTask(id)
          toast.success('Task deleted')
        } catch (e: any) {
          toast.error('Failed to delete task', e.message)
        }
      }
    })
  }

  // Group by client
  const grouped = new Map<string, { client: Client | null; projects: Project[] }>()
  for (const p of projects) {
    const client = clients.find(c => c.id === p.clientId)
    const key = p.clientId || 'none'
    if (!grouped.has(key)) grouped.set(key, { client: client || null, projects: [] })
    grouped.get(key)!.projects.push(p)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="text-sm text-text-secondary mt-1">{projects.length} projects across {clients.length} clients</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="space-y-6">
        {[...grouped.entries()].map(([key, { client, projects: groupProjects }]) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                {client?.name || 'No Client'}
              </div>
              {client?.code && (
                <span className="badge bg-surface-3 text-text-tertiary">{client.code}</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupProjects.map(project => (
                <div key={project.id} className="flex flex-col">
                  <div className={`card-hover ${!project.active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setEditing(project)} className="btn btn-ghost btn-icon" title="Edit">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="btn btn-ghost btn-icon text-danger" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {project.code && (
                      <div className="text-2xs text-text-tertiary font-mono mb-2">{project.code}</div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-2xs">
                          {project.billableDefault ? (
                            <><DollarSign className="w-3 h-3 text-success" /><span className="text-success">Billable</span></>
                          ) : (
                            <span className="text-text-tertiary">Non-billable</span>
                          )}
                        </div>
                        <button onClick={() => handleToggleActive(project)} className="flex items-center gap-1 text-2xs text-text-tertiary hover:text-text-primary transition-colors">
                          {project.active ? <ToggleRight className="w-3.5 h-3.5 text-success" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {project.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <button
                        onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                        className="text-2xs text-accent hover:underline"
                      >
                        {expandedProjectId === project.id ? 'Hide Tasks' : `Tasks (${tasks.filter(t => t.projectId === project.id).length})`}
                      </button>
                    </div>
                  </div>

                  {/* Tasks Section */}
                  {expandedProjectId === project.id && (
                    <div className="mt-2 ml-4 p-3 bg-surface-1 border border-border rounded-lg animate-slide-down space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-bold uppercase tracking-widest text-text-tertiary">Project Tasks</span>
                        <button onClick={() => setIsAddingTask(project.id)} className="text-2xs text-accent flex items-center gap-1 hover:underline">
                          <Plus className="w-3 h-3" /> Add Task
                        </button>
                      </div>
                      <div className="space-y-1">
                        {tasks.filter(t => t.projectId === project.id).map(task => (
                          <div key={task.id} className="flex items-center justify-between group p-1.5 rounded hover:bg-surface-3 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-primary">{task.name}</span>
                              <span className="text-2xs text-text-tertiary px-1.5 py-0.5 bg-surface-4 rounded uppercase">{task.category}</span>
                            </div>
                            <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-danger hover:text-danger/80 transition-opacity">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {tasks.filter(t => t.projectId === project.id).length === 0 && (
                          <div className="text-2xs text-text-tertiary py-1 italic">No tasks yet</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(editing || isCreating) && (
        <ProjectModal
          project={editing || undefined}
          clients={clients}
          onClose={() => { setEditing(null); setIsCreating(false); loadProjects() }}
        />
      )}

      {isAddingTask && (
        <TaskModal
          projectId={isAddingTask}
          onClose={() => setIsAddingTask(null)}
        />
      )}
    </div>
  )
}

function TaskModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { createTask } = useAppStore()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('dev')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    try {
      await createTask({ projectId, name, category })
      toast.success('Task created')
      onClose()
    } catch (e: any) {
      toast.error('Failed to create task', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-surface-2 border border-border rounded-xl w-full max-w-sm p-6 shadow-popup animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Task Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="e.g. Design Mockups"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="select">
              <option value="dev">Development</option>
              <option value="design">Design</option>
              <option value="meeting">Meeting</option>
              <option value="planning">Planning</option>
              <option value="admin">Admin</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name} className="btn btn-primary">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}


function ProjectModal({ project, clients, onClose }: { project?: Project; clients: Client[]; onClose: () => void }) {
  const isEdit = !!project
  const [name, setName] = useState(project?.name || '')
  const [code, setCode] = useState(project?.code || '')
  const [clientId, setClientId] = useState(project?.clientId || '')
  const [billableDefault, setBillableDefault] = useState(project?.billableDefault ?? true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !clientId) return
    setSaving(true)
    try {
      if (isEdit) {
        await window.api.updateProject({ id: project!.id, name, code, clientId, billableDefault })
        toast.success('Project updated', `${name} has been saved.`)
      } else {
        await window.api.createProject({ name, code, clientId, billableDefault })
        toast.success('Project created', `${name} has been added.`)
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
      <div className="bg-surface-2 border border-border rounded-xl w-full max-w-md p-6 shadow-popup animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="select">
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Website Redesign" />
          </div>
          <div>
            <label className="label">Code</label>
            <input value={code} onChange={e => setCode(e.target.value)} className="input" placeholder="e.g. WEB-001" />
          </div>
          <div className="flex items-center gap-3">
            <label className="label mb-0">Billable by default</label>
            <button onClick={() => setBillableDefault(!billableDefault)} className={`w-10 h-5 rounded-full transition-colors ${billableDefault ? 'bg-accent' : 'bg-surface-4'} relative`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${billableDefault ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name || !clientId} className="btn btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
