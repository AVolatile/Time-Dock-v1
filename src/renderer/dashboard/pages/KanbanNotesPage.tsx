import { useEffect, useState } from 'react'
import type React from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Code2,
  Edit3,
  GripVertical,
  Image,
  KanbanSquare,
  Link2,
  ListPlus,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Type,
  Video
} from 'lucide-react'
import type {
  KanbanCard,
  KanbanCardPayload,
  KanbanContentBlock,
  KanbanContentBlockType,
  KanbanSection,
  KanbanSectionWithCards,
  UpdateKanbanCardPayload
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
  TextArea,
  TextInput,
  Toolbar,
  cn
} from '../../components/ui'

const BOARD_COLORS = ['#376a8c', '#1f7a4e', '#ad6a12', '#7c5cbd', '#b6423a', '#4f766d']
const BLOCK_LABEL: Record<KanbanContentBlockType, string> = {
  text: 'Text',
  image: 'Image',
  code: 'Code',
  link: 'Link',
  video_link: 'Video'
}

type CardDraft = {
  sectionId: string
  title: string
  description: string
  accentColor: string
  labelsText: string
  contentBlocks: KanbanContentBlock[]
}

type DraggedCard = {
  cardId: string
  sectionId: string
}

export default function KanbanNotesPage() {
  const {
    kanbanBoard,
    loadKanbanBoard,
    createKanbanSection,
    updateKanbanSection,
    deleteKanbanSection,
    reorderKanbanSections,
    createKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    moveKanbanCard,
    reorderKanbanCards
  } = useAppStore()
  const [sectionEditor, setSectionEditor] = useState<KanbanSection | 'new' | null>(null)
  const [cardEditor, setCardEditor] = useState<{ sectionId: string; card?: KanbanCard } | null>(null)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null)

  useEffect(() => {
    loadKanbanBoard().catch(error => {
      toast.error('KanBan failed to load', error.message || 'The board could not be loaded.')
    })
  }, [])

  const sections = kanbanBoard?.sections || []
  const cardCount = sections.reduce((sum, section) => sum + section.cards.length, 0)
  const blockCount = sections.reduce(
    (sum, section) => sum + section.cards.reduce((cardSum, card) => cardSum + card.contentBlocks.length, 0),
    0
  )

  const handleCreateSection = async (title: string, color: string) => {
    await createKanbanSection({ boardId: kanbanBoard?.id, title, color })
    toast.success('Section created', `${title} is ready for notes.`)
  }

  const handleUpdateSection = async (id: string, title: string, color: string) => {
    await updateKanbanSection({ id, title, color })
    toast.success('Section updated')
  }

  const handleDeleteSection = async (section: KanbanSectionWithCards) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete section',
      message: section.cards.length > 0
        ? `This deletes "${section.title}" and ${section.cards.length} card${section.cards.length === 1 ? '' : 's'}.`
        : `This deletes "${section.title}".`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteKanbanSection(section.id)
          toast.success('Section deleted')
        } catch (error: any) {
          toast.error('Delete failed', error.message || 'The section could not be deleted.')
        }
      }
    })
  }

  const handleDeleteCard = async (card: KanbanCard) => {
    const { showConfirm } = useToastStore.getState()
    await showConfirm({
      title: 'Delete card',
      message: `This permanently removes "${card.title}" and its content blocks.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteKanbanCard(card.id)
          toast.success('Card deleted')
        } catch (error: any) {
          toast.error('Delete failed', error.message || 'The card could not be deleted.')
        }
      }
    })
  }

  const moveSectionByOffset = async (sectionId: string, offset: number) => {
    if (!kanbanBoard) return
    const ids = kanbanBoard.sections.map(section => section.id)
    const currentIndex = ids.indexOf(sectionId)
    const nextIndex = currentIndex + offset
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return
    ids.splice(currentIndex, 1)
    ids.splice(nextIndex, 0, sectionId)
    await reorderKanbanSections({ boardId: kanbanBoard.id, orderedSectionIds: ids })
  }

  const moveCardByOffset = async (section: KanbanSectionWithCards, cardId: string, offset: number) => {
    const ids = section.cards.map(card => card.id)
    const currentIndex = ids.indexOf(cardId)
    const nextIndex = currentIndex + offset
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return
    ids.splice(currentIndex, 1)
    ids.splice(nextIndex, 0, cardId)
    await reorderKanbanCards({ sectionId: section.id, orderedCardIds: ids })
  }

  const moveCardToNeighborSection = async (sectionIndex: number, card: KanbanCard, offset: number) => {
    const targetSection = sections[sectionIndex + offset]
    if (!targetSection) return
    await moveKanbanCard({
      cardId: card.id,
      targetSectionId: targetSection.id,
      targetPosition: getInsertPosition(targetSection.cards, targetSection.cards.length)
    })
  }

  const handleSectionDrop = async (targetSectionId: string) => {
    if (!kanbanBoard || !draggedSectionId || draggedSectionId === targetSectionId) return
    const ids = kanbanBoard.sections.map(section => section.id)
    const fromIndex = ids.indexOf(draggedSectionId)
    const targetIndex = ids.indexOf(targetSectionId)
    if (fromIndex < 0 || targetIndex < 0) return
    ids.splice(fromIndex, 1)
    ids.splice(targetIndex, 0, draggedSectionId)
    setDraggedSectionId(null)
    await reorderKanbanSections({ boardId: kanbanBoard.id, orderedSectionIds: ids })
  }

  const handleCardDrop = async (targetSection: KanbanSectionWithCards, targetCardId?: string) => {
    if (!draggedCard) return
    const targetCards = targetSection.cards.filter(card => card.id !== draggedCard.cardId)
    const targetIndex = targetCardId
      ? Math.max(0, targetCards.findIndex(card => card.id === targetCardId))
      : targetCards.length

    setDraggedCard(null)

    if (draggedCard.sectionId === targetSection.id) {
      const ids = [...targetCards.map(card => card.id)]
      ids.splice(targetIndex, 0, draggedCard.cardId)
      await reorderKanbanCards({ sectionId: targetSection.id, orderedCardIds: ids })
      return
    }

    await moveKanbanCard({
      cardId: draggedCard.cardId,
      targetSectionId: targetSection.id,
      targetPosition: getInsertPosition(targetCards, targetIndex)
    })
  }

  const handleSaveCard = async (payload: KanbanCardPayload | UpdateKanbanCardPayload, isEdit: boolean) => {
    if (isEdit) {
      await updateKanbanCard(payload as UpdateKanbanCardPayload)
      toast.success('Card updated')
      return
    }
    await createKanbanCard(payload as KanbanCardPayload)
    toast.success('Card created')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Notes Board"
        title="KanBan"
        description="Capture reusable work notes, implementation references, snippets, links, and media in a local board."
        meta={
          <div className="flex flex-wrap gap-2">
            <Pill tone="accent">{sections.length} sections</Pill>
            <Pill tone="neutral">{cardCount} cards</Pill>
            <Pill tone="neutral">{blockCount} content blocks</Pill>
          </div>
        }
        actions={
          <Button onClick={() => setSectionEditor('new')} variant="primary">
            <Plus className="h-4 w-4" />
            New Section
          </Button>
        }
      />

      <Panel className="mb-4 p-3">
        <Toolbar className="border-0 bg-transparent p-0">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-[color:var(--td-accent)]" />
            <span className="truncate text-sm font-semibold text-[color:var(--td-text)]">
              {kanbanBoard?.title || 'KanBan Notes'}
            </span>
          </div>
          <Pill tone="neutral">SQLite persisted</Pill>
          <Pill tone="accent">Drag cards or use move controls</Pill>
        </Toolbar>
      </Panel>

      {!kanbanBoard ? (
        <EmptyState
          icon={<KanbanSquare className="h-7 w-7" />}
          title="Loading board"
          description="Preparing your local notes workspace."
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-7 w-7" />}
          title="Create your first section"
          description="Sections keep notes organized by status, workflow, or topic."
          action={<Button onClick={() => setSectionEditor('new')} variant="primary"><Plus className="h-4 w-4" /> New Section</Button>}
        />
      ) : (
        <div className="td-kanban-board" aria-label="KanBan notes board">
          {sections.map((section, sectionIndex) => (
            <KanbanSectionColumn
              key={section.id}
              section={section}
              sectionIndex={sectionIndex}
              sectionCount={sections.length}
              onEditSection={() => setSectionEditor(section)}
              onDeleteSection={() => handleDeleteSection(section)}
              onMoveSection={offset => moveSectionByOffset(section.id, offset)}
              onCreateCard={() => setCardEditor({ sectionId: section.id })}
              onEditCard={card => setCardEditor({ sectionId: section.id, card })}
              onDeleteCard={handleDeleteCard}
              onMoveCard={(card, offset) => moveCardByOffset(section, card.id, offset)}
              onMoveCardAcross={(card, offset) => moveCardToNeighborSection(sectionIndex, card, offset)}
              onSectionDragStart={() => setDraggedSectionId(section.id)}
              onSectionDrop={() => handleSectionDrop(section.id)}
              onCardDragStart={(card) => setDraggedCard({ cardId: card.id, sectionId: section.id })}
              onCardDrop={(targetCardId) => handleCardDrop(section, targetCardId)}
              onSectionCardDrop={() => handleCardDrop(section)}
            />
          ))}
        </div>
      )}

      {sectionEditor && (
        <SectionEditorDialog
          section={sectionEditor === 'new' ? undefined : sectionEditor}
          onClose={() => setSectionEditor(null)}
          onSave={async (title, color) => {
            if (sectionEditor === 'new') {
              await handleCreateSection(title, color)
            } else {
              await handleUpdateSection(sectionEditor.id, title, color)
            }
            setSectionEditor(null)
          }}
        />
      )}

      {cardEditor && kanbanBoard && (
        <CardEditorDialog
          boardSections={sections}
          initialSectionId={cardEditor.sectionId}
          card={cardEditor.card}
          onClose={() => setCardEditor(null)}
          onSave={async (payload, isEdit) => {
            await handleSaveCard(payload, isEdit)
            setCardEditor(null)
          }}
        />
      )}
    </div>
  )
}

function KanbanSectionColumn({
  section,
  sectionIndex,
  sectionCount,
  onEditSection,
  onDeleteSection,
  onMoveSection,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onMoveCard,
  onMoveCardAcross,
  onSectionDragStart,
  onSectionDrop,
  onCardDragStart,
  onCardDrop,
  onSectionCardDrop
}: {
  section: KanbanSectionWithCards
  sectionIndex: number
  sectionCount: number
  onEditSection: () => void
  onDeleteSection: () => void
  onMoveSection: (offset: number) => void
  onCreateCard: () => void
  onEditCard: (card: KanbanCard) => void
  onDeleteCard: (card: KanbanCard) => void
  onMoveCard: (card: KanbanCard, offset: number) => void
  onMoveCardAcross: (card: KanbanCard, offset: number) => void
  onSectionDragStart: () => void
  onSectionDrop: () => void
  onCardDragStart: (card: KanbanCard) => void
  onCardDrop: (targetCardId: string) => void
  onSectionCardDrop: () => void
}) {
  return (
    <section
      className="td-kanban-section"
      style={{ '--section-color': section.color } as React.CSSProperties}
      draggable
      onDragStart={event => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', section.id)
        onSectionDragStart()
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault()
        onSectionDrop()
      }}
    >
      <header className="td-kanban-section-header">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-[color:var(--td-text-tertiary)]" />
            <span className="td-kanban-section-dot" />
            <h2 className="td-kanban-section-title">{section.title}</h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Pill tone="neutral">{section.cards.length} cards</Pill>
          </div>
        </div>
        <div className="td-kanban-section-actions">
          <IconButton onClick={() => onMoveSection(-1)} disabled={sectionIndex === 0} aria-label="Move section left">
            <ArrowLeft className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={() => onMoveSection(1)} disabled={sectionIndex === sectionCount - 1} aria-label="Move section right">
            <ArrowRight className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={onEditSection} aria-label="Edit section">
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={onDeleteSection} tone="danger" aria-label="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </header>

      <div
        className="td-kanban-card-list"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault()
          onSectionCardDrop()
        }}
      >
        {section.cards.length === 0 ? (
          <EmptyState
            compact
            icon={<StickyNote className="h-5 w-5" />}
            title="No cards"
            description="Add notes, snippets, links, or media."
          />
        ) : (
          section.cards.map((card, index) => (
            <KanbanCardPreview
              key={card.id}
              card={card}
              index={index}
              count={section.cards.length}
              canMoveLeft={sectionIndex > 0}
              canMoveRight={sectionIndex < sectionCount - 1}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card)}
              onMove={offset => onMoveCard(card, offset)}
              onMoveAcross={offset => onMoveCardAcross(card, offset)}
              onDragStart={() => onCardDragStart(card)}
              onDrop={() => onCardDrop(card.id)}
            />
          ))
        )}
      </div>

      <Button onClick={onCreateCard} variant="secondary" className="w-full">
        <ListPlus className="h-4 w-4" />
        Add Card
      </Button>
    </section>
  )
}

function KanbanCardPreview({
  card,
  index,
  count,
  canMoveLeft,
  canMoveRight,
  onEdit,
  onDelete,
  onMove,
  onMoveAcross,
  onDragStart,
  onDrop
}: {
  card: KanbanCard
  index: number
  count: number
  canMoveLeft: boolean
  canMoveRight: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (offset: number) => void
  onMoveAcross: (offset: number) => void
  onDragStart: () => void
  onDrop: () => void
}) {
  const primaryBlock = card.contentBlocks[0]

  return (
    <article
      className="td-kanban-card"
      style={{ '--card-accent': card.accentColor } as React.CSSProperties}
      draggable
      onDragStart={event => {
        event.stopPropagation()
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', card.id)
        onDragStart()
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault()
        event.stopPropagation()
        onDrop()
      }}
    >
      <div className="td-kanban-card-accent" />
      <div className="td-kanban-card-head">
        <button type="button" onClick={onEdit} className="td-kanban-card-title">
          {card.title}
        </button>
        <div className="td-kanban-card-actions">
          <IconButton onClick={onEdit} aria-label="Edit card">
            <Edit3 className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={onDelete} tone="danger" aria-label="Delete card">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {card.description && <p className="td-kanban-card-description">{card.description}</p>}

      {card.labels.length > 0 && (
        <div className="td-kanban-label-row">
          {card.labels.map(label => <span key={label} className="td-kanban-label">{label}</span>)}
        </div>
      )}

      {primaryBlock && <ContentBlockPreview block={primaryBlock} />}

      <footer className="td-kanban-card-footer">
        <span className="td-kanban-card-meta">
          {card.contentBlocks.length} blocks
        </span>
        <span className="td-kanban-card-move">
          <IconButton onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move card up">
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move card down">
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={() => onMoveAcross(-1)} disabled={!canMoveLeft} aria-label="Move card left">
            <ArrowLeft className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={() => onMoveAcross(1)} disabled={!canMoveRight} aria-label="Move card right">
            <ArrowRight className="h-3.5 w-3.5" />
          </IconButton>
        </span>
      </footer>
    </article>
  )
}

function ContentBlockPreview({ block }: { block: KanbanContentBlock }) {
  switch (block.type) {
    case 'image':
      return (
        <div className="td-kanban-block-preview">
          {block.src ? <img src={block.src} alt={block.alt || block.caption || 'Card image'} /> : <Image className="h-5 w-5" />}
          {block.caption && <span>{block.caption}</span>}
        </div>
      )
    case 'code':
      return (
        <pre className="td-kanban-code-preview"><code>{block.content || `// ${block.language || 'code'} snippet`}</code></pre>
      )
    case 'link':
      return (
        <a className="td-kanban-link-preview" href={block.url} target="_blank" rel="noreferrer">
          <Link2 className="h-3.5 w-3.5" />
          <span>{block.title || block.url}</span>
        </a>
      )
    case 'video_link':
      return (
        <a className="td-kanban-link-preview" href={block.url} target="_blank" rel="noreferrer">
          <Video className="h-3.5 w-3.5" />
          <span>{block.title || block.platform || block.url}</span>
        </a>
      )
    default:
      return <p className="td-kanban-text-preview">{block.content}</p>
  }
}

