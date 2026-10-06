import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
import {
  getRootTheme,
  getThemeSections,
  searchThemes,
} from '../../../entities/theme/api/theme-api'
import { getSectionMeta } from '../../../entities/theme/lib/section-meta'
import {
  getSectionRouteKind,
  pathToPostChat,
  pathToTaskChat,
} from '../../../entities/theme/lib/section-routing'
import type { ThemeSection, ThemeWithSections } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { HttpError } from '../../../shared/api/http-client'
import { PageState } from '../../../shared/ui/page-state'
import { ForumMenu } from '../../../shared/ui/forum-menu'
import { getTelegramWebApp } from '../../../shared/lib/telegram-web-app'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

import burgerImg from '../../../assets/home-legacy/burger.webp'
import shareImg from '../../../assets/home-legacy/share.webp'
import bellImg from '../../../assets/home-legacy/bell.webp'
import iconBackImg from '../../../assets/home-legacy/back.webp'
import iconTimeImg from '../../../assets/home-legacy/time.webp'
import iconPautineImg from '../../../assets/home-legacy/pautineSimple.webp'
import iconMessengerImg from '../../../assets/home-legacy/messangerSimple.webp'
import resumeRowImg from '../../../assets/home-legacy/resume.webp'
import footerPigImg from '../../../assets/home-legacy/pigSimple.webp'
import footerHeadImg from '../../../assets/home-legacy/headSimple.webp'
import footerTypewriterImg from '../../../assets/home-legacy/typewriterSimple.webp'
import footerGearImg from '../../../assets/home-legacy/gearSimple.webp'
import footerMicroscopeImg from '../../../assets/home-legacy/microscopeSimple.webp'

type LoadState = 'idle' | 'loading' | 'error' | 'ready'
const SEARCH_PAGE_SIZE = 20

const HOME_BUTTON_LABEL: Record<string, string> = {
  experience_exchange: 'Обмен опытом',
  description: 'Описание',
  ikr: 'ИКР',
  project_modules: 'Модули проекта',
}

type NavigateSectionParams = {
  theme: { id: string; title: string }
  sections: ThemeSection[]
  sectionCode: string
  navigate: NavigateFunction
}

function navigateToSection(p: NavigateSectionParams) {
  const { theme, sections, sectionCode, navigate } = p
  const app = getTelegramWebApp()
  const kind = getSectionRouteKind(sectionCode)
  if (!kind) {
    app?.showAlert?.(`Код «${sectionCode}» не поддержан в приложении.`)
    return
  }
  if (kind === 'ikr_group') {
    navigate(`/themes/${theme.id}/ikr`, {
      state: { themeTitle: theme.title, sectionCode },
    })
    return
  }

  const state = { themeTitle: theme.title, sectionCode }
  if (kind === 'description') {
    navigate(`/themes/${theme.id}/description`, { state })
    return
  }
  if (kind === 'ikr_field') {
    navigate(`/themes/${theme.id}/ikr`, { state })
    return
  }
  if (kind === 'project_modules') {
    navigate(`/themes/${theme.id}/manage`)
    return
  }

  const row = sections.find((s) => s.section_code === sectionCode)
  if (!row) {
    const title = getSectionMeta(sectionCode).title
    app?.showAlert?.(
      `Секция «${title}» не пришла с сервера. Обновите список или проверьте тему в админке.`,
    )
    return
  }

  if (kind === 'post_messages') {
    navigate(pathToPostChat(theme.id, row.section_id), { state })
    return
  }
  if (kind === 'task_messages') {
    navigate(pathToTaskChat(theme.id, row.section_id), { state })
    return
  }
}

