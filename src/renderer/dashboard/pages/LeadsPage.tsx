import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Handshake,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Target,
  User,
  XCircle
} from 'lucide-react'
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Lead,
  type LeadPayload,
  type LeadSource,
  type LeadStatus
} from '@shared/types'
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
  StatBlock,
  TableShell,
  TextArea,
  TextInput,
  Toolbar,
  cn
} from '../../components/ui'
import { formatFullDate } from '../../lib/viewUtils'

type LeadSortKey =
  | 'companyName'
  | 'status'
  | 'source'
  | 'estimatedValueCents'
  | 'lastContactAt'
  | 'nextFollowUpAt'
  | 'nextAction'
  | 'updatedAt'

const CLOSED_STATUSES: LeadStatus[] = ['won', 'lost']

const statusMeta: Record<LeadStatus, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  new: { label: 'New', tone: 'accent' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  discovery: { label: 'Discovery', tone: 'warning' },
  proposal_sent: { label: 'Proposal Sent', tone: 'accent' },
  negotiation: { label: 'Negotiation', tone: 'warning' },
  won: { label: 'Won', tone: 'success' },
  lost: { label: 'Lost', tone: 'danger' }
}

const sourceLabels: Record<LeadSource, string> = {
  cold_call: 'Cold Call',
  referral: 'Referral',
  inbound: 'Inbound',
  networking: 'Networking',
  repeat_client: 'Repeat Client',
  other: 'Other'
}

