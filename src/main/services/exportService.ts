import { app, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { jsPDF } from 'jspdf'
import autoTablePlugin from 'jspdf-autotable'
import { format as formatDate } from 'date-fns'
import { timeEntryRepo } from '../database/repositories/timeEntryRepo'
import { getDatabase } from '../database/index'
import { formatDurationHHMM, generateId, nowISO } from '@shared/utils'
import type { ExportPayload, ExportRecord, TimeEntryWithRelations } from '@shared/types'
import { ExportType } from '@shared/types'

const EXPORT_CANCELLED_ERROR = 'Export cancelled'
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const PAGE_MARGIN = 14
const autoTable = resolveAutoTable(autoTablePlugin)

type Rgb = [number, number, number]

const BRAND = {
  name: 'VOLATILE SOLUTIONS',
  product: 'TimeDock',
  colors: {
    white: [255, 255, 255] as Rgb,
    primary: [19, 84, 122] as Rgb,
    secondary: [26, 111, 160] as Rgb,
    primaryDark: [14, 47, 72] as Rgb,
    surface: [240, 248, 255] as Rgb,
    border: [227, 233, 242] as Rgb,
    text: [0, 0, 0] as Rgb,
    muted: [113, 114, 117] as Rgb,
    subtleText: [84, 94, 105] as Rgb
  }
}

interface ExportSummary {
  totalMinutes: number
  breakMinutes: number
  netMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
}

function resolveAutoTable(moduleExport: typeof autoTablePlugin): typeof autoTablePlugin {
  const candidate = moduleExport as unknown as { default?: typeof autoTablePlugin }
  if (typeof moduleExport === 'function') return moduleExport
  if (typeof candidate.default === 'function') return candidate.default
  throw new Error('PDF table renderer failed to load.')
}

export const exportService = {
  async exportPDF(payload: ExportPayload): Promise<string> {
    validateExportPayload(payload)

    const entries = getEntriesForExport(payload)
    const doc = buildInvoicePdf(payload, entries)
    const filePath = await promptForExportPath(ExportType.PDF)

    if (!filePath) throw new Error(EXPORT_CANCELLED_ERROR)

    const exportPath = ensureFileExtension(filePath, 'pdf')
    writeExportFile(exportPath, Buffer.from(doc.output('arraybuffer')))
    this.recordExport(ExportType.PDF, payload, exportPath)

    return exportPath
  },

  async exportCSV(payload: ExportPayload): Promise<string> {
    validateExportPayload(payload)

    const entries = getEntriesForExport(payload)
    const csv = buildCsvExport(entries)
    const filePath = await promptForExportPath(ExportType.CSV)

    if (!filePath) throw new Error(EXPORT_CANCELLED_ERROR)

    const exportPath = ensureFileExtension(filePath, 'csv')
    writeExportFile(exportPath, csv, 'utf8')
    this.recordExport(ExportType.CSV, payload, exportPath)

    return exportPath
  },

  recordExport(type: ExportType, payload: ExportPayload, filePath: string): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO export_records (id, type, dateRangeStart, dateRangeEnd, filtersJson, filePath, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      type,
      payload.startDate,
      payload.endDate,
      JSON.stringify({
        clientId: payload.clientId,
        projectId: payload.projectId,
        includeNotes: payload.includeNotes === true
      }),
      filePath,
      nowISO()
    )
  },

  getExportHistory(): ExportRecord[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM export_records ORDER BY createdAt DESC LIMIT 50').all() as ExportRecord[]
  }
}

function getEntriesForExport(payload: ExportPayload): TimeEntryWithRelations[] {
  return timeEntryRepo.getByDateRange({
    startDate: payload.startDate,
    endDate: payload.endDate,
    clientId: payload.clientId,
    projectId: payload.projectId
  })
}

function validateExportPayload(payload: ExportPayload): void {
  const start = new Date(payload.startDate)
  const end = new Date(payload.endDate)

  if (!payload.startDate || Number.isNaN(start.getTime())) {
    throw new Error('Choose a valid export start date.')
  }

  if (!payload.endDate || Number.isNaN(end.getTime())) {
    throw new Error('Choose a valid export end date.')
  }

  if (start.getTime() > end.getTime()) {
    throw new Error('The export end date must be on or after the start date.')
  }
}

