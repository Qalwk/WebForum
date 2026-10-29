import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

export function TabGuidePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { themeId } = useParams()
  const { isTelegram } = useSession()
  const from = (location.state as { from?: unknown } | null)?.from
  const returnPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : themeId ? `/themes/${themeId}` : '/'

  useTelegramBackButton(isTelegram, () => navigate(returnPath))

  return (
    <div className="page tab-guide-page">
      <header className="desc-screen__header tab-guide-page__header">
        <button className="desc-screen__back" type="button" onClick={() => navigate(returnPath)}>
          <span className="desc-screen__back-chevron" aria-hidden>‹</span>
          Назад
        </button>
      </header>
      <main className="tab-guide-page__content">
        <p>Об этой вкладке</p>
      </main>
    </div>
  )
}