function SectionEditorDialog({
  section,
  onClose,
  onSave
}: {
  section?: KanbanSection
  onClose: () => void
  onSave: (title: string, color: string) => Promise<void>
}) {
  const [title, setTitle] = useState(section?.title || '')
  const [color, setColor] = useState(section?.color || BOARD_COLORS[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Section title is required.')
      return
    }

    setSaving(true)
    try {
      await onSave(title.trim(), color)
    } catch (err: any) {
      toast.error('Section save failed', err.message || 'The section could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={section ? 'Edit Section' : 'New Section'}
      description="Sections can represent status, priority, content type, or workflow stage."
      onClose={onClose}
      maxWidth="sm"
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">{saving ? 'Saving...' : 'Save Section'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Section Title" error={error}>
          <TextInput autoFocus value={title} onChange={event => { setTitle(event.target.value); setError('') }} placeholder="Research" />
        </Field>
        <Field label="Section Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>
    </Dialog>
  )
}

function CardEditorDialog({
  boardSections,
  initialSectionId,
  card,
  onClose,
  onSave
}: {
  boardSections: KanbanSectionWithCards[]
  initialSectionId: string
  card?: KanbanCard
  onClose: () => void
  onSave: (payload: KanbanCardPayload | UpdateKanbanCardPayload, isEdit: boolean) => Promise<void>
}) {
  const isEdit = Boolean(card)
  const [draft, setDraft] = useState<CardDraft>(() => ({
    sectionId: card?.sectionId || initialSectionId,
    title: card?.title || '',
    description: card?.description || '',
    accentColor: card?.accentColor || boardSections.find(section => section.id === initialSectionId)?.color || BOARD_COLORS[0],
    labelsText: card?.labels.join(', ') || '',
    contentBlocks: card?.contentBlocks || []
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedSection = boardSections.find(section => section.id === draft.sectionId)

  const updateDraft = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!draft.sectionId) next.sectionId = 'Choose a destination section.'
    if (!draft.title.trim()) next.title = 'Card title is required.'

    draft.contentBlocks.forEach((block, index) => {
      if ((block.type === 'link' || block.type === 'video_link') && block.url && !isValidUrl(block.url)) {
        next[`block-${block.id}`] = `Block ${index + 1} needs a valid URL.`
      }
      if (block.type === 'image' && block.src && !isValidImageSource(block.src)) {
        next[`block-${block.id}`] = `Block ${index + 1} needs an image URL or uploaded image.`
      }
    })

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const labels = draft.labelsText.split(',').map(label => label.trim()).filter(Boolean)
      const basePayload = {
        sectionId: draft.sectionId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        accentColor: draft.accentColor,
        labels,
        contentBlocks: draft.contentBlocks
      }
      await onSave(isEdit ? { id: card!.id, ...basePayload } : basePayload, isEdit)
    } catch (error: any) {
      toast.error('Card save failed', error.message || 'The card could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const addBlock = (type: KanbanContentBlockType) => {
    updateDraft('contentBlocks', [...draft.contentBlocks, createEmptyBlock(type)])
  }

  const updateBlock = (blockId: string, nextBlock: KanbanContentBlock) => {
    updateDraft('contentBlocks', draft.contentBlocks.map(block => block.id === blockId ? nextBlock : block))
  }

  const deleteBlock = (blockId: string) => {
    updateDraft('contentBlocks', draft.contentBlocks.filter(block => block.id !== blockId))
  }

  const moveBlock = (blockId: string, offset: number) => {
    const blocks = [...draft.contentBlocks]
    const index = blocks.findIndex(block => block.id === blockId)
    const nextIndex = index + offset
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return
    const [block] = blocks.splice(index, 1)
    blocks.splice(nextIndex, 0, block)
    updateDraft('contentBlocks', blocks.map((item, itemIndex) => ({ ...item, position: (itemIndex + 1) * 1000 })))
  }

  return (
    <Dialog
      title={isEdit ? 'Edit KanBan Card' : 'New KanBan Card'}
      description="Build a structured note with text, media, code, links, and video references."
      onClose={onClose}
      maxWidth="xl"
      footer={
        <>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : isEdit ? 'Save Card' : 'Create Card'}
          </Button>
        </>
      }
    >
      <div className="td-kanban-editor">
        <div className="td-kanban-editor-main">
          <div className="td-form-grid">
            <Field label="Title" error={errors.title}>
              <TextInput value={draft.title} onChange={event => updateDraft('title', event.target.value)} placeholder="Implementation note" />
            </Field>
            <Field label="Section" error={errors.sectionId}>
              <SelectInput value={draft.sectionId} onChange={event => updateDraft('sectionId', event.target.value)}>
                {boardSections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
              </SelectInput>
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={draft.description} onChange={event => updateDraft('description', event.target.value)} placeholder="Short summary of the note..." />
          </Field>

          <div className="td-form-grid">
            <Field label="Labels" hint="Comma-separated. Example: frontend, client, bug">
              <TextInput value={draft.labelsText} onChange={event => updateDraft('labelsText', event.target.value)} placeholder="frontend, snippet" />
            </Field>
            <Field label="Accent Color">
              <ColorPicker value={draft.accentColor} onChange={value => updateDraft('accentColor', value)} />
            </Field>
          </div>

          <Panel className="td-kanban-block-toolbar">
            <div className="min-w-0">
              <div className="td-section-title">Content Blocks</div>
              <p className="td-section-description">Add reusable structured context instead of burying everything in one note.</p>
            </div>
            <div className="td-kanban-block-actions">
              <Button onClick={() => addBlock('text')} size="xs" variant="secondary"><Type className="h-3.5 w-3.5" /> Text</Button>
              <Button onClick={() => addBlock('image')} size="xs" variant="secondary"><Image className="h-3.5 w-3.5" /> Image</Button>
              <Button onClick={() => addBlock('code')} size="xs" variant="secondary"><Code2 className="h-3.5 w-3.5" /> Code</Button>
              <Button onClick={() => addBlock('link')} size="xs" variant="secondary"><Link2 className="h-3.5 w-3.5" /> Link</Button>
              <Button onClick={() => addBlock('video_link')} size="xs" variant="secondary"><Video className="h-3.5 w-3.5" /> Video</Button>
            </div>
          </Panel>

          {draft.contentBlocks.length === 0 ? (
            <EmptyState
              compact
              icon={<StickyNote className="h-5 w-5" />}
              title="No content blocks"
              description="Add at least one block when the card needs rich reusable detail."
            />
          ) : (
            <div className="td-kanban-block-list">
              {draft.contentBlocks.map((block, index) => (
                <ContentBlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  count={draft.contentBlocks.length}
                  error={errors[`block-${block.id}`]}
                  onUpdate={nextBlock => updateBlock(block.id, nextBlock)}
                  onDelete={() => deleteBlock(block.id)}
                  onMove={offset => moveBlock(block.id, offset)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="td-kanban-editor-preview">
          <div className="td-section-title">Preview</div>
          <KanbanCardPreviewShell
            title={draft.title || 'Untitled card'}
            description={draft.description}
            labels={draft.labelsText.split(',').map(label => label.trim()).filter(Boolean)}
            color={draft.accentColor}
            sectionTitle={selectedSection?.title || 'No section'}
            blockCount={draft.contentBlocks.length}
          />
        </aside>
      </div>
    </Dialog>
  )
}

function ContentBlockEditor({
  block,
  index,
  count,
  error,
  onUpdate,
  onDelete,
  onMove
}: {
  block: KanbanContentBlock
  index: number
  count: number
  error?: string
  onUpdate: (block: KanbanContentBlock) => void
  onDelete: () => void
  onMove: (offset: number) => void
}) {
  return (
    <Panel className="td-kanban-block-editor">
      <div className="td-kanban-block-editor-head">
        <div className="flex min-w-0 items-center gap-2">
          {getBlockIcon(block.type)}
          <span className="font-semibold text-[color:var(--td-text)]">{BLOCK_LABEL[block.type]}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move block up">
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move block down">
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={onDelete} tone="danger" aria-label="Delete block">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3">
        {renderBlockFields(block, onUpdate)}
      </div>
      {error && <div className="mt-2 text-xs font-medium text-[color:var(--td-danger)]">{error}</div>}
    </Panel>
  )
}

function renderBlockFields(block: KanbanContentBlock, onUpdate: (block: KanbanContentBlock) => void) {
  switch (block.type) {
    case 'image':
      return (
        <div className="space-y-3">
          <Field label="Image URL or uploaded data">
            <TextInput value={block.src} onChange={event => onUpdate({ ...block, src: event.target.value })} placeholder="https://example.com/image.png" />
          </Field>
          <label className="td-kanban-file-drop">
            <Image className="h-4 w-4" />
            <span>Upload image from this device</span>
            <input
              type="file"
              accept="image/*"
              onChange={event => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => onUpdate({ ...block, src: String(reader.result || ''), alt: block.alt || file.name })
                reader.readAsDataURL(file)
              }}
            />
          </label>
          {block.src && <img className="td-kanban-editor-image" src={block.src} alt={block.alt || 'Preview'} />}
          <div className="td-form-grid">
            <Field label="Alt Text">
              <TextInput value={block.alt} onChange={event => onUpdate({ ...block, alt: event.target.value })} placeholder="Image description" />
            </Field>
            <Field label="Caption">
              <TextInput value={block.caption} onChange={event => onUpdate({ ...block, caption: event.target.value })} placeholder="Optional caption" />
            </Field>
          </div>
        </div>
      )
    case 'code':
      return (
        <div className="space-y-3">
          <Field label="Language">
            <TextInput value={block.language} onChange={event => onUpdate({ ...block, language: event.target.value })} placeholder="typescript" />
          </Field>
          <Field label="Code">
            <TextArea className="td-kanban-code-input" value={block.content} onChange={event => onUpdate({ ...block, content: event.target.value })} placeholder="Paste a reusable snippet..." />
          </Field>
        </div>
      )
    case 'link':
      return (
        <div className="space-y-3">
          <Field label="URL">
            <TextInput value={block.url} onChange={event => onUpdate({ ...block, url: event.target.value })} placeholder="https://example.com" />
          </Field>
          <Field label="Title">
            <TextInput value={block.title} onChange={event => onUpdate({ ...block, title: event.target.value })} placeholder="Reference title" />
          </Field>
          <Field label="Description">
            <TextArea value={block.description} onChange={event => onUpdate({ ...block, description: event.target.value })} placeholder="Why this link matters..." />
          </Field>
        </div>
      )
    case 'video_link':
      return (
        <div className="space-y-3">
          <Field label="Video URL">
            <TextInput
              value={block.url}
              onChange={event => onUpdate({ ...block, url: event.target.value, platform: detectVideoPlatform(event.target.value) })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </Field>
          <div className="td-form-grid">
            <Field label="Title">
              <TextInput value={block.title} onChange={event => onUpdate({ ...block, title: event.target.value })} placeholder="Video title" />
            </Field>
            <Field label="Platform">
              <TextInput value={block.platform} onChange={event => onUpdate({ ...block, platform: event.target.value })} placeholder="YouTube" />
            </Field>
          </div>
        </div>
      )
    default:
      return (
        <Field label="Text">
          <TextArea value={block.content} onChange={event => onUpdate({ ...block, content: event.target.value })} placeholder="Write the note details..." />
        </Field>
      )
  }
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="td-kanban-color-picker">
      {BOARD_COLORS.map(color => (
        <button
          key={color}
          type="button"
          className={cn('td-kanban-color-swatch', value === color && 'td-kanban-color-swatch-active')}
          style={{ background: color }}
          onClick={() => onChange(color)}
          aria-label={`Use color ${color}`}
        />
      ))}
      <TextInput value={value} onChange={event => onChange(event.target.value)} className="td-kanban-color-input" aria-label="Custom hex color" />
    </div>
  )
}

function KanbanCardPreviewShell({
  title,
  description,
  labels,
  color,
  sectionTitle,
  blockCount
}: {
  title: string
  description: string
  labels: string[]
  color: string
  sectionTitle: string
  blockCount: number
}) {
  return (
    <div className="td-kanban-card td-kanban-editor-card-preview" style={{ '--card-accent': color } as React.CSSProperties}>
      <div className="td-kanban-card-accent" />
      <div className="td-kanban-card-title">{title}</div>
      {description && <p className="td-kanban-card-description">{description}</p>}
      <div className="td-kanban-label-row">
        {labels.slice(0, 4).map(label => <span key={label} className="td-kanban-label">{label}</span>)}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--td-text-tertiary)]">
        <span>{sectionTitle}</span>
        <span>{blockCount} blocks</span>
      </div>
    </div>
  )
}

function getBlockIcon(type: KanbanContentBlockType) {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4 text-[color:var(--td-accent)]" />
    case 'code':
      return <Code2 className="h-4 w-4 text-[color:var(--td-accent)]" />
    case 'link':
      return <Link2 className="h-4 w-4 text-[color:var(--td-accent)]" />
    case 'video_link':
      return <Video className="h-4 w-4 text-[color:var(--td-accent)]" />
    default:
      return <Type className="h-4 w-4 text-[color:var(--td-accent)]" />
  }
}

function createEmptyBlock(type: KanbanContentBlockType): KanbanContentBlock {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const base = { id, type, position: Date.now() }

  switch (type) {
    case 'image':
      return { ...base, type, src: '', alt: '', caption: '' }
    case 'code':
      return { ...base, type, language: 'typescript', content: '' }
    case 'link':
      return { ...base, type, url: '', title: '', description: '' }
    case 'video_link':
      return { ...base, type, url: '', title: '', platform: '' }
    default:
      return { ...base, type: 'text', content: '' }
  }
}

function getInsertPosition(cards: KanbanCard[], index: number): number {
  if (cards.length === 0) return 1000
  if (index <= 0) return cards[0].position / 2
  if (index >= cards.length) return cards[cards.length - 1].position + 1000
  return (cards[index - 1].position + cards[index].position) / 2
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidImageSource(value: string): boolean {
  return value.startsWith('data:image/') || isValidUrl(value)
}

function detectVideoPlatform(value: string): string {
  if (!value) return ''
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube'
    if (host.includes('vimeo')) return 'Vimeo'
    if (host.includes('loom')) return 'Loom'
    return host
  } catch {
    return ''
  }
}