async function promptForExportPath(type: ExportType): Promise<string | null> {
  const extension = type === ExportType.PDF ? 'pdf' : 'csv'
  const label = type === ExportType.PDF ? 'PDF' : 'CSV'
  const date = formatDate(new Date(), 'yyyy-MM-dd')
  const defaultName = type === ExportType.PDF
    ? `Volatile_Solutions_Invoice_Time_Report_${date}.${extension}`
    : `Volatile_Solutions_Time_Export_${date}.${extension}`

  const result = await dialog.showSaveDialog({
    title: `Export ${label}`,
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: `${label} Files`, extensions: [extension] }],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  })

  if (result.canceled || !result.filePath) return null
  return result.filePath
}

function ensureFileExtension(filePath: string, extension: 'pdf' | 'csv'): string {
  return filePath.toLowerCase().endsWith(`.${extension}`) ? filePath : `${filePath}.${extension}`
}

function writeExportFile(filePath: string, data: string | Buffer, encoding?: BufferEncoding): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, data, encoding)
  } catch (error: any) {
    throw new Error(`Unable to save export file: ${error.message || 'Unknown file system error'}`)
  }
}

export function buildCsvExport(entries: TimeEntryWithRelations[]): string {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Gross Hours',
    'Break Hours',
    'Net Hours',
    'Client',
    'Project',
    'Task',
    'Billable',
    'Note'
  ]

  const rows = entries
    .slice()
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map(entry => {
      const breakMinutes = getBreakMinutes(entry)
      const grossMinutes = entry.durationMinutes || 0
      const netMinutes = getNetMinutes(entry)

      return [
        entry.startedAt ? formatDate(new Date(entry.startedAt), 'yyyy-MM-dd') : '',
        entry.startedAt ? formatDate(new Date(entry.startedAt), 'HH:mm:ss') : '',
        entry.endedAt ? formatDate(new Date(entry.endedAt), 'HH:mm:ss') : '',
        minutesToDecimalHours(grossMinutes),
        minutesToDecimalHours(breakMinutes),
        minutesToDecimalHours(netMinutes),
        entry.client?.name || '',
        entry.project?.name || '',
        entry.task?.name || '',
        entry.billable ? 'Yes' : 'No',
        entry.note || ''
      ]
    })

  return `${String.fromCharCode(0xfeff)}${[headers, ...rows]
    .map(row => row.map(toCsvCell).join(','))
    .join('\r\n')}\r\n`
}

function toCsvCell(value: string | number): string {
  const text = String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/"/g, '""')

  return `"${text}"`
}

function minutesToDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}

export function buildInvoicePdf(payload: ExportPayload, entries: TimeEntryWithRelations[]): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const summary = summarizeEntries(entries)
  const includeNotes = payload.includeNotes === true
  const headColumns = getPdfColumns(includeNotes)
  const tableBody = buildPdfTableRows(entries, includeNotes, headColumns.length)

  drawPageBackground(doc)
  drawInvoiceHeader(doc, payload, entries)
  drawSummary(doc, summary)

  autoTable(doc, {
    startY: 93,
    head: [headColumns],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: { top: 2.2, right: 2.3, bottom: 2.2, left: 2.3 },
      textColor: BRAND.colors.text,
      lineColor: BRAND.colors.border,
      lineWidth: 0.15,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: BRAND.colors.primary,
      textColor: BRAND.colors.white,
      fontStyle: 'bold',
      fontSize: 7.3,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 251, 254]
    },
    columnStyles: getPdfColumnStyles(includeNotes, headColumns.length),
    margin: { top: 24, right: PAGE_MARGIN, bottom: 18, left: PAGE_MARGIN },
    willDrawPage: data => {
      if (data.pageNumber > 1) {
        drawPageBackground(doc)
        drawContinuationHeader(doc)
      }
    }
  })

  drawPageFooters(doc)

  return doc
}

function drawPageBackground(doc: jsPDF): void {
  setFill(doc, BRAND.colors.white)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
}

function drawContinuationHeader(doc: jsPDF): void {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setText(doc, BRAND.colors.primaryDark)
  doc.text(BRAND.name, PAGE_MARGIN, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, BRAND.colors.muted)
  doc.text('Invoice Time Report continued', PAGE_WIDTH - PAGE_MARGIN, 12, { align: 'right' })

  setDraw(doc, BRAND.colors.border)
  doc.setLineWidth(0.2)
  doc.line(PAGE_MARGIN, 17, PAGE_WIDTH - PAGE_MARGIN, 17)
}

