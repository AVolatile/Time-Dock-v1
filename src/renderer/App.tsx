import { useState, useEffect } from 'react'
import TopbarWidget from './topbar/TopbarWidget'
import TrayWidget from './tray/TrayWidget'
import Dashboard from './dashboard/Dashboard'
import ToastContainer from './components/toast/ToastContainer'

export default function App() {
  const [route, setRoute] = useState<'topbar' | 'tray' | 'dashboard'>('dashboard')

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === '/topbar') {
      setRoute('topbar')
    } else if (hash === '/tray') {
      setRoute('tray')
    } else {
      setRoute('dashboard')
    }
  }, [])

  return (
    <>
      {route === 'topbar' && <TopbarWidget />}
      {route === 'tray' && <TrayWidget />}
      {route === 'dashboard' && <Dashboard />}
      <ToastContainer />
    </>
  )
}
