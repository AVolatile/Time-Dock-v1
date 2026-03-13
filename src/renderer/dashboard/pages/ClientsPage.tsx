import { useEffect, useState } from 'react'
import { useAppStore } from '../../store'
import { toast, useToastStore } from '../../components/toast/toastStore'
import type { Client } from '@shared/types'
import {
  Plus, Edit3, Trash2, X, Users,
  ToggleLeft, ToggleRight, FolderOpen
} from 'lucide-react'

export default function ClientsPage() {
  const { clients, projects, loadClients, loadProjects } = useAppStore()
  const [editing, setEditing] = useState<Client | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadClients()
    loadProjects()
  }, [])

  const handleDelete = async (id: string) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await window.api.deleteClient(id)
          loadClients()
          toast.success('Client deleted')
        } catch (e: any) {
          toast.error('Failed to delete client', e.message || 'It might have active projects.')
        }
      }
    })
  }

  const handleToggleActive = async (client: Client) => {
    await window.api.updateClient({ id: client.id, active: !client.active })
    loadClients()
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
          <p className="text-sm text-text-secondary mt-1">{clients.length} clients</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProjects = projects.filter(p => p.clientId === client.id)
          return (
            <div key={client.id} className={`card-hover ${!client.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{client.name}</div>
                    {client.code && <div className="text-2xs text-text-tertiary font-mono">{client.code}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setEditing(client)} className="btn btn-ghost btn-icon" title="Edit">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="btn btn-ghost btn-icon text-danger" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-3">
                <FolderOpen className="w-3 h-3" />
                {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
              </div>

              {clientProjects.length > 0 && (
                <div className="space-y-1 mb-3">
                  {clientProjects.slice(0, 3).map(p => (
                    <div key={p.id} className="text-xs text-text-tertiary flex items-center gap-1.5 pl-1">
                      <div className="w-1 h-1 rounded-full bg-text-tertiary" />
                      {p.name}
                    </div>
                  ))}
                  {clientProjects.length > 3 && (
                    <div className="text-2xs text-text-tertiary pl-1">+{clientProjects.length - 3} more</div>
                  )}
                </div>
              )}

              <button onClick={() => handleToggleActive(client)} className="flex items-center gap-1 text-2xs text-text-tertiary hover:text-text-primary transition-colors">
                {client.active ? <ToggleRight className="w-3.5 h-3.5 text-success" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {client.active ? 'Active' : 'Inactive'}
              </button>
            </div>
          )
        })}
      </div>

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
  const isEdit = !!client
  const [name, setName] = useState(client?.name || '')
  const [code, setCode] = useState(client?.code || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    try {
      if (isEdit) {
        await window.api.updateClient({ id: client!.id, name, code })
        toast.success('Client updated', `${name} has been saved.`)
      } else {
        await window.api.createClient({ name, code })
        toast.success('Client created', `${name} has been added.`)
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
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Client' : 'New Client'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Client Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. FirmGuide" />
          </div>
          <div>
            <label className="label">Short Code</label>
            <input value={code} onChange={e => setCode(e.target.value)} className="input" placeholder="e.g. FG" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name} className="btn btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
