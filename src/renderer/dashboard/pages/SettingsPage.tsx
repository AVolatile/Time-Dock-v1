import type React from 'react'
import { Database, HardDrive, Info, Lock, Settings as SettingsIcon, ShieldCheck, SunMoon } from 'lucide-react'
import { AppearanceToggle, PageHeader, Panel, Pill, SectionHeader } from '../../components/ui'
import { useDashboardTheme } from '../../hooks/useDashboardTheme'

export default function SettingsPage() {
  const { theme, setTheme } = useDashboardTheme()

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Review the local-first app environment and operational defaults currently available in TimeDock."
        meta={<Pill tone="accent">Local-first</Pill>}
      />

      <div className="td-split">
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionHeader
              title="Application"
              description="Installed desktop environment and renderer stack."
              compact
            />
            <div className="divide-y divide-[color:var(--td-line)]">
              <SettingsRow icon={<Info className="h-4 w-4" />} label="Version" value="1.0.0" />
              <SettingsRow icon={<SettingsIcon className="h-4 w-4" />} label="Interface" value="Electron + React + TypeScript" />
              <SettingsRow icon={<ShieldCheck className="h-4 w-4" />} label="Mode" value="Single-user local workspace" />
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader
              title="Appearance"
              description="Dashboard presentation only. The compact topbar and quick panel keep their dark utility material."
              compact
            />
            <div className="td-settings-control-row">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-[color:var(--td-accent)]"><SunMoon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[color:var(--td-text)]">Admin panel theme</div>
                  <div className="mt-1 text-xs text-[color:var(--td-text-tertiary)]">
                    Matches the compact TimeDock surfaces while preserving dashboard readability.
                  </div>
                </div>
              </div>
              <AppearanceToggle theme={theme} onChange={setTheme} />
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader
              title="Data"
              description="TimeDock stores operational data on this machine."
              compact
            />
            <div className="divide-y divide-[color:var(--td-line)]">
              <SettingsRow icon={<Database className="h-4 w-4" />} label="Database" value="SQLite" />
              <SettingsRow icon={<HardDrive className="h-4 w-4" />} label="Storage" value="Local app data directory" />
              <SettingsRow icon={<Lock className="h-4 w-4" />} label="Network Sync" value="Disabled" />
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel className="p-4">
            <SectionHeader title="Operational Notes" compact />
            <div className="space-y-3 text-sm leading-relaxed text-[color:var(--td-text-secondary)]">
              <p>Clock sessions, manual corrections, clients, projects, tasks, breaks, and exports are handled through local IPC and SQLite services.</p>
              <p>Future sync or backup controls should be added here only when the backing service exists, so settings do not imply unavailable behavior.</p>
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHeader title="Current Defaults" compact />
            <div className="space-y-3">
              <SettingsSummary label="Week starts" value="Monday" />
              <SettingsSummary label="Timer precision" value="Seconds" />
              <SettingsSummary label="Export formats" value="PDF, CSV" />
              <SettingsSummary label="Data ownership" value="On-device" />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function SettingsRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-[color:var(--td-accent)]">{icon}</span>
        <span className="text-sm font-medium text-[color:var(--td-text)]">{label}</span>
      </div>
      <span className="td-mono truncate text-right text-xs text-[color:var(--td-text-secondary)]">{value}</span>
    </div>
  )
}

function SettingsSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--td-line)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs text-[color:var(--td-text-tertiary)]">{label}</span>
      <span className="text-xs font-semibold text-[color:var(--td-text)]">{value}</span>
    </div>
  )
}