function drawInvoiceHeader(doc: jsPDF, payload: ExportPayload, entries: TimeEntryWithRelations[]): void {
  const generatedAt = formatDate(new Date(), 'MMM d, yyyy h:mm a')
  const start = formatDate(new Date(payload.startDate), 'MMM d, yyyy')
  const end = formatDate(new Date(payload.endDate), 'MMM d, yyyy')
  const scope = getExportScope(entries, payload)

  setFill(doc, BRAND.colors.surface)
  doc.rect(0, 0, PAGE_WIDTH, 48, 'F')
  setDraw(doc, BRAND.colors.border)
  doc.line(0, 48, PAGE_WIDTH, 48)

  drawVolatileLogo(doc, PAGE_MARGIN, 11, 17)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setText(doc, BRAND.colors.text)
  doc.text('VOLATILE', 36, 17)
  setText(doc, BRAND.colors.subtleText)
  doc.text('SOLUTIONS', 68, 17)
  setDraw(doc, BRAND.colors.muted)
  doc.setLineWidth(0.35)
  doc.line(64.5, 10.5, 64.5, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, BRAND.colors.muted)
  doc.text(`${BRAND.product} invoice time report`, 36, 24)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setText(doc, BRAND.colors.primaryDark)
  doc.text('Invoice Time Report', PAGE_WIDTH - PAGE_MARGIN, 17, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, BRAND.colors.muted)
  doc.text(`Generated ${generatedAt}`, PAGE_WIDTH - PAGE_MARGIN, 24, { align: 'right' })

  doc.setFontSize(9)
  setText(doc, BRAND.colors.text)
  doc.text(`Period: ${start} - ${end}`, PAGE_MARGIN, 38)
  doc.text(`Client: ${scope.client}`, 85, 38)
  doc.text(`Project: ${scope.project}`, 85, 44)
  setText(doc, BRAND.colors.muted)
  doc.text(`Entries: ${entries.length}`, PAGE_MARGIN, 44)
}

function drawVolatileLogo(doc: jsPDF, x: number, y: number, size: number): void {
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = size / 2
  const points: Array<[number, number]> = []

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (30 + i * 60)
    points.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)])
  }

  setDraw(doc, BRAND.colors.secondary)
  doc.setLineWidth(1.6)

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    doc.line(current[0], current[1], next[0], next[1])
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  setText(doc, BRAND.colors.secondary)
  doc.text('V', centerX - 3.5, centerY + 3.2, { align: 'center' })
  setText(doc, BRAND.colors.primaryDark)
  doc.text('S', centerX + 3.1, centerY + 3.2, { align: 'center' })
}

function drawSummary(doc: jsPDF, summary: ExportSummary): void {
  const top = 58
  const gap = 4
  const cardWidth = (PAGE_WIDTH - PAGE_MARGIN * 2 - gap * 3) / 4

  drawMetricCard(doc, PAGE_MARGIN, top, cardWidth, 'Net Hours', formatDurationHHMM(summary.netMinutes))
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + gap), top, cardWidth, 'Billable', formatDurationHHMM(summary.billableMinutes))
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + gap) * 2, top, cardWidth, 'Non-Billable', formatDurationHHMM(summary.nonBillableMinutes))
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + gap) * 3, top, cardWidth, 'Break Time', formatDurationHHMM(summary.breakMinutes))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, BRAND.colors.muted)
  doc.text(`Gross tracked time: ${formatDurationHHMM(summary.totalMinutes)}`, PAGE_MARGIN, 86)
}

function drawMetricCard(doc: jsPDF, x: number, y: number, width: number, label: string, value: string): void {
  setFill(doc, BRAND.colors.white)
  setDraw(doc, BRAND.colors.border)
  doc.roundedRect(x, y, width, 20, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setText(doc, BRAND.colors.primary)
  doc.text(value, x + 4, y + 8.2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  setText(doc, BRAND.colors.muted)
  doc.text(label.toUpperCase(), x + 4, y + 15.3)
}

function getPdfColumns(includeNotes: boolean): string[] {
  const columns = ['Start', 'End', 'Break', 'Client', 'Project', 'Task', 'Billable']
  if (includeNotes) columns.push('Notes')
  columns.push('Hours')
  return columns
}

function getPdfColumnStyles(includeNotes: boolean, columnCount: number): Record<number, any> {
  if (includeNotes) {
    return {
      0: { cellWidth: 16 },
      1: { cellWidth: 16 },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
      6: { cellWidth: 13, halign: 'center' },
      7: { cellWidth: 40 },
      [columnCount - 1]: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }
    }
  }

  return {
    0: { cellWidth: 18 },
    1: { cellWidth: 18 },
    2: { cellWidth: 16, halign: 'right' },
    3: { cellWidth: 34 },
    4: { cellWidth: 38 },
    5: { cellWidth: 28 },
    6: { cellWidth: 14, halign: 'center' },
    [columnCount - 1]: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }
  }
}

