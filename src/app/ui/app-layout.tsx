import { Outlet } from 'react-router-dom'
import { SessionStatusBar } from '../../entities/session/ui/session-status-bar'
import { BrowserBackButton } from './browser-back-button'

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-shell__phone">
        <BrowserBackButton />
        <SessionStatusBar />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
