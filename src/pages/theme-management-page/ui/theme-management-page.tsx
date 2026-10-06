import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createTheme,
  getChildThemes,
  getRootTheme,
  getThemeById,
} from '../../../entities/theme/api/theme-api'
import type { Theme } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

export function ThemeManagementPage() {
  const navigate = useNavigate()
  const { themeId } = useParams()
  const { token, authStatus, authError, isTelegram } = useSession()

  useTelegramBackButton(isTelegram, () => {
    navigate(-1)
  })

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [parentThemeId, setParentThemeId] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function run() {
      setLoadState('loading')
      setParentThemeId('')
      setThemes([])

      try {
        const parentTheme = themeId
          ? await getThemeById(themeId, token)
          : await getRootTheme(token)
        const nextThemes = await getChildThemes(parentTheme.id, token)

        if (!isMounted) {
          return
        }

        setParentThemeId(parentTheme.id)
        setThemes(nextThemes)
        setErrorMessage('')
        setLoadState('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не удалось получить текущие темы.',
        )
        setLoadState('error')
      }
    }

    if (token) {
      void run()
    } else {
      setParentThemeId('')
      setThemes([])
      setLoadState('ready')
    }

    return () => {
      isMounted = false
    }
  }, [themeId, token])

  async function handleCreateTheme() {
    const title = draftTitle.trim()

    if (!title || !parentThemeId) {
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    let created = false

    try {
      const createdThemeId = await createTheme(
        {
          title,
          parent_id: parentThemeId,
          is_group: false,
          tech_version: 'minimum',
        },
        token,
      )
      created = true

      setDraftTitle('')
      try {
        const createdTheme = await getThemeById(createdThemeId, token)
        setThemes((currentThemes) =>
          currentThemes.some((theme) => theme.id === createdTheme.id)
            ? currentThemes
            : [...currentThemes, createdTheme],
        )
      } catch {
        setThemes(await getChildThemes(parentThemeId, token))
      }
    } catch (error) {
      setSubmitError(
        created
          ? 'Тема создана, но список не удалось обновить. Откройте экран заново.'
          : error instanceof Error
            ? error.message
            : 'Не удалось создать тему.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const notice =
    authStatus === 'checking_telegram'
      ? 'Жду Telegram Mini App контекст. Пока экран открыт в режиме предпросмотра.'
      : authStatus === 'authenticating'
        ? 'Авторизуюсь через Telegram. Пока экран открыт в режиме предпросмотра.'
        : !token
          ? isTelegram
            ? authError ||
              'Не удалось получить Telegram-сессию. Режим управления открыт без backend-запросов.'
            : 'Нет токена доступа к API: откройте через Web App бота или задайте VITE_API_BEARER_TOKEN при сборке. Экран в статичном режиме.'
          : loadState === 'loading'
            ? 'Получаю дочерние темы с сервера.'
            : loadState === 'error'
              ? errorMessage
              : ''

  return (
    <div className="page page--theme-management theme-module-page">
      <header className="theme-module-page__top">
        <button
          className="theme-module-page__back"
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Назад
        </button>
        <h1 className="theme-module-page__screen-title">Управление темами</h1>
      </header>

      {notice ? (
        <section className="forum-home-notice theme-module-page__notice">
          <p>{notice}</p>
        </section>
      ) : null}

      <section className="theme-module">
        <button
          className="theme-module__head"
          type="button"
          aria-expanded={panelOpen}
          onClick={() => {
            setPanelOpen((open) => !open)
          }}
        >
          <span className="theme-module__head-title">Темы модуля</span>
          <span className="theme-module__chevron" aria-hidden>
            {panelOpen ? '▲' : '▼'}
          </span>
        </button>

        {panelOpen ? (
          <>
            {loadState === 'ready' && token && themes.length === 0 ? (
              <p className="theme-module__empty">У этой темы пока нет дочерних тем.</p>
            ) : null}
            <ul className="theme-module__list">
              {themes.map((theme) => (
                <li key={theme.id}>
                  <button
                    className="theme-module__list-link"
                    type="button"
                    onClick={() => {
                      navigate(`/themes/${theme.id}`)
                    }}
                  >
                    {theme.title}
                  </button>
                </li>
              ))}
            </ul>

            <div className="theme-module__form">
              <label className="visually-hidden" htmlFor="theme-new-title">
                Название новой темы
              </label>
              <input
                id="theme-new-title"
                className="theme-module__input"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Название новой темы"
                autoComplete="off"
              />
              <button
                className="theme-module__submit"
                type="button"
                onClick={() => void handleCreateTheme()}
                disabled={isSubmitting || !draftTitle.trim() || !parentThemeId || !token}
              >
                {isSubmitting ? 'Добавляю…' : 'Добавить тему'}
              </button>
            </div>
            {submitError ? (
              <p className="theme-module__error">{submitError}</p>
            ) : null}
          </>
        ) : null}
      </section>

      <Link className="desc-screen__tab-link" to={parentThemeId ? `/themes/${parentThemeId}` : '/'}>
        Вернуться на главный экран
      </Link>
    </div>
  )
}
