import { Outlet } from 'react-router-dom'
import { SessionStatusBar } from '../../entities/session/ui/session-status-bar'

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-shell__phone">
        <SessionStatusBar />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