export default function LeadsPage() {
  const {
    leads,
    loadLeads,
    updateLead,
    deleteOrArchiveLead,
    convertLeadToClient
  } = useAppStore()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [sortKey, setSortKey] = useState<LeadSortKey>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadLeads({ includeArchived })
  }, [includeArchived])

  const metrics = useMemo(() => getLeadMetrics(leads), [leads])

  const filteredLeads = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    return [...leads]
      .filter(lead => {
        if (statusFilter !== 'all' && lead.status !== statusFilter) return false
        if (showOverdueOnly && !isLeadOverdue(lead)) return false
        if (!normalizedSearch) return true
        return [
          lead.companyName,
          lead.contactName,
          lead.email,
          lead.phone,
          lead.website,
          sourceLabels[lead.source],
          statusMeta[lead.status].label,
          lead.serviceType,
          lead.nextAction,
          lead.notes
        ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch)
      })
      .sort((a, b) => compareLeads(a, b, sortKey, sortDir))
  }, [leads, searchText, showOverdueOnly, sortDir, sortKey, statusFilter])

  const selectedLead = selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) || null : null
  const activeFilterCount = [
    searchText.trim(),
    statusFilter !== 'all' ? statusFilter : '',
    showOverdueOnly ? 'overdue' : '',
    includeArchived ? 'archived' : ''
  ].filter(Boolean).length

  useEffect(() => {
    if (selectedLeadId && !leads.some(lead => lead.id === selectedLeadId)) {
      setSelectedLeadId(null)
    }
  }, [leads, selectedLeadId])

  const toggleSort = (key: LeadSortKey) => {
    if (sortKey === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'companyName' ? 'asc' : 'desc')
  }

  const clearFilters = () => {
    setSearchText('')
    setStatusFilter('all')
    setShowOverdueOnly(false)
    setIncludeArchived(false)
  }

  const handleArchive = async (lead: Lead) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: lead.isArchived ? 'Restore lead' : 'Archive lead',
      message: lead.isArchived
        ? 'This returns the lead to your active pipeline.'
        : 'This removes the lead from the active pipeline without deleting local history.',
      confirmLabel: lead.isArchived ? 'Restore' : 'Archive',
      variant: lead.isArchived ? 'warning' : 'danger',
      onConfirm: async () => {
        try {
          await deleteOrArchiveLead(lead.id, !lead.isArchived)
          toast.success(lead.isArchived ? 'Lead restored' : 'Lead archived', lead.companyName)
        } catch (error: any) {
          toast.error('Lead update failed', error.message)
        }
      }
    })
  }

  const handleStatusUpdate = async (lead: Lead, status: LeadStatus) => {
    try {
      await updateLead({ id: lead.id, status })
      toast.success('Lead status updated', `${lead.companyName} marked ${statusMeta[status].label.toLowerCase()}.`)
    } catch (error: any) {
      toast.error('Status update failed', error.message)
    }
  }

  const handleConvert = async (lead: Lead) => {
    try {
      const result = await convertLeadToClient(lead.id)
      toast.success('Client created', `${result.client.name} is now available in Clients and Projects.`)
    } catch (error: any) {
      toast.error('Conversion failed', error.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Pipeline"
        title="Leads"
        description="Manage local business leads, follow-ups, next actions, and conversion into TimeDock clients."
        meta={
          <div className="flex flex-wrap gap-2">
            <Pill tone="neutral">{leads.length} loaded</Pill>
            <Pill tone={metrics.overdueCount > 0 ? 'warning' : 'neutral'}>{metrics.overdueCount} overdue</Pill>
            <Pill tone="accent">{formatCurrency(metrics.pipelineValueCents)} pipeline</Pill>
          </div>
        }
        actions={
          <Button onClick={() => setIsCreating(true)} variant="primary">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatBlock
          icon={<DollarSign className="h-4 w-4" />}
          label="Pipeline Value"
          value={formatCurrency(metrics.pipelineValueCents)}
          detail="Open active leads"
          tone="accent"
        />
        <StatBlock icon={<Target className="h-4 w-4" />} label="New" value={String(metrics.newCount)} detail="Needs first contact" tone="accent" />
        <StatBlock icon={<Phone className="h-4 w-4" />} label="Contacted" value={String(metrics.contactedCount)} detail="Warm conversations" />
        <StatBlock icon={<FileText className="h-4 w-4" />} label="Proposals" value={String(metrics.proposalCount)} detail="Sent or negotiating" tone="warning" />
        <StatBlock icon={<CheckCircle2 className="h-4 w-4" />} label="Won" value={String(metrics.wonCount)} detail="Ready to convert" tone="success" />
        <StatBlock
          icon={<CalendarDays className="h-4 w-4" />}
          label="Overdue"
          value={String(metrics.overdueCount)}
          detail="Follow-ups before today"
          tone={metrics.overdueCount > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <Panel className="mb-4 p-3">
        <Toolbar className="border-0 bg-transparent p-0">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--td-text-tertiary)]" />
            <TextInput
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder="Search company, contact, phone, notes..."
              className="pl-9"
            />
          </div>
          <SelectInput value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | LeadStatus)} className="w-44">
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map(status => (
              <option key={status} value={status}>{statusMeta[status].label}</option>
            ))}
          </SelectInput>
          <Button
            onClick={() => setShowOverdueOnly(value => !value)}
            size="sm"
            variant={showOverdueOnly ? 'warning' : 'secondary'}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Overdue
          </Button>
          <Button
            onClick={() => setIncludeArchived(value => !value)}
            size="sm"
            variant={includeArchived ? 'warning' : 'ghost'}
          >
            <Archive className="h-3.5 w-3.5" />
            Archived
          </Button>
          <Button onClick={clearFilters} size="sm" variant="ghost" disabled={activeFilterCount === 0}>
            <Filter className="h-3.5 w-3.5" />
            Clear
          </Button>
        </Toolbar>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <TableShell>
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <SortableTh label="Company" column="companyName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Source" column="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Est. Value" column="estimatedValueCents" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Last Contact" column="lastContactAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Next Follow-Up" column="nextFollowUpAt" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Next Action" column="nextAction" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const overdue = isLeadOverdue(lead)
                  const selected = selectedLeadId === lead.id
                  return (
                    <tr
                      key={lead.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedLeadId(lead.id)
                      }}
                      className={cn(
                        'td-table-row-clickable',
                        selected && 'td-table-row-selected',
                        overdue && 'td-lead-row-overdue',
                        lead.isArchived && 'opacity-60'
                      )}
                    >
                      <td>
                        <div className="font-semibold text-[color:var(--td-text)]">{lead.companyName}</div>
                        <div className="truncate text-[11px] text-[color:var(--td-text-tertiary)]">
                          {[lead.contactName, lead.serviceType].filter(Boolean).join(' / ') || 'No contact assigned'}
                        </div>
                      </td>
                      <td><LeadStatusPill status={lead.status} /></td>
                      <td>{sourceLabels[lead.source]}</td>
                      <td className="td-mono font-semibold text-[color:var(--td-text)]">{formatCurrency(lead.estimatedValueCents)}</td>
                      <td>{formatFullDate(lead.lastContactAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{formatFullDate(lead.nextFollowUpAt)}</span>
                          {overdue && <Pill tone="warning">Overdue</Pill>}
                        </div>
                      </td>
                      <td className="max-w-[260px] truncate">{lead.nextAction || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredLeads.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={<Handshake className="h-6 w-6" />}
                title={leads.length === 0 ? 'No leads yet' : 'No leads match this view'}
                description={leads.length === 0
                  ? 'Create your first lead to replace the spreadsheet with a local follow-up pipeline.'
                  : 'Clear filters or adjust the search to see the rest of your pipeline.'}
                action={<Button onClick={() => setIsCreating(true)} variant="primary"><Plus className="h-4 w-4" /> New Lead</Button>}
              />
            </div>
          )}
        </TableShell>

        <LeadDetailPanel
          lead={selectedLead}
          onArchive={handleArchive}
          onConvert={handleConvert}
          onEdit={setEditingLead}
          onStatusUpdate={handleStatusUpdate}
          onFollowUpUpdate={async (lead, date) => {
            try {
              await updateLead({ id: lead.id, nextFollowUpAt: fromDateInputValue(date) })
              toast.success('Follow-up updated', lead.companyName)
            } catch (error: any) {
              toast.error('Follow-up update failed', error.message)
            }
          }}
        />
      </div>

      {(isCreating || editingLead) && (
        <LeadModal
          lead={editingLead || undefined}
          onClose={() => {
            setIsCreating(false)
            setEditingLead(null)
            loadLeads({ includeArchived })
          }}
        />
      )}
    </div>
  )
}

