import { getDatabase } from '../index'
import { generateId, nowISO } from '@shared/utils'
import type {
  KanbanBoard,
  KanbanBoardWithSections,
  KanbanCard,
  KanbanCardPayload,
  KanbanContentBlock,
  KanbanSection,
  KanbanSectionPayload,
  KanbanSectionWithCards,
  MoveKanbanCardPayload,
  ReorderKanbanCardsPayload,
  ReorderKanbanSectionsPayload,
  UpdateKanbanCardPayload,
  UpdateKanbanSectionPayload
} from '@shared/types'

const DEFAULT_BOARD_ID = 'default-kanban-board'
const POSITION_STEP = 1000
const DEFAULT_SECTION_COLORS = ['#376a8c', '#ad6a12', '#1f7a4e']
const VALID_BLOCK_TYPES = new Set(['text', 'image', 'code', 'link', 'video_link'])

type CardRow = Omit<KanbanCard, 'labels' | 'contentBlocks'> & { labelsJson: string }
type BlockRow = Record<string, any>

export const kanbanRepo = {
  getBoard(boardId = DEFAULT_BOARD_ID): KanbanBoardWithSections {
    ensureBoard(boardId)

    const db = getDatabase()
    const board = db.prepare('SELECT * FROM kanban_boards WHERE id = ?').get(boardId) as KanbanBoard
    const sections = db.prepare('SELECT * FROM kanban_sections WHERE boardId = ? ORDER BY position ASC, createdAt ASC').all(boardId) as KanbanSection[]
    const cards = db.prepare('SELECT * FROM kanban_cards WHERE boardId = ? ORDER BY position ASC, createdAt ASC').all(boardId) as CardRow[]
    const cardIds = cards.map(card => card.id)
    const blocksByCardId = new Map<string, KanbanContentBlock[]>()

    if (cardIds.length > 0) {
      const placeholders = cardIds.map(() => '?').join(',')
      const blockRows = db.prepare(`
        SELECT * FROM kanban_card_blocks
        WHERE cardId IN (${placeholders})
        ORDER BY position ASC, createdAt ASC
      `).all(...cardIds) as BlockRow[]

      for (const row of blockRows) {
        const current = blocksByCardId.get(row.cardId) || []
        current.push(mapBlock(row))
        blocksByCardId.set(row.cardId, current)
      }
    }

    const cardsBySectionId = new Map<string, KanbanCard[]>()
    for (const card of cards) {
      const current = cardsBySectionId.get(card.sectionId) || []
      current.push({
        ...card,
        labels: parseLabels(card.labelsJson),
        contentBlocks: blocksByCardId.get(card.id) || []
      })
      cardsBySectionId.set(card.sectionId, current)
    }

    return {
      ...board,
      sections: sections.map<KanbanSectionWithCards>(section => ({
        ...section,
        cards: cardsBySectionId.get(section.id) || []
      }))
    }
  },

  createSection(payload: KanbanSectionPayload): KanbanSection {
    const boardId = payload.boardId || DEFAULT_BOARD_ID
    ensureBoard(boardId)
    const db = getDatabase()
    const title = normalizeTitle(payload.title, 'Section title is required.')
    const now = nowISO()
    const id = generateId()
    const position = getNextSectionPosition(boardId)

    db.prepare(`
      INSERT INTO kanban_sections (id, boardId, title, color, position, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, boardId, title, payload.color || '#376a8c', position, now, now)

    return db.prepare('SELECT * FROM kanban_sections WHERE id = ?').get(id) as KanbanSection
  },

  updateSection(payload: UpdateKanbanSectionPayload): KanbanSection {
    const db = getDatabase()
    const existing = getSectionOrThrow(payload.id)
    const title = payload.title !== undefined ? normalizeTitle(payload.title, 'Section title is required.') : existing.title
    const color = payload.color || existing.color
    const now = nowISO()

    db.prepare(`
      UPDATE kanban_sections
      SET title = ?, color = ?, updatedAt = ?
      WHERE id = ?
    `).run(title, color, now, payload.id)

    return getSectionOrThrow(payload.id)
  },

  deleteSection(id: string): void {
    const db = getDatabase()
    const section = getSectionOrThrow(id)
    db.prepare('DELETE FROM kanban_sections WHERE id = ?').run(id)
    normalizeSectionPositions(section.boardId)
  },

  reorderSections(payload: ReorderKanbanSectionsPayload): void {
    const boardId = payload.boardId || DEFAULT_BOARD_ID
    ensureBoard(boardId)
    const db = getDatabase()
    const now = nowISO()

    const update = db.prepare('UPDATE kanban_sections SET position = ?, updatedAt = ? WHERE id = ? AND boardId = ?')
    const tx = db.transaction((orderedSectionIds: string[]) => {
      orderedSectionIds.forEach((id, index) => update.run((index + 1) * POSITION_STEP, now, id, boardId))
    })
    tx(payload.orderedSectionIds)
  },

  createCard(payload: KanbanCardPayload): KanbanCard {
    const boardId = payload.boardId || DEFAULT_BOARD_ID
    const section = getSectionOrThrow(payload.sectionId)
    if (section.boardId !== boardId) throw new Error('Card section does not belong to this board.')

    const db = getDatabase()
    const id = generateId()
    const now = nowISO()
    const title = normalizeTitle(payload.title, 'Card title is required.')
    const position = getNextCardPosition(payload.sectionId)
    const blocks = sanitizeBlocks(payload.contentBlocks || [])

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO kanban_cards (id, boardId, sectionId, title, description, accentColor, labelsJson, position, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        boardId,
        payload.sectionId,
        title,
        payload.description?.trim() || '',
        payload.accentColor || section.color,
        JSON.stringify(normalizeLabels(payload.labels || [])),
        position,
        now,
        now
      )
      replaceBlocks(id, blocks)
    })

    tx()
    return getCardOrThrow(id)
  },

  updateCard(payload: UpdateKanbanCardPayload): KanbanCard {
    const db = getDatabase()
    const existing = getCardOrThrow(payload.id)
    const targetSection = payload.sectionId ? getSectionOrThrow(payload.sectionId) : null
    const now = nowISO()

    if (targetSection && targetSection.boardId !== existing.boardId) {
      throw new Error('Card cannot move to a section on another board.')
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE kanban_cards
        SET sectionId = ?, title = ?, description = ?, accentColor = ?, labelsJson = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        payload.sectionId || existing.sectionId,
        payload.title !== undefined ? normalizeTitle(payload.title, 'Card title is required.') : existing.title,
        payload.description !== undefined ? payload.description.trim() : existing.description,
        payload.accentColor || existing.accentColor,
        JSON.stringify(payload.labels ? normalizeLabels(payload.labels) : existing.labels),
        now,
        payload.id
      )

      if (payload.contentBlocks) replaceBlocks(payload.id, sanitizeBlocks(payload.contentBlocks))
    })

    tx()
    return getCardOrThrow(payload.id)
  },

  deleteCard(id: string): void {
    const db = getDatabase()
    const existing = getCardOrThrow(id)
    db.prepare('DELETE FROM kanban_cards WHERE id = ?').run(id)
    normalizeCardPositions(existing.sectionId)
  },

  moveCard(payload: MoveKanbanCardPayload): void {
    const db = getDatabase()
    const existing = getCardOrThrow(payload.cardId)
    const targetSection = getSectionOrThrow(payload.targetSectionId)
    if (targetSection.boardId !== existing.boardId) throw new Error('Card cannot move to a section on another board.')

    db.prepare(`
      UPDATE kanban_cards
      SET sectionId = ?, position = ?, updatedAt = ?
      WHERE id = ?
    `).run(payload.targetSectionId, payload.targetPosition, nowISO(), payload.cardId)

    normalizeCardPositions(existing.sectionId)
    if (existing.sectionId !== payload.targetSectionId) normalizeCardPositions(payload.targetSectionId)
  },

  reorderCards(payload: ReorderKanbanCardsPayload): void {
    const section = getSectionOrThrow(payload.sectionId)
    const db = getDatabase()
    const now = nowISO()
    const update = db.prepare(`
      UPDATE kanban_cards
      SET sectionId = ?, position = ?, updatedAt = ?
      WHERE id = ? AND boardId = ?
    `)
    const tx = db.transaction((orderedCardIds: string[]) => {
      orderedCardIds.forEach((id, index) => update.run(section.id, (index + 1) * POSITION_STEP, now, id, section.boardId))
    })
    tx(payload.orderedCardIds)
  }
}

function ensureBoard(boardId: string): void {
  const db = getDatabase()
  const now = nowISO()

  db.prepare(`
    INSERT OR IGNORE INTO kanban_boards (id, title, createdAt, updatedAt)
    VALUES (?, ?, ?, ?)
  `).run(boardId, 'KanBan Notes', now, now)

  const count = (db.prepare('SELECT COUNT(*) as count FROM kanban_sections WHERE boardId = ?').get(boardId) as any).count as number
  if (count > 0) return

  const defaults = [
    { title: 'Backlog', color: DEFAULT_SECTION_COLORS[0] },
    { title: 'In Progress', color: DEFAULT_SECTION_COLORS[1] },
    { title: 'Done', color: DEFAULT_SECTION_COLORS[2] }
  ]

  const insert = db.prepare(`
    INSERT INTO kanban_sections (id, boardId, title, color, position, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    defaults.forEach((section, index) => {
      insert.run(generateId(), boardId, section.title, section.color, (index + 1) * POSITION_STEP, now, now)
    })
  })
  tx()
}

function getSectionOrThrow(id: string): KanbanSection {
  const section = getDatabase().prepare('SELECT * FROM kanban_sections WHERE id = ?').get(id) as KanbanSection | undefined
  if (!section) throw new Error('KanBan section was not found.')
  return section
}

function getCardOrThrow(id: string): KanbanCard {
  const row = getDatabase().prepare('SELECT * FROM kanban_cards WHERE id = ?').get(id) as CardRow | undefined
  if (!row) throw new Error('KanBan card was not found.')

  const blockRows = getDatabase()
    .prepare('SELECT * FROM kanban_card_blocks WHERE cardId = ? ORDER BY position ASC, createdAt ASC')
    .all(id) as BlockRow[]

  return {
    ...row,
    labels: parseLabels(row.labelsJson),
    contentBlocks: blockRows.map(mapBlock)
  }
}

function getNextSectionPosition(boardId: string): number {
  const result = getDatabase()
    .prepare('SELECT COALESCE(MAX(position), 0) + ? as nextPosition FROM kanban_sections WHERE boardId = ?')
    .get(POSITION_STEP, boardId) as { nextPosition: number }
  return result.nextPosition
}

function getNextCardPosition(sectionId: string): number {
  const result = getDatabase()
    .prepare('SELECT COALESCE(MAX(position), 0) + ? as nextPosition FROM kanban_cards WHERE sectionId = ?')
    .get(POSITION_STEP, sectionId) as { nextPosition: number }
  return result.nextPosition
}

function normalizeSectionPositions(boardId: string): void {
  const sections = getDatabase().prepare('SELECT id FROM kanban_sections WHERE boardId = ? ORDER BY position ASC, createdAt ASC').all(boardId) as { id: string }[]
  kanbanRepo.reorderSections({ boardId, orderedSectionIds: sections.map(section => section.id) })
}

function normalizeCardPositions(sectionId: string): void {
  const cards = getDatabase().prepare('SELECT id FROM kanban_cards WHERE sectionId = ? ORDER BY position ASC, createdAt ASC').all(sectionId) as { id: string }[]
  kanbanRepo.reorderCards({ sectionId, orderedCardIds: cards.map(card => card.id) })
}

function replaceBlocks(cardId: string, blocks: KanbanContentBlock[]): void {
  const db = getDatabase()
  const now = nowISO()
  db.prepare('DELETE FROM kanban_card_blocks WHERE cardId = ?').run(cardId)

  const insert = db.prepare(`
    INSERT INTO kanban_card_blocks (
      id, cardId, type, position, content, src, alt, caption, language, url, title, description, platform, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  blocks.forEach((block, index) => {
    insert.run(
      block.id || generateId(),
      cardId,
      block.type,
      (index + 1) * POSITION_STEP,
      block.type === 'text' || block.type === 'code' ? block.content : '',
      block.type === 'image' ? block.src : '',
      block.type === 'image' ? block.alt : '',
      block.type === 'image' ? block.caption : '',
      block.type === 'code' ? block.language : '',
      block.type === 'link' || block.type === 'video_link' ? block.url : '',
      block.type === 'link' || block.type === 'video_link' ? block.title : '',
      block.type === 'link' ? block.description : '',
      block.type === 'video_link' ? block.platform : '',
      now,
      now
    )
  })
}

function mapBlock(row: BlockRow): KanbanContentBlock {
  const base = { id: row.id as string, position: Number(row.position) || 0 }

  switch (row.type) {
    case 'image':
      return { ...base, type: 'image', src: row.src || '', alt: row.alt || '', caption: row.caption || '' }
    case 'code':
      return { ...base, type: 'code', language: row.language || '', content: row.content || '' }
    case 'link':
      return { ...base, type: 'link', url: row.url || '', title: row.title || '', description: row.description || '' }
    case 'video_link':
      return { ...base, type: 'video_link', url: row.url || '', title: row.title || '', platform: row.platform || '' }
    default:
      return { ...base, type: 'text', content: row.content || '' }
  }
}

function sanitizeBlocks(blocks: KanbanContentBlock[]): KanbanContentBlock[] {
  return blocks
    .filter(block => VALID_BLOCK_TYPES.has(block.type))
    .map((block, index) => ({ ...block, id: block.id || generateId(), position: (index + 1) * POSITION_STEP }))
}

function normalizeLabels(labels: string[]): string[] {
  return [...new Set(labels.map(label => label.trim()).filter(Boolean))].slice(0, 8)
}

function parseLabels(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? normalizeLabels(parsed.map(String)) : []
  } catch {
    return []
  }
}

function normalizeTitle(value: string, message: string): string {
  const title = value.trim()
  if (!title) throw new Error(message)
  return title
}
