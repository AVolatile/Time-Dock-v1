import { Settings as SettingsIcon, Info, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Configure your TimeDock experience</p>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">About</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Version</span>
              <span className="text-text-primary font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Platform</span>
              <span className="text-text-primary font-mono">Electron + React</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Database</span>
              <span className="text-text-primary font-mono">SQLite (local)</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Data</h3>
          </div>
          <p className="text-sm text-text-secondary mb-3">
            All data is stored locally on your machine using SQLite. No data is sent to any external server.
          </p>
          <p className="text-xs text-text-tertiary">
            Future versions will support optional cloud sync and backup features.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Preferences</h3>
          </div>
          <p className="text-sm text-text-tertiary">
            Additional preferences and customization options coming in future updates.
          </p>
        </div>
      </div>
    </div>
  )
}