function LeadDetailPanel({
  lead,
  onArchive,
  onConvert,
  onEdit,
  onFollowUpUpdate,
  onStatusUpdate
}: {
  lead: Lead | null
  onArchive: (lead: Lead) => Promise<void>
  onConvert: (lead: Lead) => Promise<void>
  onEdit: (lead: Lead) => void
  onFollowUpUpdate: (lead: Lead, date: string) => Promise<void>
  onStatusUpdate: (lead: Lead, status: LeadStatus) => Promise<void>
}) {
  const [followUpDraft, setFollowUpDraft] = useState('')

  useEffect(() => {
    setFollowUpDraft(toDateInputValue(lead?.nextFollowUpAt))
  }, [lead?.id, lead?.nextFollowUpAt])

  if (!lead) {
    return (
      <Panel className="p-4 xl:sticky xl:top-4">
        <EmptyState
          compact
          icon={<Target className="h-5 w-5" />}
          title="Select a lead"
          description="Open a row to review contact details, next action, notes, and conversion actions."
        />
      </Panel>
    )
  }

  const overdue = isLeadOverdue(lead)
  const canConvert = lead.status === 'won' && !lead.convertedClientId

  return (
    <Panel className="overflow-hidden xl:sticky xl:top-4">
      <div className="border-b border-[color:var(--td-line)] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <LeadStatusPill status={lead.status} />
              <Pill tone={overdue ? 'warning' : 'neutral'}>{overdue ? 'Follow-up overdue' : sourceLabels[lead.source]}</Pill>
              {lead.isArchived && <Pill tone="danger">Archived</Pill>}
            </div>
            <h2 className="m-0 truncate text-base font-bold text-[color:var(--td-text)]">{lead.companyName}</h2>
            <div className="mt-1 text-xs text-[color:var(--td-text-tertiary)]">{formatCurrency(lead.estimatedValueCents)} estimated value</div>
          </div>
          <IconButton onClick={() => onEdit(lead)} aria-label="Edit lead">
            <Edit3 className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onStatusUpdate(lead, 'won')} size="sm" variant={lead.status === 'won' ? 'success' : 'secondary'}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Won
          </Button>
          <Button onClick={() => onStatusUpdate(lead, 'lost')} size="sm" variant={lead.status === 'lost' ? 'danger' : 'secondary'}>
            <XCircle className="h-3.5 w-3.5" />
            Mark Lost
          </Button>
          <Button onClick={() => onArchive(lead)} size="sm" variant={lead.isArchived ? 'warning' : 'danger'}>
            {lead.isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {lead.isArchived ? 'Restore' : 'Archive'}
          </Button>
          <Button onClick={() => onConvert(lead)} size="sm" variant="primary" disabled={!canConvert}>
            <Handshake className="h-3.5 w-3.5" />
            Convert
          </Button>
        </div>
        {lead.convertedClientId && (
          <div className="mt-3 rounded-md border border-[color:var(--td-line)] bg-[color:var(--td-success-soft)] p-2 text-xs font-semibold text-[color:var(--td-success)]">
            Converted to a TimeDock client on {formatFullDate(lead.convertedAt)}.
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-md border border-[color:var(--td-line)] bg-[color:var(--td-fill-soft)] p-3">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase text-[color:var(--td-text-tertiary)]">
            <Target className="h-3.5 w-3.5" />
            Next Action
          </div>
          <div className="text-sm font-semibold text-[color:var(--td-text)]">{lead.nextAction || 'No next action set'}</div>
        </div>

        <div className="space-y-2">
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Contact" value={lead.contactName || 'Unassigned'} />
          <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email || '-'} />
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone || '-'} />
          <InfoRow icon={<ExternalLink className="h-3.5 w-3.5" />} label="Website" value={lead.website || '-'} />
          <InfoRow label="Service" value={lead.serviceType || '-'} />
          <InfoRow label="Last Contact" value={formatFullDate(lead.lastContactAt)} />
          <InfoRow label="Created" value={formatFullDate(lead.createdAt)} />
        </div>

        <div className="rounded-md border border-[color:var(--td-line)] p-3">
          <Field label="Next Follow-Up">
            <div className="flex gap-2">
              <TextInput type="date" value={followUpDraft} onChange={event => setFollowUpDraft(event.target.value)} />
              <Button onClick={() => onFollowUpUpdate(lead, followUpDraft)} size="sm" variant="secondary">
                Save
              </Button>
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-[color:var(--td-text-tertiary)]">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </div>
          <div className="min-h-[84px] whitespace-pre-wrap rounded-md border border-[color:var(--td-line)] bg-[color:var(--td-fill-soft)] p-3 text-xs leading-relaxed text-[color:var(--td-text-secondary)]">
            {lead.notes || 'No notes captured yet.'}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function LeadModal({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const { createLead, updateLead } = useAppStore()
  const isEdit = Boolean(lead)
  const [companyName, setCompanyName] = useState(lead?.companyName || '')
  const [contactName, setContactName] = useState(lead?.contactName || '')
  const [email, setEmail] = useState(lead?.email || '')
  const [phone, setPhone] = useState(lead?.phone || '')
  const [website, setWebsite] = useState(lead?.website || '')
  const [source, setSource] = useState<LeadSource>(lead?.source || 'cold_call')
  const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new')
  const [estimatedValue, setEstimatedValue] = useState(lead ? centsToCurrencyInput(lead.estimatedValueCents) : '')
  const [serviceType, setServiceType] = useState(lead?.serviceType || '')
  const [lastContactAt, setLastContactAt] = useState(toDateInputValue(lead?.lastContactAt))
  const [nextFollowUpAt, setNextFollowUpAt] = useState(toDateInputValue(lead?.nextFollowUpAt))
  const [nextAction, setNextAction] = useState(lead?.nextAction || '')
  const [notes, setNotes] = useState(lead?.notes || '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const next: Record<string, string> = {}
    if (!companyName.trim()) next.companyName = 'Company name is required.'
    if (!source) next.source = 'Choose where this lead came from.'
    if (!status) next.status = 'Choose the current pipeline status.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address or leave it blank.'
    }
    if (website.trim() && !isValidWebsite(website.trim())) {
      next.website = 'Enter a valid website URL or leave it blank.'
    }
    if (parseCurrencyToCents(estimatedValue) === null) {
      next.estimatedValue = 'Estimated value must be a valid dollar amount.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const payload: LeadPayload = {
      companyName: companyName.trim(),
      contactName: nullish(contactName),
      email: nullish(email),
      phone: nullish(phone),
      website: normalizeWebsite(website),
      source,
      status,
      estimatedValueCents: parseCurrencyToCents(estimatedValue) || 0,
      serviceType: nullish(serviceType),
      lastContactAt: fromDateInputValue(lastContactAt),
      nextFollowUpAt: fromDateInputValue(nextFollowUpAt),
      nextAction: nullish(nextAction),
      notes: nullish(notes),
      isArchived: lead?.isArchived || false
    }

    try {
      if (isEdit) {
        await updateLead({ id: lead!.id, ...payload })
        toast.success('Lead updated', payload.companyName)
      } else {
        await createLead(payload)
        toast.success('Lead created', payload.companyName)
      }
      onClose()
    } catch (error: any) {
      toast.error('Save failed', error.message || 'The lead could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={isEdit ? 'Edit Lead' : 'New Lead'}
      description="Capture the useful sales context without turning TimeDock into a bloated CRM."
      onClose={onClose}
      maxWidth="xl"
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : isEdit ? 'Save Lead' : 'Create Lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="td-form-grid">
          <Field label="Company" error={errors.companyName}>
            <TextInput autoFocus value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Northstar Studio" />
          </Field>
          <Field label="Contact Name">
            <TextInput value={contactName} onChange={event => setContactName(event.target.value)} placeholder="Jordan Lee" />
          </Field>
        </div>

        <div className="td-form-grid">
          <Field label="Email" error={errors.email}>
            <TextInput value={email} onChange={event => setEmail(event.target.value)} placeholder="jordan@example.com" />
          </Field>
          <Field label="Phone">
            <TextInput value={phone} onChange={event => setPhone(event.target.value)} placeholder="(555) 123-4567" />
          </Field>
        </div>

        <div className="td-form-grid">
          <Field label="Website" error={errors.website}>
            <TextInput value={website} onChange={event => setWebsite(event.target.value)} placeholder="example.com" />
          </Field>
          <Field label="Service Type">
            <TextInput value={serviceType} onChange={event => setServiceType(event.target.value)} placeholder="Website, AI automation, consulting..." />
          </Field>
        </div>

        <div className="td-form-grid">
          <Field label="Source" error={errors.source}>
            <SelectInput value={source} onChange={event => setSource(event.target.value as LeadSource)}>
              {LEAD_SOURCES.map(item => <option key={item} value={item}>{sourceLabels[item]}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status" error={errors.status}>
            <SelectInput value={status} onChange={event => setStatus(event.target.value as LeadStatus)}>
              {LEAD_STATUSES.map(item => <option key={item} value={item}>{statusMeta[item].label}</option>)}
            </SelectInput>
          </Field>
        </div>

        <div className="td-form-grid">
          <Field label="Estimated Value" error={errors.estimatedValue} hint="Use dollars. TimeDock stores the value as cents locally.">
            <TextInput value={estimatedValue} onChange={event => setEstimatedValue(event.target.value)} placeholder="2500" inputMode="decimal" />
          </Field>
          <Field label="Last Contact">
            <TextInput type="date" value={lastContactAt} onChange={event => setLastContactAt(event.target.value)} />
          </Field>
        </div>

        <div className="td-form-grid">
          <Field label="Next Follow-Up">
            <TextInput type="date" value={nextFollowUpAt} onChange={event => setNextFollowUpAt(event.target.value)} />
          </Field>
          <Field label="Next Action">
            <TextInput value={nextAction} onChange={event => setNextAction(event.target.value)} placeholder="Call owner, send proposal, follow up..." />
          </Field>
        </div>

        <Field label="Notes">
          <TextArea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Decision maker, pain points, budget, timing, objections..." />
        </Field>
      </div>
    </Dialog>
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
  column: LeadSortKey
  sortKey: LeadSortKey
  sortDir: 'asc' | 'desc'
  onSort: (column: LeadSortKey) => void
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

function LeadStatusPill({ status }: { status: LeadStatus }) {
  const meta = statusMeta[status]
  return <Pill tone={meta.tone}>{meta.label}</Pill>
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--td-line)] pb-2 last:border-b-0 last:pb-0">
      <span className="flex min-w-0 items-center gap-2 text-[12px] text-[color:var(--td-text-tertiary)]">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[12px] font-medium text-[color:var(--td-text)]">{value}</span>
    </div>
  )
}

function getLeadMetrics(leads: Lead[]) {
  const activeLeads = leads.filter(lead => !lead.isArchived)
  return {
    pipelineValueCents: activeLeads
      .filter(lead => !CLOSED_STATUSES.includes(lead.status))
      .reduce((sum, lead) => sum + lead.estimatedValueCents, 0),
    newCount: activeLeads.filter(lead => lead.status === 'new').length,
    contactedCount: activeLeads.filter(lead => lead.status === 'contacted').length,
    proposalCount: activeLeads.filter(lead => lead.status === 'proposal_sent' || lead.status === 'negotiation').length,
    wonCount: activeLeads.filter(lead => lead.status === 'won').length,
    overdueCount: activeLeads.filter(isLeadOverdue).length
  }
}

function compareLeads(a: Lead, b: Lead, key: LeadSortKey, direction: 'asc' | 'desc'): number {
  const valueA = getSortValue(a, key)
  const valueB = getSortValue(b, key)
  const compare = valueA < valueB ? -1 : valueA > valueB ? 1 : 0
  return direction === 'asc' ? compare : -compare
}

function getSortValue(lead: Lead, key: LeadSortKey): string | number {
  if (key === 'status') return statusMeta[lead.status].label
  if (key === 'source') return sourceLabels[lead.source]
  if (key === 'nextAction') return lead.nextAction || ''
  return lead[key] || ''
}

function isLeadOverdue(lead: Lead): boolean {
  if (lead.isArchived || CLOSED_STATUSES.includes(lead.status) || !lead.nextFollowUpAt) return false
  const followUpDate = new Date(lead.nextFollowUpAt)
  if (Number.isNaN(followUpDate.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return followUpDate.getTime() < today.getTime()
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat([], {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100)
}

function centsToCurrencyInput(cents: number): string {
  if (!cents) return ''
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)
}

function parseCurrencyToCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/g, '')
  if (!normalized) return 0
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toISOString()
}

function nullish(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isValidWebsite(value: string): boolean {
  try {
    const normalized = normalizeWebsite(value)
    if (!normalized) return true
    const url = new URL(normalized)
    return Boolean(url.hostname.includes('.'))
  } catch {
    return false
  }
}
