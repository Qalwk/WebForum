import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTheme,
  getRootTheme,
  getThemeById,
} from '../../../entities/theme/api/theme-api'
import {
  addKnownThemeId,
  getKnownThemeIds,
  saveKnownThemeIds,
} from '../../../entities/theme/model/theme-catalog'
import type { Theme } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

async function loadKnownThemeList(token: string) {
  const rootTheme = await getRootTheme(token)
  const knownIds = getKnownThemeIds().filter((themeId) => themeId !== rootTheme.id)

  const extraThemes = await Promise.all(
    knownIds.map(async (themeId) => {
      try {
        return await getThemeById(themeId, token)
      } catch {
        return null
      }
    }),
  )

  const validExtraThemes = extraThemes.filter((theme): theme is Theme => Boolean(theme))
  saveKnownThemeIds(validExtraThemes.map((theme) => theme.id))

  return { rootTheme, themes: [rootTheme, ...validExtraThemes] }
}

export function ThemeManagementPage() {
  const navigate = useNavigate()
  const { token, authStatus, authError, isTelegram } = useSession()

  useTelegramBackButton(isTelegram, () => {
    navigate(-1)
  })

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [rootThemeId, setRootThemeId] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function run() {
      setLoadState('loading')

      try {
        const { rootTheme, themes: nextThemes } = await loadKnownThemeList(token)

        if (!isMounted) {
          return
        }

        setRootThemeId(rootTheme.id)
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
      setLoadState('ready')
    }

    return () => {
      isMounted = false
    }
  }, [token])

  async function handleCreateTheme() {
    const title = draftTitle.trim()

    if (!title || !rootThemeId) {
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const themeId = await createTheme(
        {
          title,
          parent_id: rootThemeId,
          is_group: false,
          tech_version: 'minimum',
        },
        token,
      )

      const createdTheme = await getThemeById(themeId, token)
      addKnownThemeId(createdTheme.id)

      setThemes((currentThemes) => [...currentThemes, createdTheme])
      setDraftTitle('')
    } catch (error) {
      setSubmitError(
        error instanceof Error
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
            ? 'Получаю корневую тему и уже известные темы, созданные из приложения.'
            : loadState === 'error'
              ? `${errorMessage} Оставляю экран доступным в статичном режиме.`
              : ''

  const displayThemes = themes.length
    ? themes
    : [
        {
          id: 'fallback-root-theme',
          parent_id: null,
          author_id: null,
          title: 'Проект всего',
          is_group: false,
          created_at: '',
          updated_at: '',
        },
      ]

  const listForUi = useMemo(() => {
    const child = displayThemes.filter((t) => t.parent_id !== null)
    if (child.length > 0) {
      return child
    }
    return displayThemes
  }, [displayThemes])

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
          <span className="theme-module__head-title">Темы модули</span>
          <span className="theme-module__chevron" aria-hidden>
            {panelOpen ? '▲' : '▼'}
          </span>
        </button>

        {panelOpen ? (
          <>
            <ul className="theme-module__list">
              {listForUi.map((theme) => {
                const isChild = Boolean(theme.parent_id)
                return (
                  <li key={theme.id}>
                    <button
                      className="theme-module__list-link"
                      type="button"
                      onClick={() => {
                        navigate(`/themes/${theme.id}/description`, {
                          state: { themeTitle: theme.title },
                        })
                      }}
                    >
                      {theme.title}
                      {!isChild ? (
                        <span className="theme-module__list-meta"> (корневая)</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
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
                disabled={isSubmitting || !draftTitle.trim() || !token}
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

      <Link className="desc-screen__tab-link" to="/">
        Вернуться на главный экран
      </Link>
    </div>
  )
}
