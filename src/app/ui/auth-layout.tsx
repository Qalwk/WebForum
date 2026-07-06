import { Outlet } from 'react-router-dom'

/** Экраны входа/регистрации — без dev session bar. */
export function AuthLayout() {
  return (
    <div className="app-shell app-shell--auth">
      <div className="app-shell__phone app-shell__phone--auth">
        <main className="app-shell__content app-shell__content--auth">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
