import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { Calendar, CheckCircle2, Download, FileSpreadsheet, FileText, FolderDown } from 'lucide-react'
import { useAppStore } from '../../store'
import { toast } from '../../components/toast/toastStore'
import {
  Button,
  Field,
  PageHeader,
  Panel,
  Pill,
  SegmentedControl,
  SelectInput,
  SwitchControl,
  TextInput
} from '../../components/ui'

type ExportFormat = 'pdf' | 'csv'

export default function ExportsPage() {
  const { clients, projects, loadClients, loadProjects } = useAppStore()
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState('')

  useEffect(() => {
    loadClients()
    loadProjects()
  }, [])

  const filteredProjects = clientId ? projects.filter(project => project.clientId === clientId) : projects
  const rangeError = useMemo(() => {
    if (!startDate || !endDate) return 'Choose both start and end dates.'
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) return 'End date must be on or after the start date.'
    return ''
  }, [endDate, startDate])

  const handleExport = async () => {
    if (rangeError) return
    setExporting(true)
    try {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      const payload = {
        startDate: new Date(startDate).toISOString(),
        endDate: end.toISOString(),
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        includeNotes
      }

      const filePath = format === 'pdf'
        ? await window.api.exportPDF(payload)
        : await window.api.exportCSV(payload)

      setLastExport(filePath as string)
      toast.success(`${format.toUpperCase()} exported`, 'File saved successfully.')
    } catch (error: any) {
      if (error.message !== 'Export cancelled') {
        toast.error('Export failed', error.message || 'The export could not be generated.')
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Output"
        title="Exports"
        description="Generate invoice-ready PDFs or spreadsheet-ready CSV files from local time data."
        meta={<Pill tone="accent">Local file export</Pill>}
      />

      <div className="td-split">
        <div className="space-y-4">
          <Panel className="p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="td-section-title">Format</div>
                <p className="td-section-description">Choose the output that matches the next handoff.</p>
              </div>
              <SegmentedControl
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'pdf', label: 'PDF', icon: <FileText className="h-3.5 w-3.5" /> },
                  { value: 'csv', label: 'CSV', icon: <FileSpreadsheet className="h-3.5 w-3.5" /> }
                ]}
              />
            </div>
            <div className="td-grid-2">
              <FormatPanel
                active={format === 'pdf'}
                icon={<FileText className="h-5 w-5" />}
                title="PDF Timecard"
                detail="Client-friendly report with date range, summaries, and optional notes."
              />
              <FormatPanel
                active={format === 'csv'}
                icon={<FileSpreadsheet className="h-5 w-5" />}
                title="CSV Data"
                detail="Raw rows for spreadsheets, audits, and external billing workflows."
              />
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[color:var(--td-accent)]" />
              <div className="td-section-title">Export Range</div>
            </div>
            <div className="space-y-4">
              <div className="td-form-grid">
                <Field label="Start Date" error={!startDate ? rangeError : undefined}>
                  <TextInput type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
                </Field>
                <Field label="End Date" error={rangeError && startDate && endDate ? rangeError : undefined}>
                  <TextInput type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
                </Field>
              </div>

              <Field label="Client">
                <SelectInput value={clientId} onChange={event => { setClientId(event.target.value); setProjectId('') }}>
                  <option value="">All clients</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </SelectInput>
              </Field>

              <Field label="Project">
                <SelectInput value={projectId} onChange={event => setProjectId(event.target.value)}>
                  <option value="">All projects</option>
                  {filteredProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </SelectInput>
              </Field>

              {format === 'pdf' && (
                <Panel className="p-3">
                  <SwitchControl
                    checked={includeNotes}
                    onChange={setIncludeNotes}
                    label="Include notes"
                    description="Add entry notes to the PDF detail table when available."
                  />
                </Panel>
              )}
            </div>
          </Panel>

          <Button
            onClick={handleExport}
            disabled={exporting || Boolean(rangeError)}
            variant="primary"
            size="lg"
            className="w-full"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generating...' : `Export ${format.toUpperCase()}`}
          </Button>
        </div>

        <aside className="space-y-4">
          <Panel className="p-4">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--td-accent-soft)] text-[color:var(--td-accent)]">
              <FolderDown className="h-5 w-5" />
            </div>
            <div className="td-section-title">Export Scope</div>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Format" value={format.toUpperCase()} />
              <SummaryRow label="Client" value={clients.find(client => client.id === clientId)?.name || 'All clients'} />
              <SummaryRow label="Project" value={projects.find(project => project.id === projectId)?.name || 'All projects'} />
              <SummaryRow label="Notes" value={format === 'pdf' && includeNotes ? 'Included' : 'Not included'} />
            </div>
          </Panel>

          {lastExport && (
            <Panel className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[color:var(--td-success)]">
                <CheckCircle2 className="h-4 w-4" />
                Last Export Saved
              </div>
              <div className="break-all rounded-md bg-[color:var(--td-fill-soft)] p-3 text-[11px] text-[color:var(--td-text-secondary)]">
                {lastExport}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}

function FormatPanel({
  active,
  icon,
  title,
  detail
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <div className={`rounded-md border p-4 ${active ? 'border-[rgba(55,106,140,0.34)] bg-[color:var(--td-accent-soft)]' : 'border-[color:var(--td-line)] bg-[color:var(--td-fill-raised)]'}`}>
      <div className="mb-3 text-[color:var(--td-accent)]">{icon}</div>
      <div className="text-sm font-bold text-[color:var(--td-text)]">{title}</div>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--td-text-secondary)]">{detail}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--td-line)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[color:var(--td-text-tertiary)]">{label}</span>
      <span className="truncate text-right font-medium text-[color:var(--td-text)]">{value}</span>
    </div>
  )
}
