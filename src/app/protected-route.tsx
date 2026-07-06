import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../entities/session/model/session-context'
import { PageState } from '../shared/ui/page-state'

export function ProtectedRoute() {
  const { token, authStatus, isTelegram } = useSession()
  const location = useLocation()

  if (
    isTelegram &&
    !token &&
    (authStatus === 'checking_telegram' || authStatus === 'authenticating')
  ) {
    return (
      <PageState
        title="Секунду"
        description={
          authStatus === 'authenticating'
            ? 'Авторизуюсь через Telegram…'
            : 'Подключаю Telegram Mini App…'
        }
      />
    )
  }

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
