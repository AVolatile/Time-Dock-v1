import { useEffect, useMemo, useState } from 'react'
import { Building2, Edit3, FolderOpen, Plus, Trash2, Users } from 'lucide-react'
import type { Client } from '@shared/types'
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
  SwitchControl,
  TextInput
} from '../../components/ui'

export default function ClientsPage() {
  const { clients, projects, loadClients, loadProjects } = useAppStore()
  const [editing, setEditing] = useState<Client | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadClients()
    loadProjects()
  }, [])

  const activeClients = clients.filter(client => client.active).length
  const projectCountByClient = useMemo(() => {
    return clients.reduce<Record<string, number>>((acc, client) => {
      acc[client.id] = projects.filter(project => project.clientId === client.id).length
      return acc
    }, {})
  }, [clients, projects])

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete client',
      message: 'This removes the client from local management views. Existing projects may prevent deletion.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteClient(id)
          await loadClients()
          toast.success('Client deleted')
        } catch (error: any) {
          toast.error('Failed to delete client', error.message || 'The client may have linked projects.')
        }
      }
    })
  }

  const handleToggleActive = async (client: Client) => {
    try {
      await window.api.updateClient({ id: client.id, active: !client.active })
      await loadClients()
    } catch (error: any) {
      toast.error('Client update failed', error.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        description="Keep client identities, short codes, and active status clean so projects and exports scan properly."
        meta={
          <div className="flex flex-wrap gap-2">
            <Pill tone="neutral">{clients.length} clients</Pill>
            <Pill tone="success">{activeClients} active</Pill>
            <Pill tone="accent">{projects.length} projects linked</Pill>
          </div>
        }
        actions={
          <Button onClick={() => setIsCreating(true)} variant="primary">
            <Plus className="h-4 w-4" />
            New Client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No clients yet"
          description="Create a client before adding projects so TimeDock can keep reporting and switching tidy."
          action={<Button onClick={() => setIsCreating(true)} variant="primary"><Plus className="h-4 w-4" /> New Client</Button>}
        />
      ) : (
        <div className="td-grid-3">
          {clients.map(client => {
            const clientProjects = projects.filter(project => project.clientId === client.id)
            return (
              <Panel key={client.id} interactive className={`p-4 ${!client.active ? 'opacity-60' : ''}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--td-accent-soft)] text-[color:var(--td-accent)]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[color:var(--td-text)]">{client.name}</div>
                      <div className="mt-1 flex gap-2">
                        {client.code && <Pill tone="neutral">{client.code}</Pill>}
                        <Pill tone={client.active ? 'success' : 'neutral'}>{client.active ? 'Active' : 'Inactive'}</Pill>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton onClick={() => setEditing(client)} aria-label="Edit client">
                      <Edit3 className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(client.id)} tone="danger" aria-label="Delete client">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2 text-xs text-[color:var(--td-text-secondary)]">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {projectCountByClient[client.id] || 0} linked project{projectCountByClient[client.id] === 1 ? '' : 's'}
                </div>

                {clientProjects.length > 0 ? (
                  <div className="mb-4 space-y-1">
                    {clientProjects.slice(0, 4).map(project => (
                      <div key={project.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[color:var(--td-fill-hover)]">
                        <span className="truncate text-[color:var(--td-text)]">{project.name}</span>
                        {project.code && <span className="td-mono text-[10px] text-[color:var(--td-text-tertiary)]">{project.code}</span>}
                      </div>
                    ))}
                    {clientProjects.length > 4 && (
                      <div className="px-2 text-[11px] text-[color:var(--td-text-tertiary)]">+{clientProjects.length - 4} more</div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 rounded-md border border-dashed border-[color:var(--td-line)] p-3 text-xs text-[color:var(--td-text-tertiary)]">
                    No projects assigned yet.
                  </div>
                )}

                <SwitchControl
                  checked={client.active}
                  onChange={() => handleToggleActive(client)}
                  label="Available for new work"
                  description="Inactive clients stay in history but drop out of fast selection."
                />
              </Panel>
            )
          })}
        </div>
      )}

      {(editing || isCreating) && (
        <ClientModal
          client={editing || undefined}
          onClose={() => { setEditing(null); setIsCreating(false); loadClients() }}
        />
      )}
    </div>
  )
}

function ClientModal({ client, onClose }: { client?: Client; onClose: () => void }) {
  const isEdit = Boolean(client)
  const [name, setName] = useState(client?.name || '')
  const [code, setCode] = useState(client?.code || '')
  const [active, setActive] = useState(client?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Client name is required.')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await window.api.updateClient({ id: client!.id, name: name.trim(), code: code.trim(), active })
        toast.success('Client updated', `${name.trim()} has been saved.`)
      } else {
        await window.api.createClient({ name: name.trim(), code: code.trim(), active })
        toast.success('Client created', `${name.trim()} has been added.`)
      }
      onClose()
    } catch (err: any) {
      toast.error('Save failed', err.message || 'The client could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={isEdit ? 'Edit Client' : 'New Client'}
      description="Client names and codes appear in selectors, exports, and log tables."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : isEdit ? 'Save Client' : 'Create Client'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Client Name" error={error}>
          <TextInput autoFocus value={name} onChange={event => { setName(event.target.value); setError('') }} placeholder="Northstar Studio" />
        </Field>
        <Field label="Short Code" hint="Optional two-to-eight character code for compact surfaces.">
          <TextInput value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="NS" />
        </Field>
        <Panel className="p-3">
          <SwitchControl
            checked={active}
            onChange={setActive}
            label="Active client"
            description="Active clients appear in topbar and tray project selection."
          />
        </Panel>
      </div>
    </Dialog>
  )
}