function buildPdfTableRows(entries: TimeEntryWithRelations[], includeNotes: boolean, columnCount: number): any[] {
  if (entries.length === 0) {
    return [[{
      content: 'No time entries matched this export range.',
      colSpan: columnCount,
      styles: {
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 8,
        fillColor: BRAND.colors.surface,
        textColor: BRAND.colors.muted
      }
    }]]
  }

  const grouped = new Map<string, TimeEntryWithRelations[]>()

  for (const entry of entries) {
    const dateKey = formatDate(new Date(entry.startedAt), 'yyyy-MM-dd')
    const dayEntries = grouped.get(dateKey) || []
    dayEntries.push(entry)
    grouped.set(dateKey, dayEntries)
  }

  const rows: any[] = []

  for (const dateKey of [...grouped.keys()].sort()) {
    const dayEntries = grouped.get(dateKey)!
      .slice()
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    const dayTotal = dayEntries.reduce((sum, entry) => sum + getNetMinutes(entry), 0)

    rows.push([
      {
        content: formatDate(new Date(dateKey), 'EEEE, MMM d, yyyy'),
        colSpan: columnCount - 1,
        styles: {
          fontStyle: 'bold',
          fillColor: BRAND.colors.surface,
          textColor: BRAND.colors.primary,
          cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
        }
      },
      {
        content: formatDurationHHMM(dayTotal),
        styles: {
          fontStyle: 'bold',
          fillColor: BRAND.colors.surface,
          textColor: BRAND.colors.primary,
          halign: 'right'
        }
      }
    ])

    for (const entry of dayEntries) {
      const breakMinutes = getBreakMinutes(entry)
      const row: any[] = [
        entry.startedAt ? formatDate(new Date(entry.startedAt), 'h:mm a') : '-',
        entry.endedAt ? formatDate(new Date(entry.endedAt), 'h:mm a') : '-',
        breakMinutes > 0 ? formatDurationHHMM(breakMinutes) : '-',
        entry.client?.name || '-',
        entry.project?.name || '-',
        entry.task?.name || '-',
        entry.billable ? 'Yes' : 'No'
      ]

      if (includeNotes) row.push(entry.note || '')
      row.push(formatDurationHHMM(getNetMinutes(entry)))
      rows.push(row)
    }
  }

  return rows
}

function summarizeEntries(entries: TimeEntryWithRelations[]): ExportSummary {
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  const breakMinutes = entries.reduce((sum, entry) => sum + getBreakMinutes(entry), 0)
  const netMinutes = entries.reduce((sum, entry) => sum + getNetMinutes(entry), 0)
  const billableMinutes = entries
    .filter(entry => entry.billable)
    .reduce((sum, entry) => sum + getNetMinutes(entry), 0)
  const nonBillableMinutes = Math.max(0, netMinutes - billableMinutes)

  return {
    totalMinutes,
    breakMinutes,
    netMinutes,
    billableMinutes,
    nonBillableMinutes
  }
}

function getBreakMinutes(entry: TimeEntryWithRelations): number {
  return entry.breaks.reduce((sum, breakEntry) => sum + (breakEntry.durationMinutes || 0), 0)
}

function getNetMinutes(entry: TimeEntryWithRelations): number {
  return Math.max(0, (entry.durationMinutes || 0) - getBreakMinutes(entry))
}

function getExportScope(entries: TimeEntryWithRelations[], payload: ExportPayload): { client: string; project: string } {
  const client = payload.clientId
    ? entries.find(entry => entry.clientId === payload.clientId)?.client?.name || 'Selected client'
    : 'All clients'
  const project = payload.projectId
    ? entries.find(entry => entry.projectId === payload.projectId)?.project?.name || 'Selected project'
    : 'All projects'

  return { client, project }
}

function drawPageFooter(doc: jsPDF, pageLabel: string): void {
  setDraw(doc, BRAND.colors.border)
  doc.setLineWidth(0.2)
  doc.line(PAGE_MARGIN, PAGE_HEIGHT - 14, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, BRAND.colors.muted)
  doc.text(`${BRAND.name} - generated by ${BRAND.product}`, PAGE_MARGIN, PAGE_HEIGHT - 8)
  doc.text(pageLabel, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 8, { align: 'right' })
}

function drawPageFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawPageFooter(doc, `Page ${page} of ${pageCount}`)
  }
}

function setText(doc: jsPDF, color: Rgb): void {
  doc.setTextColor(color[0], color[1], color[2])
}

function setFill(doc: jsPDF, color: Rgb): void {
  doc.setFillColor(color[0], color[1], color[2])
}

function setDraw(doc: jsPDF, color: Rgb): void {
  doc.setDrawColor(color[0], color[1], color[2])
}
