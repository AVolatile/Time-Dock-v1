import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Edit3,
  FolderOpen,
  Plus,
  Tags,
  Trash2
} from 'lucide-react'
import { EntryCategory, type Client, type Project } from '@shared/types'
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
  TextInput
} from '../../components/ui'
import { groupProjectsByClient } from '../../lib/viewUtils'

export default function ProjectsPage() {
  const {
    projects,
    clients,
    tasks,
    loadProjects,
    loadClients,
    loadTasks,
    createTask,
    deleteTask
  } = useAppStore()
  const [editing, setEditing] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    loadClients()
    loadTasks()
  }, [])

  const groupedProjects = useMemo(() => groupProjectsByClient(projects, clients), [clients, projects])
  const activeProjects = projects.filter(project => project.active).length
  const billableProjects = projects.filter(project => project.billableDefault).length

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete project',
      message: 'This removes the project from management views. Existing time entries may prevent deletion.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteProject(id)
          await loadProjects()
          toast.success('Project deleted')
        } catch (error: any) {
          toast.error('Failed to delete project', error.message || 'The project may have linked tasks or time entries.')
        }
      }
    })
  }

  const handleToggleActive = async (project: Project) => {
    try {
      await window.api.updateProject({ id: project.id, active: !project.active })
      await loadProjects()
    } catch (error: any) {
      toast.error('Project update failed', error.message)
    }
  }

  const handleDeleteTask = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete task',
      message: 'This task will no longer be available for future tracking.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTask(id)
          toast.success('Task deleted')
        } catch (error: any) {
          toast.error('Failed to delete task', error.message)
        }
      }
    })
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Work Structure"
        title="Projects"
        description="Manage client workstreams, billing defaults, active status, and task-level tracking categories."
        meta={
          <div className="flex flex-wrap gap-2">
            <Pill tone="neutral">{projects.length} projects</Pill>
            <Pill tone="success">{activeProjects} active</Pill>
            <Pill tone="accent">{billableProjects} billable defaults</Pill>
          </div>
        }
        actions={
          <Button onClick={() => setIsCreating(true)} variant="primary">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-7 w-7" />}
          title="No projects yet"
          description="Create a project under a client to make topbar switching and exports meaningful."
          action={<Button onClick={() => setIsCreating(true)} variant="primary"><Plus className="h-4 w-4" /> New Project</Button>}
        />
      ) : (
        <div className="space-y-5">
          {groupedProjects.map(({ client, projects: clientProjects }) => (
            <section key={client?.id || 'none'}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase text-[color:var(--td-text-tertiary)]">{client?.name || 'No Client'}</div>
                  <div className="mt-1 flex gap-2">
                    {client?.code && <Pill tone="neutral">{client.code}</Pill>}
                    <Pill tone="neutral">{clientProjects.length} projects</Pill>
                  </div>
                </div>
              </div>

              <Panel className="overflow-hidden">
                <div className="divide-y divide-[color:var(--td-line)]">
                  {clientProjects.map(project => {
                    const projectTasks = tasks.filter(task => task.projectId === project.id)
                    const expanded = expandedProjectId === project.id
                    return (
                      <div key={project.id} className={!project.active ? 'opacity-60' : ''}>
                        <div className="flex items-center justify-between gap-4 p-4">
                          <button
                            type="button"
                            onClick={() => setExpandedProjectId(expanded ? null : project.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--td-accent-soft)] text-[color:var(--td-accent)]">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-[color:var(--td-text)]">{project.name}</span>
                              <span className="mt-1 flex flex-wrap gap-2">
                                {project.code && <Pill tone="neutral">{project.code}</Pill>}
                                <Pill tone={project.billableDefault ? 'success' : 'neutral'}>
                                  <DollarSign className="h-3 w-3" />
                                  {project.billableDefault ? 'Billable' : 'Non-billable'}
                                </Pill>
                                <Pill tone={project.active ? 'success' : 'neutral'}>{project.active ? 'Active' : 'Inactive'}</Pill>
                                <Pill tone="accent">{projectTasks.length} tasks</Pill>
                              </span>
                            </span>
                          </button>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button onClick={() => handleToggleActive(project)} size="xs" variant="ghost">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {project.active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <IconButton onClick={() => setEditing(project)} aria-label="Edit project">
                              <Edit3 className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(project.id)} tone="danger" aria-label="Delete project">
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-[color:var(--td-line)] bg-[color:var(--td-fill-soft)] p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-bold text-[color:var(--td-text-secondary)]">
                                <Tags className="h-3.5 w-3.5" />
                                Project Tasks
                              </div>
                              <Button onClick={() => setIsAddingTask(project.id)} size="xs" variant="secondary">
                                <Plus className="h-3.5 w-3.5" />
                                Add Task
                              </Button>
                            </div>
                            {projectTasks.length === 0 ? (
                              <EmptyState
                                compact
                                title="No tasks"
                                description="Add task categories for cleaner time logs."
                              />
                            ) : (
                              <div className="td-list">
                                {projectTasks.map(task => (
                                  <div key={task.id} className="td-list-row">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-[color:var(--td-text)]">{task.name}</div>
                                      <div className="mt-1">
                                        <Pill tone="neutral">{task.category}</Pill>
                                      </div>
                                    </div>
                                    <IconButton onClick={() => handleDeleteTask(task.id)} tone="danger" aria-label="Delete task">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </IconButton>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </section>
          ))}
        </div>
      )}

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
          onClose={() => { setIsAddingTask(null); loadTasks() }}
          onCreate={createTask}
        />
      )}
    </div>
  )
}

function ProjectModal({ project, clients, onClose }: { project?: Project; clients: Client[]; onClose: () => void }) {
  const isEdit = Boolean(project)
  const [name, setName] = useState(project?.name || '')
  const [code, setCode] = useState(project?.code || '')
  const [clientId, setClientId] = useState(project?.clientId || '')
  const [billableDefault, setBillableDefault] = useState(project?.billableDefault ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const next: Record<string, string> = {}
    if (!clientId) next.clientId = 'Choose the client this project belongs to.'
    if (!name.trim()) next.name = 'Project name is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (isEdit) {
        await window.api.updateProject({ id: project!.id, name: name.trim(), code: code.trim(), clientId, billableDefault })
        toast.success('Project updated', `${name.trim()} has been saved.`)
      } else {
        await window.api.createProject({ name: name.trim(), code: code.trim(), clientId, billableDefault })
        toast.success('Project created', `${name.trim()} has been added.`)
      }
      onClose()
    } catch (error: any) {
      toast.error('Save failed', error.message || 'The project could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={isEdit ? 'Edit Project' : 'New Project'}
      description="Projects organize time, billing defaults, and task-level work."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : isEdit ? 'Save Project' : 'Create Project'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Client" error={errors.clientId}>
          <SelectInput value={clientId} onChange={event => setClientId(event.target.value)}>
            <option value="">Select client...</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Project Name" error={errors.name}>
          <TextInput value={name} onChange={event => setName(event.target.value)} placeholder="Website redesign" />
        </Field>
        <Field label="Short Code" hint="Optional, useful for exports and quick scanning.">
          <TextInput value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="WEB-001" />
        </Field>
        <Panel className="p-3">
          <SwitchControl
            checked={billableDefault}
            onChange={setBillableDefault}
            label="Billable by default"
            description="New sessions on this project inherit this billing state."
          />
        </Panel>
      </div>
    </Dialog>
  )
}

function TaskModal({
  projectId,
  onClose,
  onCreate
}: {
  projectId: string
  onClose: () => void
  onCreate: (payload: any) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<EntryCategory>(EntryCategory.Dev)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Task name is required.')
      return
    }
    setSaving(true)
    try {
      await onCreate({ projectId, name: name.trim(), category })
      toast.success('Task created')
      onClose()
    } catch (err: any) {
      toast.error('Failed to create task', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title="New Task"
      description="Tasks add lightweight categorization inside a project."
      onClose={onClose}
      maxWidth="sm"
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">{saving ? 'Creating...' : 'Create Task'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Task Name" error={error}>
          <TextInput autoFocus value={name} onChange={event => { setName(event.target.value); setError('') }} placeholder="Design QA" />
        </Field>
        <Field label="Category">
          <SelectInput value={category} onChange={event => setCategory(event.target.value as EntryCategory)}>
            <option value={EntryCategory.Dev}>Development</option>
            <option value={EntryCategory.Design}>Design</option>
            <option value={EntryCategory.Meeting}>Meeting</option>
            <option value={EntryCategory.Planning}>Planning</option>
            <option value={EntryCategory.Admin}>Admin</option>
            <option value={EntryCategory.Other}>Other</option>
          </SelectInput>
        </Field>
      </div>
    </Dialog>
  )
}
