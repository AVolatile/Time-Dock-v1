import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import Sidebar from './Sidebar'
import OverviewPage from './pages/OverviewPage'
import TimeLogsPage from './pages/TimeLogsPage'
import ProjectsPage from './pages/ProjectsPage'
import ClientsPage from './pages/ClientsPage'
import ExportsPage from './pages/ExportsPage'
import SettingsPage from './pages/SettingsPage'

export default function Dashboard() {
  const { activePage, refreshSession, loadClients, loadProjects, loadTasks, loadDaySummary, loadWeekSummary } = useAppStore()

  useEffect(() => {
    // Initial data load
    refreshSession()
    loadClients()
    loadProjects()
    loadTasks()
    loadDaySummary()
    loadWeekSummary()

    // Poll for session updates every 5s
    const interval = setInterval(() => {
      refreshSession()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const renderPage = () => {
    switch (activePage) {
      case 'overview': return <OverviewPage />
      case 'logs': return <TimeLogsPage />
      case 'projects': return <ProjectsPage />
      case 'clients': return <ClientsPage />
      case 'exports': return <ExportsPage />
      case 'settings': return <SettingsPage />
      default: return <OverviewPage />
    }
  }

  return (
    <div className="flex h-full bg-surface-0">
      {/* Titlebar drag region */}
      <div className="absolute top-0 left-0 right-0 h-12 titlebar-drag z-50" />

      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-12 px-8 pb-8">
        {renderPage()}
      </main>
    </div>
  )
}
