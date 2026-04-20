import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Clipboard,
  ExternalLink,
  KanbanSquare,
  Phone,
  Send,
  Target
} from 'lucide-react'
import { WorkStatus } from '@shared/types'
import type {
  Client,
  KanbanBoardWithSections,
  KanbanCardPayload,
  Lead,
  LeadStatus,
  Project
} from '@shared/types'
import { toast } from '../components/toast/toastStore'
import { formatDate, getStatusMeta } from '../lib/viewUtils'

const CLOSED_LEAD_STATUSES: LeadStatus[] = ['won', 'lost']

const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  discovery: 'Discovery',
  proposal_sent: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
}

interface OperatorOverviewProps {
  breakTimer: string
  clients: Client[]
  currentClient: Client | null
  currentProject: Project | null
  currentProjectId?: string | null
  onClientSelect: (clientId: string) => void
  onProjectSelect: (project: Project) => void
  projects: Project[]
  selectedClientId: string
  status: WorkStatus
  timer: string
}

export default function OperatorOverview({
  breakTimer,
  clients,
  currentClient,
  currentProject,
  currentProjectId,
  onClientSelect,
  onProjectSelect,
  projects,
  selectedClientId,
  status,
  timer
}: OperatorOverviewProps) {
  const activeClients = useMemo(() => clients.filter(client => client.active), [clients])
  const activeProjects = useMemo(() => projects.filter(project => project.active), [projects])
  const scopedProjects = useMemo(() => {
    return selectedClientId
      ? activeProjects.filter(project => project.clientId === selectedClientId)
      : activeProjects
  }, [activeProjects, selectedClientId])

  const selectedProjectValue = scopedProjects.some(project => project.id === currentProjectId)
    ? currentProjectId || ''
    : ''

  return (
    <ActiveWorkSection
      activeClients={activeClients}
      breakTimer={breakTimer}
      currentClient={currentClient}
      currentProject={currentProject}
      onClientSelect={onClientSelect}
      onProjectSelect={onProjectSelect}
      projects={scopedProjects}
      projectValue={selectedProjectValue}
      selectedClientId={selectedClientId}
      status={status}
      timer={timer}
    />
  )
}

