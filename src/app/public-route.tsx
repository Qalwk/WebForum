import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../entities/session/model/session-context'

export function PublicRoute() {
  const { token } = useSession()

  if (token) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
