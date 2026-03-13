import { useState } from 'react'
import { useAppStore } from '../../store'
import { toast } from '../../components/toast/toastStore'
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react'

export default function ExportsPage() {
  const { clients, projects } = useAppStore()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [includeNotes, setIncludeNotes] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState('')

  const handleExport = async () => {
    setExporting(true)
    try {
      const payload = {
        startDate: new Date(startDate).toISOString(),
        endDate: (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d.toISOString() })(),
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        includeNotes
      }

      const filePath = format === 'pdf'
        ? await window.api.exportPDF(payload)
        : await window.api.exportCSV(payload)

      setLastExport(filePath as string)
      toast.success(`${format.toUpperCase()} exported`, 'File saved successfully.')
    } catch (e: any) {
      if (e.message !== 'Export cancelled') {
        toast.error('Export failed', e.message || 'Something went wrong.')
      }
    } finally {
      setExporting(false)
    }
  }

  const filteredProjects = clientId ? projects.filter(p => p.clientId === clientId) : projects

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Exports</h1>
        <p className="text-sm text-text-secondary mt-1">Generate professional timecards and data exports</p>
      </div>

      {/* Format Selection */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFormat('pdf')}
          className={`card-hover flex-1 flex items-center gap-3 cursor-pointer ${format === 'pdf' ? 'border-accent/50 bg-accent/5' : ''}`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format === 'pdf' ? 'bg-accent/15' : 'bg-surface-3'}`}>
            <FileText className={`w-5 h-5 ${format === 'pdf' ? 'text-accent' : 'text-text-tertiary'}`} />
          </div>
          <div>
            <div className="text-sm font-medium">PDF Timecard</div>
            <div className="text-2xs text-text-tertiary">Professional, print-ready format</div>
          </div>
        </button>
        <button
          onClick={() => setFormat('csv')}
          className={`card-hover flex-1 flex items-center gap-3 cursor-pointer ${format === 'csv' ? 'border-accent/50 bg-accent/5' : ''}`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format === 'csv' ? 'bg-accent/15' : 'bg-surface-3'}`}>
            <FileSpreadsheet className={`w-5 h-5 ${format === 'csv' ? 'text-accent' : 'text-text-tertiary'}`} />
          </div>
          <div>
            <div className="text-sm font-medium">CSV Export</div>
            <div className="text-2xs text-text-tertiary">Raw data for spreadsheets</div>
          </div>
        </button>
      </div>

      {/* Options */}
      <div className="card mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Start Date
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              End Date
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Filter by Client</label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); setProjectId('') }} className="select">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Filter by Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="select">
            <option value="">All projects</option>
            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {format === 'pdf' && (
          <div className="flex items-center gap-3">
            <label className="label mb-0">Include Notes</label>
            <button
              onClick={() => setIncludeNotes(!includeNotes)}
              className={`w-10 h-5 rounded-full transition-colors ${includeNotes ? 'bg-accent' : 'bg-surface-4'} relative`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${includeNotes ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn btn-primary btn-lg w-full justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        {exporting ? 'Generating...' : `Export ${format.toUpperCase()}`}
      </button>

      {lastExport && (
        <div className="mt-4 text-sm text-success flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          Saved to: <span className="text-text-secondary font-mono text-xs">{lastExport}</span>
        </div>
      )}
    </div>
  )
}