function ActiveWorkSection({
  activeClients,
  breakTimer,
  currentClient,
  currentProject,
  onClientSelect,
  onProjectSelect,
  projects,
  projectValue,
  selectedClientId,
  status,
  timer
}: {
  activeClients: Client[]
  breakTimer: string
  currentClient: Client | null
  currentProject: Project | null
  onClientSelect: (clientId: string) => void
  onProjectSelect: (project: Project) => void
  projects: Project[]
  projectValue: string
  selectedClientId: string
  status: WorkStatus
  timer: string
}) {
  const statusMeta = getStatusMeta(status)

  return (
    <section className="widget-section widget-operator-active">
      <div className="widget-operator-status">
        <span className={`utility-badge ${utilityBadgeClass(status)}`}>
          <span className={`td-status-dot ${statusMeta.dotClass}`} />
          {statusMeta.label}
        </span>
        <div className={`td-mono widget-operator-timer ${utilityStatusClass(status)}`}>{timer}</div>
        {status === WorkStatus.OnBreak && <span className="td-mono widget-break-chip">Break {breakTimer}</span>}
      </div>

      <div className="widget-operator-current">
        <div className="widget-section-kicker">Active Work</div>
        <div className="widget-current-stack">
          <span className="widget-current-line">
            <Building2 className="h-3.5 w-3.5" />
            <span>{currentClient?.name || 'No client selected'}</span>
          </span>
          <span className="widget-current-line">
            <Briefcase className="h-3.5 w-3.5" />
            <span>{currentProject?.name || 'No project selected'}</span>
          </span>
        </div>
      </div>

      <div className="widget-operator-controls">
        <label className="widget-field-compact">
          <span>Client</span>
          <select
            value={selectedClientId}
            onChange={event => onClientSelect(event.target.value)}
            className="utility-input widget-control-select"
          >
            <option value="">All clients</option>
            {activeClients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="widget-field-compact">
          <span>Project</span>
          <select
            value={projectValue}
            onChange={event => {
              const project = projects.find(item => item.id === event.target.value)
              if (project) onProjectSelect(project)
            }}
            className="utility-input widget-control-select"
            disabled={projects.length === 0}
          >
            <option value="">Select project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export function QuickCaptureSection({
  currentClient,
  currentProject,
  kanbanBoard,
  onCreateKanbanCard,
  onOpenKanban
}: {
  currentClient: Client | null
  currentProject: Project | null
  kanbanBoard: KanbanBoardWithSections | null
  onCreateKanbanCard: (payload: KanbanCardPayload) => Promise<void>
  onOpenKanban: () => void
}) {
  const sections = useMemo(() => kanbanBoard?.sections || [], [kanbanBoard])
  const [sectionId, setSectionId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sections.length === 0) {
      setSectionId('')
      return
    }

    if (!sections.some(section => section.id === sectionId)) {
      setSectionId(sections[0].id)
    }
  }, [sectionId, sections])

  const selectedSection = sections.find(section => section.id === sectionId) || null

  const handleSubmit = async () => {
    const trimmed = note.trim()
    if (!trimmed) {
      setError('Write a note before adding it.')
      return
    }
    if (!selectedSection) {
      setError('Choose a KanBan section first.')
      return
    }

    setSaving(true)
    setError('')

    const context = [currentClient?.name, currentProject?.name].filter(Boolean).join(' / ')
    const labels = ['Quick Capture', currentClient?.code || currentClient?.name, currentProject?.code || currentProject?.name]
      .filter(Boolean)
      .slice(0, 3) as string[]
    const captureId = `quick-capture-${Date.now()}`

    try {
      await onCreateKanbanCard({
        boardId: kanbanBoard?.id,
        sectionId: selectedSection.id,
        title: makeCaptureTitle(trimmed),
        description: context,
        accentColor: selectedSection.color,
        labels,
        contentBlocks: [
          {
            id: `${captureId}-body`,
            type: 'text',
            position: 1000,
            content: trimmed
          }
        ]
      })
      setNote('')
      toast.success('Captured to KanBan', selectedSection.title)
    } catch (error: any) {
      toast.error('Capture failed', error.message || 'The note could not be added.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="widget-section widget-quick-capture">
      <div className="widget-section-head">
        <div>
          <div className="widget-section-kicker">Quick Capture</div>
          <h3 className="widget-section-title">
            <KanbanSquare className="h-3.5 w-3.5" />
            KanBan note
          </h3>
        </div>
        <button type="button" onClick={onOpenKanban} className="widget-text-action">
          Open
        </button>
      </div>

      <div className="widget-capture-row">
        <select
          value={sectionId}
          onChange={event => setSectionId(event.target.value)}
          className="utility-input widget-capture-select"
          disabled={sections.length === 0}
          aria-label="KanBan destination"
        >
          {sections.length === 0 && <option value="">Loading sections</option>}
          {sections.map(section => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSubmit}
          className="utility-button widget-primary-action"
          disabled={saving || sections.length === 0}
        >
          <Send className="h-3.5 w-3.5" />
          {saving ? 'Adding' : 'Add'}
        </button>
      </div>

      <textarea
        value={note}
        onChange={event => {
          setNote(event.target.value)
          if (error) setError('')
        }}
        onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            handleSubmit()
          }
        }}
        className="utility-input widget-capture-input"
        placeholder="Capture a task, blocker, follow-up, or reusable note..."
      />
      {error && <div className="widget-field-error">{error}</div>}
    </section>
  )
}

export function LeadFollowUpsSection({
  leads,
  onLeadContacted,
  onOpenLeads
}: {
  leads: Lead[]
  onLeadContacted: (lead: Lead) => Promise<void>
  onOpenLeads: () => void
}) {
  const priorityLeads = useMemo(() => getPriorityLeads(leads), [leads])

  return (
    <section className="widget-section widget-leads-panel">
      <div className="widget-section-head">
        <div>
          <div className="widget-section-kicker">Lead Follow-Ups</div>
          <h3 className="widget-section-title">
            <Target className="h-3.5 w-3.5" />
            Priority pipeline
          </h3>
        </div>
        <button type="button" onClick={onOpenLeads} className="widget-text-action">
          Open
        </button>
      </div>

      <div className="widget-lead-list">
        {priorityLeads.map(lead => {
          const followUp = getFollowUpMeta(lead)
          return (
            <article key={lead.id} className="widget-lead-row">
              <div className="widget-lead-main">
                <div className="widget-lead-title-row">
                  <span className="widget-lead-company">{lead.companyName}</span>
                  <span className={`widget-lead-chip ${leadStatusClass(lead.status)}`}>
                    {leadStatusLabels[lead.status]}
                  </span>
                </div>
                <div className="widget-lead-meta">
                  <span className={`widget-followup-chip ${followUp.tone}`}>
                    <CalendarDays className="h-3 w-3" />
                    {followUp.label}
                  </span>
                  {lead.phone && (
                    <span className="widget-lead-phone">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                  )}
                </div>
                <div className="widget-lead-action-text">{lead.nextAction || 'No next action set'}</div>
              </div>

              <div className="widget-lead-actions">
                <button
                  type="button"
                  onClick={() => copyPhone(lead)}
                  className="topbar-icon-btn widget-mini-icon-btn"
                  disabled={!lead.phone}
                  title={lead.phone ? 'Copy phone number' : 'No phone number'}
                  aria-label={lead.phone ? `Copy phone number for ${lead.companyName}` : `No phone number for ${lead.companyName}`}
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onLeadContacted(lead)}
                  className="topbar-icon-btn widget-mini-icon-btn widget-mini-icon-success"
                  title="Mark contacted"
                  aria-label={`Mark ${lead.companyName} contacted`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenLeads}
                  className="topbar-icon-btn widget-mini-icon-btn"
                  title="Open lead details"
                  aria-label={`Open ${lead.companyName} in Leads`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          )
        })}

        {priorityLeads.length === 0 && (
          <div className="utility-empty widget-lead-empty">No active follow-ups need attention</div>
        )}
      </div>
    </section>
  )
}

async function copyPhone(lead: Lead): Promise<void> {
  if (!lead.phone) return

  try {
    await navigator.clipboard.writeText(lead.phone)
    toast.success('Phone copied', lead.companyName)
  } catch (error: any) {
    toast.error('Copy failed', error.message || 'The phone number could not be copied.')
  }
}

function getPriorityLeads(leads: Lead[]): Lead[] {
  return leads
    .filter(lead => !lead.isArchived && !CLOSED_LEAD_STATUSES.includes(lead.status))
    .sort((a, b) => {
      const rank = getLeadPriorityRank(a) - getLeadPriorityRank(b)
      if (rank !== 0) return rank
      return getFollowUpTime(a) - getFollowUpTime(b)
    })
    .slice(0, 3)
}

function getLeadPriorityRank(lead: Lead): number {
  const followUp = getFollowUpDate(lead)
  if (!followUp) return lead.nextAction ? 3 : 4
  const today = getTodayStart()
  if (followUp.getTime() < today.getTime()) return 0
  if (followUp.getTime() === today.getTime()) return 1
  return 2
}

function getFollowUpMeta(lead: Lead): { label: string; tone: string } {
  const followUp = getFollowUpDate(lead)
  if (!followUp) return { label: 'No date', tone: 'neutral' }

  const today = getTodayStart()
  const dayDelta = Math.round((followUp.getTime() - today.getTime()) / 86400000)
  if (dayDelta < 0) return { label: `${Math.abs(dayDelta)}d overdue`, tone: 'warning' }
  if (dayDelta === 0) return { label: 'Today', tone: 'accent' }
  if (dayDelta === 1) return { label: 'Tomorrow', tone: 'neutral' }
  return { label: formatDate(lead.nextFollowUpAt), tone: 'neutral' }
}

function getFollowUpTime(lead: Lead): number {
  const followUp = getFollowUpDate(lead)
  return followUp ? followUp.getTime() : Number.MAX_SAFE_INTEGER
}

function getFollowUpDate(lead: Lead): Date | null {
  if (!lead.nextFollowUpAt) return null
  const date = new Date(lead.nextFollowUpAt)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function getTodayStart(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function makeCaptureTitle(note: string): string {
  const firstLine = note.split('\n').find(line => line.trim())?.trim() || note.trim()
  return firstLine.length > 82 ? `${firstLine.slice(0, 79).trim()}...` : firstLine
}

function leadStatusClass(status: LeadStatus): string {
  if (status === 'new') return 'widget-lead-chip-accent'
  if (status === 'discovery' || status === 'negotiation' || status === 'proposal_sent') return 'widget-lead-chip-warning'
  return 'widget-lead-chip-neutral'
}

function utilityStatusClass(status: WorkStatus): string {
  if (status === WorkStatus.Working) return 'utility-status-working'
  if (status === WorkStatus.OnBreak) return 'utility-status-break'
  return 'utility-status-off'
}

function utilityBadgeClass(status: WorkStatus): string {
  if (status === WorkStatus.Working) return 'utility-badge-working'
  if (status === WorkStatus.OnBreak) return 'utility-badge-break'
  return 'utility-badge-off'
}
