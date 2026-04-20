import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getThemeById } from '../../../entities/theme/api/theme-api'
import { useSession } from '../../../entities/session/model/session-context'
import { PageState } from '../../../shared/ui/page-state'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

import skrepkaIcon from '../../../assets/home-legacy/skrepkaIcon.webp'
import sendIcon from '../../../assets/home-legacy/sendIcon.webp'

type DescriptionLocationState = {
  themeTitle?: string
}

export function SectionDescriptionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { themeId } = useParams()
  const { token, authStatus, authError, isTelegram } = useSession()

  useTelegramBackButton(isTelegram, () => {
    navigate(-1)
  })

  const [themeTitle, setThemeTitle] = useState(
    (location.state as DescriptionLocationState | null)?.themeTitle ?? '',
  )
  const [isLoading, setIsLoading] = useState(Boolean(themeId && !themeTitle))
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function run() {
      if (!themeId || themeTitle || !token) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const theme = await getThemeById(themeId, token)

        if (isMounted) {
          setThemeTitle(theme.title)
          setErrorMessage('')
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Не удалось получить тему для экрана описания.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [themeId, themeTitle, token])

  if (!themeId) {
    return (
      <PageState
        title="Раздел не найден"
        description="Маршрут описания раздела вызван без идентификатора темы."
        action={{ label: 'Вернуться на главный', onClick: () => navigate('/') }}
      />
    )
  }

  const notice =
    authStatus === 'checking_telegram'
      ? 'Жду Telegram Mini App контекст. Пока экран открыт в режиме предпросмотра.'
      : authStatus === 'authenticating'
        ? 'Авторизуюсь через Telegram. Пока экран открыт в режиме предпросмотра.'
        : !token
          ? isTelegram
            ? authError ||
              'Не удалось получить Telegram-сессию. Показываю экран без backend-данных.'
            : 'Нет токена доступа к API: вы не в Telegram Mini App (или не загрузился telegram-web-app.js). Откройте форум через кнопку Web App у бота, не голую ссылку в браузере. Показываю экран без данных с сервера.'
          : isLoading
            ? 'Подтягиваю данные темы для корректного маршрута экрана.'
            : errorMessage
              ? `${errorMessage} Оставляю экран доступным как статичный режим.`
              : ''

  const screenTitle = themeTitle || 'Описание раздела'
  const editPath = `/themes/${themeId}/description/edit`

  return (
    <div className="page page--description desc-screen">
      <header className="desc-screen__header">
        <button
          className="desc-screen__back"
          type="button"
          onClick={() => navigate(-1)}
        >
          <span className="desc-screen__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>
        <h1 className="desc-screen__title">{screenTitle}</h1>
      </header>

      <Link className="desc-screen__tab-link" to="/">
        Подробнее об этой вкладке
      </Link>

      {notice ? (
        <section className="forum-home-notice desc-screen__notice">
          <p>{notice}</p>
        </section>
      ) : null}

      <div className="desc-screen__main">
        <p className="desc-screen__prompt">
          Опиши суть, цели и перспективы этого проектного раздела в свободной
          форме
        </p>
        <Link
          className="desc-screen__to-edit"
          to={editPath}
          state={{ themeTitle: themeTitle || undefined }}
        >
          Редактировать описание
        </Link>
      </div>

      <div className="desc-screen__composer" aria-label="Поле описания">
        <button
          className="desc-screen__composer-icon"
          type="button"
          aria-label="Вложение"
        >
          <img src={skrepkaIcon} alt="" width={24} height={24} />
        </button>
        <button
          className="desc-screen__composer-input-wrap"
          type="button"
          onClick={() => {
            navigate(editPath, {
              state: { themeTitle: themeTitle || undefined },
            })
          }}
        >
          <span className="desc-screen__composer-placeholder">
            Описать раздел
          </span>
        </button>
        <button
          className="desc-screen__composer-send"
          type="button"
          disabled
          aria-label="Отправить"
        >
          <img src={sendIcon} alt="" width={22} height={22} />
        </button>
      </div>
    </div>
  )
}
