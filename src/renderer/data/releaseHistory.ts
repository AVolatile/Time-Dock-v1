export type ReleaseType = 'major' | 'minor' | 'patch'
export type ReleaseCategory = 'feature' | 'improvement' | 'fix' | 'ui' | 'performance' | 'infrastructure'
export type ReleaseConfidence = 'confirmed' | 'backfilled'

export interface ReleaseHistoryEntry {
  id: string
  version: string
  title: string
  date: string
  summary: string
  type: ReleaseType
  categories: ReleaseCategory[]
  notes: string[]
  highlight: boolean
  startOfEra?: boolean
  confidence?: ReleaseConfidence
}

export const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION

// Add future updates at the top of this list. Keep the schema stable so Settings can
// render major milestones, minor updates, and patch notes without component changes.
export const releaseHistoryEntries: ReleaseHistoryEntry[] = [
  {
    id: '2026-04-19-v1-0-0-kanban-board-workspace',
    version: CURRENT_APP_VERSION,
    title: 'KanBan Board Workspace',
    date: '2026-04-19',
    summary: 'Introduced a local KanBan board for organizing implementation notes, snippets, media, links, and project context inside TimeDock.',
    type: 'major',
    categories: ['feature', 'improvement', 'ui', 'infrastructure'],
    notes: [
      'Added a new sidebar destination titled KanBan with a horizontal board that fits the existing dashboard shell.',
      'Added persisted sections with custom colors, explicit ordering, rename, delete, drag, and move controls.',
      'Added cards with titles, descriptions, accent colors, labels, and structured content blocks for text, images, code snippets, links, and video links.',
      'Added card movement within and across sections, safe delete confirmations, and field-level editor validation.',
      'Kept the board local-first through the SQLite-backed IPC layer so notes survive reloads and app restarts.'
    ],
    highlight: true,
    confidence: 'confirmed'
  },
  {
    id: '2026-04-18-v1-0-0-macos-release-candidate',
    version: '1.0.0',
    title: 'macOS Release Candidate',
    date: '2026-04-18',
    summary: 'Stabilized the desktop app around a more native macOS dashboard and packaging path.',
    type: 'major',
    categories: ['ui', 'infrastructure', 'improvement'],
    notes: [
      'Refined the macOS-style dashboard shell, sidebar, compact topbar behavior, and dark utility surfaces.',
      'Confirmed the Electron build path for local macOS distribution artifacts.',
      'Improved desktop presentation details so the app reads as a focused native utility.'
    ],
    highlight: true,
    confidence: 'confirmed'
  },
  {
    id: '2026-04-18-v0-9-2-safety-pass',
    version: '0.9.2',
    title: 'Reliability and Safety Pass',
    date: '2026-04-18',
    summary: 'Hardened local workflows around time data, management screens, and export readiness.',
    type: 'patch',
    categories: ['fix', 'improvement', 'infrastructure'],
    notes: [
      'Reviewed local SQLite-backed flows for clients, projects, tasks, entries, breaks, and exports.',
      'Tightened operational copy around local-first behavior and unavailable sync functionality.',
      'Kept release-facing settings honest by showing only currently backed capabilities.'
    ],
    highlight: false,
    confidence: 'confirmed'
  },
  {
    id: '2026-03-31-v0-8-0-dashboard-management',
    version: '0.8.0',
    title: 'Dashboard Management Buildout',
    date: '2026-03-31',
    summary: 'Backfilled March checkpoint for the dashboard, management pages, and reporting workflow now present in the app.',
    type: 'minor',
    categories: ['feature', 'ui', 'improvement'],
    notes: [
      'Established dashboard pages for overview metrics, time logs, clients, projects, exports, and settings.',
      'Added structured management flows for client, project, task, and manual time-entry correction workflows.',
      'This entry is backfilled from current repository capabilities; adjust the date if a more exact internal checkpoint is available.'
    ],
    highlight: false,
    confidence: 'backfilled'
  },
  {
    id: '2026-03-20-v0-6-0-local-first-workflows',
    version: '0.6.0',
    title: 'Local-First Workflow Foundation',
    date: '2026-03-20',
    summary: 'Backfilled March checkpoint for the local time-tracking workflow and SQLite service layer.',
    type: 'minor',
    categories: ['feature', 'infrastructure', 'performance'],
    notes: [
      'Organized clock-in, clock-out, break handling, active session restore, and local data access behind IPC services.',
      'Modeled workspaces, clients, projects, tasks, time entries, breaks, exports, and app settings in SQLite.',
      'This entry is backfilled from current architecture and should be refined if detailed March release notes exist.'
    ],
    highlight: false,
    confidence: 'backfilled'
  },
  {
    id: '2026-03-13-v0-1-0-initial-foundation',
    version: '0.1.0',
    title: 'Initial TimeDock Foundation',
    date: '2026-03-13',
    summary: 'Established the Electron, React, TypeScript, and local SQLite foundation for TimeDock.',
    type: 'major',
    categories: ['infrastructure', 'feature'],
    notes: [
      'Created the first professional desktop time-tracking command center foundation.',
      'Set up the Electron app structure, renderer shell, preload bridge, local database layer, and core project conventions.',
      'This date is confirmed by the initial repository commit.'
    ],
    highlight: true,
    startOfEra: true,
    confidence: 'confirmed'
  }
]

export function getReleaseHistory(): ReleaseHistoryEntry[] {
  return [...releaseHistoryEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getLatestRelease(): ReleaseHistoryEntry {
  return getReleaseHistory()[0]
}