const FALLBACK_THEME: ThemeWithSections = {
  theme: {
    id: 'fallback-root-theme',
    parent_id: null,
    author_id: null,
    title: 'Название раздела',
    is_group: false,
    description: null,
    ikr_desirable_effects: null,
    ikr_undesirable_effects: null,
    ikr_technical_modeling: null,
    created_at: '',
    updated_at: '',
  },
  sections: [
    { section_id: 'fallback-experience', section_code: 'experience_exchange' },
    { section_id: 'fallback-project-modules', section_code: 'project_modules' },
  ],
}

async function loadRootTheme(token: string): Promise<ThemeWithSections[]> {
  const rootTheme = await getRootTheme(token)
  return [{ theme: rootTheme, sections: await getThemeSections(rootTheme.id, token) }]
}

function isTokenExpiredError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 401) {
      return true
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return /expired|истёк|истек/i.test(message)
}

export function HomePage() {
  const navigate = useNavigate()
  const { search: locationSearch, hash: locationHash } = useLocation()
  const { token, authStatus, authError, isTelegram, clearToken } = useSession()
  useTelegramBackButton(false, () => {})
  const [search, setSearch] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [themes, setThemes] = useState<ThemeWithSections[]>([])
  const [searchResults, setSearchResults] = useState<ThemeWithSections[]>([])
  const [searchState, setSearchState] = useState<LoadState>('idle')
  const [searchError, setSearchError] = useState('')
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false)
  const [searchRetryKey, setSearchRetryKey] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function run() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const nextThemes = await loadRootTheme(token)

        if (!isMounted) {
          return
        }

        setThemes(nextThemes)
        setLoadState('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (isTokenExpiredError(error)) {
          clearToken()
          setLoadState('idle')
          setErrorMessage('')
          return
        }

        setLoadState('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не удалось загрузить темы и разделы.',
        )
      }
    }

    if (token) {
      void run()
    }

    return () => {
      isMounted = false
    }
  }, [clearToken, reloadKey, token])

  useEffect(() => {
    const query = search.trim()
    if (!token || !query) {
      return
    }

    let isCurrent = true
    const timer = window.setTimeout(() => {
      async function runSearch() {
        setSearchState('loading')
        setSearchError('')

        try {
          const foundThemes = await searchThemes(query, token, {
            limit: SEARCH_PAGE_SIZE,
            offset: searchOffset,
          })
          const entries = await Promise.all(
            foundThemes.map(async (theme) => ({
              theme,
              sections: await getThemeSections(theme.id, token).catch((error: unknown) => {
                if (isTokenExpiredError(error)) {
                  throw error
                }
                return []
              }),
            })),
          )

          if (!isCurrent) {
            return
          }

          setSearchResults((current) =>
            searchOffset === 0 ? entries : [...current, ...entries],
          )
          setHasMoreSearchResults(foundThemes.length === SEARCH_PAGE_SIZE)
          setSearchState('ready')
        } catch (error) {
          if (!isCurrent) {
            return
          }
          if (isTokenExpiredError(error)) {
            clearToken()
            return
          }
          setSearchError(
            error instanceof Error ? error.message : 'Не удалось выполнить поиск тем.',
          )
          setSearchState('error')
        }
      }

      void runSearch()
    }, searchOffset === 0 ? 300 : 0)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
    }
  }, [clearToken, search, searchOffset, searchRetryKey, token])

  const rootThemeEntry = useMemo(() => {
    const sourceThemes = themes.length > 0 ? themes : [FALLBACK_THEME]
    return (
      sourceThemes.find((item) => item.theme.parent_id === null) ?? sourceThemes[0]
    )
  }, [themes])

  const filteredThemes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const displayThemes = rootThemeEntry ? [rootThemeEntry] : [FALLBACK_THEME]

    if (!normalizedSearch) {
      return displayThemes
    }

    if (token) {
      return searchResults
    }

    return displayThemes.filter((item) =>
      item.theme.title.toLowerCase().includes(normalizedSearch),
    )
  }, [search, rootThemeEntry, searchResults, token])

  const notice = useMemo(() => {
    if (authStatus === 'checking_telegram') {
      return 'Подключаю Telegram Mini App и жду initData…'
    }

    if (authStatus === 'authenticating') {
      return 'Авторизуюсь через Telegram. Пока показываю экран в режиме предпросмотра.'
    }

    if (!token) {
      return isTelegram
        ? authError ||
            'Не удалось получить Telegram-сессию. Показываю экран в режиме предпросмотра.'
        : 'Нет access token: откройте приложение из Telegram или задайте VITE_API_BEARER_TOKEN для разработки. Показываю предпросмотр.'
    }

    if (loadState === 'loading' || loadState === 'idle') {
      return 'Загружаю темы и разделы из backend API.'
    }

    if (loadState === 'error') {
      return `${errorMessage} Показываю запасной экран, чтобы можно было продолжить навигацию.`
    }

    return ''
  }, [authError, authStatus, errorMessage, isTelegram, loadState, token])

  if (isMenuOpen) {
    return <ForumMenu onClose={() => setIsMenuOpen(false)} />
  }

  return (
    <div className="page page--home">
      <header className="forum-home-toolbar">
        <button
          className="forum-home-toolbar__icon-btn"
          type="button"
          aria-label="Меню"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        >
          <img src={burgerImg} alt="" width={32} height={32} />
        </button>
        <div className="forum-home-search">
          <input
            className="forum-home-search__input"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setSearchOffset(0)
              setSearchResults([])
              setHasMoreSearchResults(false)
              setSearchState('idle')
              setSearchError('')
            }}
            placeholder="Поиск"
            aria-label="Поиск темы по названию"
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>
        <div className="forum-home-toolbar__right">
          <button className="forum-home-toolbar__icon-btn" type="button" aria-label="Поделиться">
            <img src={shareImg} alt="" width={32} height={32} />
          </button>
          <button
            className="forum-home-toolbar__icon-btn"
            type="button"
            aria-label="Уведомления"
            onClick={() => {
              navigate({
                pathname: '/notifications',
                search: locationSearch,
                hash: locationHash,
              })
            }}
          >
            <img src={bellImg} alt="" width={32} height={32} />
          </button>
        </div>
      </header>

      {notice ? (
        <section className="forum-home-notice">
          <p>{notice}</p>
          {loadState === 'error' && token ? (
            <button
              className="button button--secondary"
              style={{ marginTop: 10 }}
              type="button"
              onClick={() => {
                setReloadKey((value) => value + 1)
              }}
            >
              Повторить загрузку
            </button>
          ) : null}
        </section>
      ) : null}

      {search.trim() && token && searchState === 'error' ? (
        <section className="forum-home-notice" role="alert">
          <p>{searchError}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setSearchRetryKey((value) => value + 1)}
          >
            Повторить поиск
          </button>
        </section>
      ) : null}

      {search.trim() && token &&
      (searchState === 'idle' || searchState === 'loading') &&
      searchResults.length === 0 ? (
        <PageState title="Ищу темы…" description="Получаю результаты с сервера." />
      ) : search.trim() && token && searchState === 'error' && searchResults.length === 0 ? (
        null
      ) : filteredThemes.length === 0 ? (
        <PageState
          title="Темы не найдены"
          description="Измени поисковый запрос или создай новую тему в модуле управления."
        />
      ) : (
        <>
          {filteredThemes.map(({ theme, sections }) => {
            const byCode = new Map(sections.map((s) => [s.section_code, s]))
            function go(code: string) {
              navigateToSection({
                theme,
                sections,
                sectionCode: code,
                navigate,
              })
            }

            function goSectionForCard(code: string) {
              navigateToSection({
                theme,
                sections,
                sectionCode: code,
                navigate,
              })
            }

            return (
              <section className="forum-home-theme" key={theme.id}>
                <div className="forum-home-theme__title-wrap">
                  <h1 className="forum-home-theme__title">{theme.title}</h1>
                </div>

                <div className="forum-home-theme__quick-icons">
                  <button
                    type="button"
                    aria-label="Назад"
                    onClick={() => {
                      getTelegramWebApp()?.close()
                    }}
                  >
                    <img src={iconBackImg} alt="" />
                  </button>
                  <button type="button" aria-label="История">
                    <img src={iconTimeImg} alt="" />
                  </button>
                  <button type="button" aria-label="Структура">
                    <img src={iconPautineImg} alt="" />
                  </button>
                  <button
                    type="button"
                    aria-label="Обсуждения"
                    onClick={() => {
                      goSectionForCard('discussion')
                    }}
                  >
                    <img src={iconMessengerImg} alt="" />
                  </button>
                  <button type="button" aria-label="Резюме">
                    <img
                      className="forum-home-icon--resume"
                      src={resumeRowImg}
                      alt=""
                    />
                  </button>
                </div>

                <div className="forum-home-sections">
                  {byCode.get('experience_exchange') ? (
                    <button
                      type="button"
                      className="forum-home-section-btn forum-home-section-btn--experience"
                      onClick={() => {
                        goSectionForCard('experience_exchange')
                      }}
                    >
                      {HOME_BUTTON_LABEL.experience_exchange}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="forum-home-section-btn"
                    onClick={() => {
                      goSectionForCard('description')
                    }}
                  >
                    {HOME_BUTTON_LABEL.description}
                  </button>
                  <button
                    type="button"
                    className={[
                      'forum-home-section-btn forum-home-section-btn--ikr-main',
                      theme.ikr_desirable_effects?.trim() &&
                      theme.ikr_technical_modeling?.trim() &&
                      theme.ikr_undesirable_effects?.trim()
                        ? 'forum-home-section-btn--ikr-filled'
                        : 'forum-home-section-btn--ikr-accent',
                    ].join(' ')}
                    onClick={() => {
                      goSectionForCard('ikr')
                    }}
                  >
                    {HOME_BUTTON_LABEL.ikr}
                  </button>
                  <button
                    type="button"
                    className="forum-home-section-btn"
                    onClick={() => {
                      goSectionForCard('project_modules')
                    }}
                  >
                    {HOME_BUTTON_LABEL.project_modules}
                  </button>
                </div>

                <footer className="forum-home-footer" aria-label="Нижняя панель">
                  <div className="forum-home-footer__inner">
                    <button
                      type="button"
                      aria-label="Копилка идей"
                      onClick={() => {
                        go('chat_ideas')
                      }}
                    >
                      <img
                        className="forum-home-footer__icon--pig"
                        src={footerPigImg}
                        alt=""
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Чат вопросов"
                      onClick={() => {
                        go('chat_qa')
                      }}
                    >
                      <img src={footerHeadImg} alt="" />
                    </button>
                    <button
                      type="button"
                      aria-label="Чат публикаций"
                      onClick={() => {
                        go('chat_publications')
                      }}
                    >
                      <img src={footerTypewriterImg} alt="" />
                    </button>
                    <button
                      type="button"
                      aria-label="Чат задач"
                      onClick={() => {
                        go('chat_tasks')
                      }}
                    >
                      <img src={footerGearImg} alt="" />
                    </button>
                    <button
                      type="button"
                      aria-label="Лаборатория экспериментов"
                      onClick={() => {
                        go('chat_experiments')
                      }}
                    >
                      <img src={footerMicroscopeImg} alt="" />
                    </button>
                  </div>
                </footer>
              </section>
            )
          })}
          {search.trim() && token && hasMoreSearchResults ? (
            <button
              className="button button--secondary"
              type="button"
              disabled={searchState === 'loading'}
              onClick={() => {
                setSearchState('loading')
                setSearchOffset((offset) => offset + SEARCH_PAGE_SIZE)
              }}
            >
              {searchState === 'loading' ? 'Загружаю…' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
