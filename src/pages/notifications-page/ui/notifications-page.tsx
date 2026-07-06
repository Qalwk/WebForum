import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import bellImg from '../../../assets/home-legacy/bell.webp'

/** Элементы приходят с API; пока пусто — бэкенд уведомлений не подключён. */
export type AppNotificationItem = {
  id: string
  title: string
  body: string
  timeLabel: string
  read: boolean
}

function useNotificationItems(): AppNotificationItem[] {
  return useMemo(() => [], [])
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { search, hash } = useLocation()
  const { isTelegram } = useSession()
  const items = useNotificationItems()

  function goBack() {
    navigate({ pathname: '/', search, hash })
  }

  useTelegramBackButton(isTelegram, goBack)

  return (
    <div className="page page--notifications">
      <header className="section-chat__header">
        <button
          className="section-chat__back"
          type="button"
          onClick={goBack}
        >
          <span className="section-chat__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>
        <h1 className="section-chat__title">Уведомления</h1>
      </header>

      <div className="notifications__content">
        {items.length === 0 ? (
          <div className="notifications__empty" role="status">
            <div className="notifications__empty-icon" aria-hidden>
              <img src={bellImg} alt="" width={40} height={40} />
            </div>
            <p className="notifications__empty-title">Пока нет уведомлений</p>
            <p className="notifications__empty-text">
              Когда появятся реакции, ответы и новые публикации в темах, они
              отобразятся здесь.
            </p>
          </div>
        ) : (
          <ul className="notifications__list" role="list">
            {items.map((n) => (
              <li key={n.id}>
                <article
                  className={
                    n.read
                      ? 'notifications__item'
                      : 'notifications__item notifications__item--unread'
                  }
                >
                  <div className="notifications__item-icon" aria-hidden>
                    <img src={bellImg} alt="" width={24} height={24} />
                  </div>
                  <div className="notifications__item-body">
                    <p className="notifications__item-title">{n.title}</p>
                    <p className="notifications__item-text">{n.body}</p>
                    <p className="notifications__item-time">{n.timeLabel}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
