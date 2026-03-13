import { app, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { timeEntryRepo } from '../database/repositories/timeEntryRepo'
import { getDatabase } from '../database/index'
import { generateId, nowISO, formatDurationHHMM } from '@shared/utils'
import type { ExportPayload, ExportRecord, TimeEntryWithRelations } from '@shared/types'
import { ExportType } from '@shared/types'
import { format as formatDate } from 'date-fns'

export const exportService = {
  async exportPDF(payload: ExportPayload): Promise<string> {
    const entries = timeEntryRepo.getByDateRange({
      startDate: payload.startDate,
      endDate: payload.endDate,
      clientId: payload.clientId,
      projectId: payload.projectId
    })

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // --- Header ---
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('TimeDock', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('Time Tracking Report', 14, 27)

    // Date range
    const startFormatted = formatDate(new Date(payload.startDate), 'MMM d, yyyy')
    const endFormatted = formatDate(new Date(payload.endDate), 'MMM d, yyyy')
    doc.text(`${startFormatted}  —  ${endFormatted}`, 14, 34)
    doc.text(`Generated: ${formatDate(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 40)

    // --- Summary ---
    const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes || 0), 0)
    const breakMinutes = entries.reduce((s, e) => s + e.breaks.reduce((bs, b) => bs + (b.durationMinutes || 0), 0), 0)
    const netMinutes = totalMinutes - breakMinutes
    const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => {
      const dur = e.durationMinutes || 0
      const brk = e.breaks.reduce((bs, b) => bs + (b.durationMinutes || 0), 0)
      return s + (dur - brk)
    }, 0)
    const nonBillableMinutes = netMinutes - billableMinutes

    doc.setFontSize(9)
    doc.setTextColor(60)

    const summaryY = 50
    doc.setFont('helvetica', 'bold')
    doc.text('SUMMARY', 14, summaryY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Hours: ${formatDurationHHMM(netMinutes)}`, 14, summaryY + 6)
    doc.text(`Billable: ${formatDurationHHMM(billableMinutes)}`, 14, summaryY + 11)
    doc.text(`Non-Billable: ${formatDurationHHMM(nonBillableMinutes)}`, 80, summaryY + 11)
    doc.text(`Break Time: ${formatDurationHHMM(breakMinutes)}`, 140, summaryY + 11)
    doc.text(`Entries: ${entries.length}`, 140, summaryY + 6)

    // --- Table ---
    // Group entries by date
    const grouped = new Map<string, TimeEntryWithRelations[]>()
    for (const entry of entries) {
      const dateKey = formatDate(new Date(entry.startedAt), 'yyyy-MM-dd')
      if (!grouped.has(dateKey)) grouped.set(dateKey, [])
      grouped.get(dateKey)!.push(entry)
    }

    const tableData: any[] = []
    const sortedDates = [...grouped.keys()].sort()

    for (const dateKey of sortedDates) {
      const dayEntries = grouped.get(dateKey)!
      // Day header row
      const dayTotal = dayEntries.reduce((s, e) => {
        const dur = e.durationMinutes || 0
        const brk = e.breaks.reduce((bs, b) => bs + (b.durationMinutes || 0), 0)
        return s + (dur - brk)
      }, 0)

      tableData.push([
        { content: formatDate(new Date(dateKey), 'EEE, MMM d'), colSpan: payload.includeNotes ? 8 : 7, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [40, 40, 40] } },
        { content: formatDurationHHMM(dayTotal), styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [40, 40, 40], halign: 'right' } }
      ])

      for (const entry of dayEntries) {
        const brk = entry.breaks.reduce((s, b) => s + (b.durationMinutes || 0), 0)
        const net = (entry.durationMinutes || 0) - brk
        const row: any[] = [
          entry.startedAt ? formatDate(new Date(entry.startedAt), 'h:mm a') : '—',
          entry.endedAt ? formatDate(new Date(entry.endedAt), 'h:mm a') : '—',
          brk > 0 ? formatDurationHHMM(brk) : '—',
          entry.client?.name || '—',
          entry.project?.name || '—',
          entry.task?.name || '—',
          entry.billable ? '●' : '○'
        ]
        if (payload.includeNotes) {
          row.push(entry.note || '')
        }
        row.push(formatDurationHHMM(net))
        tableData.push(row)
      }
    }

    const headColumns: string[] = ['Start', 'End', 'Break', 'Client', 'Project', 'Task', 'Bill']
    if (payload.includeNotes) headColumns.push('Notes')
    headColumns.push('Hours')

    autoTable(doc, {
      startY: summaryY + 18,
      head: [headColumns],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [50, 50, 50],
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [250, 250, 250],
        textColor: [80, 80, 80],
        fontStyle: 'bold',
        fontSize: 7
      },
      columnStyles: {
        [headColumns.length - 1]: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    })

    // Save file
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Timecard PDF',
      defaultPath: path.join(app.getPath('documents'), `TimeDock_Report_${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (!filePath) throw new Error('Export cancelled')

    const pdfBuffer = doc.output('arraybuffer')
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer))

    // Record export
    this.recordExport(ExportType.PDF, payload, filePath)

    return filePath
  },

  async exportCSV(payload: ExportPayload): Promise<string> {
    const entries = timeEntryRepo.getByDateRange({
      startDate: payload.startDate,
      endDate: payload.endDate,
      clientId: payload.clientId,
      projectId: payload.projectId
    })

    const headers = ['Date', 'Start', 'End', 'Duration (Hours)', 'Break (Hours)', 'Net (Hours)', 'Client', 'Project', 'Task', 'Billable', 'Note']
    const rows = entries.map(entry => {
      const brk = entry.breaks.reduce((s, b) => s + (b.durationMinutes || 0), 0)
      const dur = entry.durationMinutes || 0
      const net = dur - brk
      return [
        entry.startedAt ? formatDate(new Date(entry.startedAt), 'yyyy-MM-dd') : '',
        entry.startedAt ? formatDate(new Date(entry.startedAt), 'HH:mm:ss') : '',
        entry.endedAt ? formatDate(new Date(entry.endedAt), 'HH:mm:ss') : '',
        (dur / 60).toFixed(2),
        (brk / 60).toFixed(2),
        (net / 60).toFixed(2),
        entry.client?.name || '',
        entry.project?.name || '',
        entry.task?.name || '',
        entry.billable ? 'Yes' : 'No',
        (entry.note || '').replace(/"/g, '""')
      ].map(v => `"${v}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    const { filePath } = await dialog.showSaveDialog({
      title: 'Export CSV',
      defaultPath: path.join(app.getPath('documents'), `TimeDock_Export_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`),
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (!filePath) throw new Error('Export cancelled')

    fs.writeFileSync(filePath, csv, 'utf-8')
    this.recordExport(ExportType.CSV, payload, filePath)

    return filePath
  },

  recordExport(type: ExportType, payload: ExportPayload, filePath: string): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO export_records (id, type, dateRangeStart, dateRangeEnd, filtersJson, filePath, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(), type, payload.startDate, payload.endDate,
      JSON.stringify({ clientId: payload.clientId, projectId: payload.projectId }),
      filePath, nowISO()
    )
  },

  getExportHistory(): ExportRecord[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM export_records ORDER BY createdAt DESC LIMIT 50').all() as ExportRecord[]
  }
}
