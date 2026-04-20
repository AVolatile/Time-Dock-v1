import { getDatabase } from '../index'
import { generateId, nowISO } from '@shared/utils'
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Client,
  type ConvertLeadToClientResult,
  type Lead,
  type LeadPayload,
  type LeadSource,
  type LeadsFilter,
  type LeadStatus,
  type UpdateLeadPayload
} from '@shared/types'
import { clientRepo } from './entityRepos'

type LeadRow = {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  source: LeadSource
  status: LeadStatus
  estimated_value_cents: number
  service_type: string | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  next_action: string | null
  notes: string | null
  is_archived: number
  display_order: number
  converted_client_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

const leadStatusSet = new Set<string>(LEAD_STATUSES)
const leadSourceSet = new Set<string>(LEAD_SOURCES)

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    source: row.source,
    status: row.status,
    estimatedValueCents: row.estimated_value_cents,
    serviceType: row.service_type,
    lastContactAt: row.last_contact_at,
    nextFollowUpAt: row.next_follow_up_at,
    nextAction: row.next_action,
    notes: row.notes,
    isArchived: Boolean(row.is_archived),
    displayOrder: row.display_order,
    convertedClientId: row.converted_client_id,
    convertedAt: row.converted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function nullableText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function requiredText(value: string | undefined, message: string): string {
  const trimmed = value?.trim() || ''
  if (!trimmed) throw new Error(message)
  return trimmed
}

function normalizeDate(value: string | null | undefined, label: string): string | null {
  const trimmed = nullableText(value)
  if (!trimmed) return null
  if (Number.isNaN(new Date(trimmed).getTime())) {
    throw new Error(`${label} date is invalid.`)
  }
  return trimmed
}

function normalizeValue(value: number | undefined): number {
  if (value === undefined || value === null) return 0
  if (!Number.isFinite(value)) throw new Error('Estimated value must be a valid number.')
  return Math.max(0, Math.round(value))
}

function assertLeadStatus(status: LeadStatus | undefined): LeadStatus {
  if (!status || !leadStatusSet.has(status)) throw new Error('Choose a valid lead status.')
  return status
}

function assertLeadSource(source: LeadSource | undefined): LeadSource {
  if (!source || !leadSourceSet.has(source)) throw new Error('Choose a valid lead source.')
  return source
}

function makeClientCode(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const initials = words.map(word => word[0]).join('').slice(0, 5).toUpperCase()
  const fallback = companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
  return initials || fallback || 'LEAD'
}

export const leadRepo = {
  getAll(filter: LeadsFilter = {}): Lead[] {
    const db = getDatabase()
    const conditions: string[] = []
    const values: unknown[] = []

    if (!filter.includeArchived) {
      conditions.push('is_archived = 0')
    }

    if (filter.status) {
      conditions.push('status = ?')
      values.push(filter.status)
    }

    const search = filter.search?.trim()
    if (search) {
      const like = `%${search}%`
      conditions.push(`(
        company_name LIKE ?
        OR contact_name LIKE ?
        OR email LIKE ?
        OR phone LIKE ?
        OR website LIKE ?
        OR source LIKE ?
        OR service_type LIKE ?
        OR next_action LIKE ?
        OR notes LIKE ?
      )`)
      values.push(like, like, like, like, like, like, like, like, like)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return (db.prepare(`
      SELECT * FROM leads
      ${where}
      ORDER BY is_archived ASC, display_order ASC, updated_at DESC
    `).all(...values) as LeadRow[]).map(mapLead)
  },

  getById(id: string): Lead | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow | undefined
    return row ? mapLead(row) : null
  },

  create(data: LeadPayload): Lead {
    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    const displayOrder = data.displayOrder ?? ((db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 as nextOrder FROM leads').get() as { nextOrder: number }).nextOrder)

    db.prepare(`
      INSERT INTO leads (
        id,
        company_name,
        contact_name,
        email,
        phone,
        website,
        source,
        status,
        estimated_value_cents,
        service_type,
        last_contact_at,
        next_follow_up_at,
        next_action,
        notes,
        is_archived,
        display_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      requiredText(data.companyName, 'Company name is required.'),
      nullableText(data.contactName),
      nullableText(data.email),
      nullableText(data.phone),
      nullableText(data.website),
      assertLeadSource(data.source),
      assertLeadStatus(data.status),
      normalizeValue(data.estimatedValueCents),
      nullableText(data.serviceType),
      normalizeDate(data.lastContactAt, 'Last contact'),
      normalizeDate(data.nextFollowUpAt, 'Next follow-up'),
      nullableText(data.nextAction),
      nullableText(data.notes),
      data.isArchived ? 1 : 0,
      displayOrder,
      now,
      now
    )

    return this.getById(id)!
  },

  update(payload: UpdateLeadPayload): Lead {
    const db = getDatabase()
    const { id, ...data } = payload
    const existing = this.getById(id)
    if (!existing) throw new Error('Lead not found.')

    const sets: string[] = ['updated_at = ?']
    const values: unknown[] = [nowISO()]

    if (data.companyName !== undefined) {
      sets.push('company_name = ?')
      values.push(requiredText(data.companyName, 'Company name is required.'))
    }
    if (data.contactName !== undefined) { sets.push('contact_name = ?'); values.push(nullableText(data.contactName)) }
    if (data.email !== undefined) { sets.push('email = ?'); values.push(nullableText(data.email)) }
    if (data.phone !== undefined) { sets.push('phone = ?'); values.push(nullableText(data.phone)) }
    if (data.website !== undefined) { sets.push('website = ?'); values.push(nullableText(data.website)) }
    if (data.source !== undefined) { sets.push('source = ?'); values.push(assertLeadSource(data.source)) }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(assertLeadStatus(data.status)) }
    if (data.estimatedValueCents !== undefined) { sets.push('estimated_value_cents = ?'); values.push(normalizeValue(data.estimatedValueCents)) }
    if (data.serviceType !== undefined) { sets.push('service_type = ?'); values.push(nullableText(data.serviceType)) }
    if (data.lastContactAt !== undefined) { sets.push('last_contact_at = ?'); values.push(normalizeDate(data.lastContactAt, 'Last contact')) }
    if (data.nextFollowUpAt !== undefined) { sets.push('next_follow_up_at = ?'); values.push(normalizeDate(data.nextFollowUpAt, 'Next follow-up')) }
    if (data.nextAction !== undefined) { sets.push('next_action = ?'); values.push(nullableText(data.nextAction)) }
    if (data.notes !== undefined) { sets.push('notes = ?'); values.push(nullableText(data.notes)) }
    if (data.isArchived !== undefined) { sets.push('is_archived = ?'); values.push(data.isArchived ? 1 : 0) }
    if (data.displayOrder !== undefined) { sets.push('display_order = ?'); values.push(data.displayOrder) }

    values.push(id)
    db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)!
  },

  archive(id: string, archived = true): Lead {
    return this.update({ id, isArchived: archived })
  },

  convertToClient(id: string): ConvertLeadToClientResult {
    const db = getDatabase()
    const lead = this.getById(id)
    if (!lead) throw new Error('Lead not found.')
    if (lead.isArchived) throw new Error('Archived leads cannot be converted to clients.')

    if (lead.convertedClientId) {
      const existingClient = clientRepo.getById(lead.convertedClientId)
      if (existingClient) {
        return { lead, client: existingClient }
      }
    }

    if (lead.status !== 'won') {
      throw new Error('Mark the lead won before converting it to a client.')
    }

    const transaction = db.transaction(() => {
      const client = clientRepo.create({
        name: lead.companyName,
        code: makeClientCode(lead.companyName),
        active: true
      }) as Client
      this.update({
        id,
        status: 'won',
        isArchived: false
      })
      db.prepare('UPDATE leads SET converted_client_id = ?, converted_at = ?, updated_at = ? WHERE id = ?')
        .run(client.id, nowISO(), nowISO(), id)
      return { lead: this.getById(id)!, client }
    })

    return transaction()
  }
}
