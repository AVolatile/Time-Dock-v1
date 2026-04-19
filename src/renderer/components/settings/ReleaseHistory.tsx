import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  GitBranch,
  Rocket,
  Sparkles
} from 'lucide-react'
import { getLatestRelease, getReleaseHistory } from '../../data/releaseHistory'
import type { ReleaseCategory, ReleaseHistoryEntry, ReleaseType } from '../../data/releaseHistory'
import { Panel, Pill, SectionHeader, cn } from '../ui'

const categoryTone: Record<ReleaseCategory, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  feature: 'accent',
  improvement: 'success',
  fix: 'danger',
  ui: 'warning',
  performance: 'success',
  infrastructure: 'neutral'
}

const releaseTypeLabel: Record<ReleaseType, string> = {
  major: 'Milestone',
  minor: 'Update',
  patch: 'Patch'
}

export function ReleaseHistory() {
  const entries = getReleaseHistory()
  const latestRelease = getLatestRelease()
  const majorCount = entries.filter(entry => entry.type === 'major').length

  return (
    <Panel className="td-release-panel p-4">
      <SectionHeader
        title="Release Notes"
        description="A recurring product history for feature additions, patches, UI refinements, and milestone updates."
        compact
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Pill tone="accent">{entries.length} entries</Pill>
            <Pill tone="neutral">{majorCount} milestones</Pill>
          </div>
        }
      />

      <div className="td-release-hero">
        <div className="td-release-hero-icon">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="td-release-hero-eyebrow">Current release</div>
          <div className="td-release-hero-title">{latestRelease.version} - {latestRelease.title}</div>
          <p className="td-release-hero-summary">{latestRelease.summary}</p>
        </div>
      </div>

      <div className="td-release-timeline" aria-label="TimeDock release history">
        {entries.map(entry => (
          <ReleaseEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </Panel>
  )
}

function ReleaseEntryCard({ entry }: { entry: ReleaseHistoryEntry }) {
  const milestone = entry.type === 'major' || entry.highlight

  return (
    <article className={cn('td-release-entry', milestone && 'td-release-entry-highlight')}>
      <div className="td-release-marker" aria-hidden="true">
        {entry.startOfEra ? <GitBranch className="h-3.5 w-3.5" /> : milestone ? <Sparkles className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
      </div>

      <div className="td-release-card">
        <header className="td-release-card-header">
          <div className="min-w-0">
            <div className="td-release-meta">
              <span className="td-release-version">{entry.version}</span>
              <span className="td-release-date"><CalendarDays className="h-3.5 w-3.5" /> {formatReleaseDate(entry.date)}</span>
            </div>
            <h3 className="td-release-title">{entry.title}</h3>
          </div>

          <div className="td-release-badge-stack">
            <Pill tone={milestone ? 'accent' : entry.type === 'patch' ? 'danger' : 'success'}>
              {releaseTypeLabel[entry.type]}
            </Pill>
            {entry.confidence === 'backfilled' && <Pill tone="warning">Backfilled</Pill>}
          </div>
        </header>

        <p className="td-release-summary">{entry.summary}</p>

        <div className="td-release-categories">
          {entry.categories.map(category => (
            <Pill key={category} tone={categoryTone[category]}>{formatCategory(category)}</Pill>
          ))}
        </div>

        <ul className="td-release-notes">
          {entry.notes.map(note => (
            <li key={note}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function formatReleaseDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`))
}

function formatCategory(category: ReleaseCategory): string {
  return category
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
