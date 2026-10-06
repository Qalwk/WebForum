import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, type NavigateFunction } from 'react-router-dom'
import {
  getThemeById,
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
import type { Theme, ThemeSection, ThemeWithSections } from '../../../entities/theme/model/types'
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

async function loadTheme(themeId: string | undefined, token: string): Promise<ThemeWithSections> {
  const theme = themeId ? await getThemeById(themeId, token) : await getRootTheme(token)
  return { theme, sections: await getThemeSections(theme.id, token) }
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
  const { themeId } = useParams()
  const { search: locationSearch, hash: locationHash } = useLocation()
  const { token, authStatus, authError, isTelegram, clearToken } = useSession()
  const [search, setSearch] = useState('')
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentTheme, setCurrentTheme] = useState<ThemeWithSections | null>(null)
  const [loadedThemeId, setLoadedThemeId] = useState<string | undefined>()
  const [searchResults, setSearchResults] = useState<Theme[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchState, setSearchState] = useState<LoadState>('idle')
  const [searchError, setSearchError] = useState('')
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false)
  const [searchRetryKey, setSearchRetryKey] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useTelegramBackButton(isTelegram && Boolean(themeId), () => {
    const parentId = loadedThemeId === themeId ? currentTheme?.theme.parent_id : null
    navigate(parentId ? `/themes/${parentId}` : '/')
  })

  useEffect(() => {
    if (!searchOpen) {
      return
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [searchOpen])

  useEffect(() => {
    let isMounted = true

    async function run() {
      setLoadState('loading')
      setErrorMessage('')
      setCurrentTheme(null)

      try {
        const nextTheme = await loadTheme(themeId, token)

        if (!isMounted) {
          return
        }

        setCurrentTheme(nextTheme)
        setLoadedThemeId(themeId)
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
  }, [clearToken, reloadKey, themeId, token])

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

          if (!isCurrent) {
            return
          }

          setSearchResults((current) =>
            searchOffset === 0 ? foundThemes : [...current, ...foundThemes],
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

  const displayedTheme = loadedThemeId === themeId ? currentTheme : null

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

    return ''
  }, [authError, authStatus, isTelegram, token])

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
        <div
          className="forum-home-search"
          ref={searchContainerRef}
          onBlur={(event) => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
              setSearchOpen(false)
            }
          }}
        >
          <input
            className="forum-home-search__input"
            type="search"
            value={search}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false)
                event.currentTarget.blur()
              }
            }}
            onChange={(event) => {
              setSearch(event.target.value)
              setSearchOpen(true)
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
          {searchOpen && search.trim() ? (
            <div
              className="forum-home-search__dropdown"
              id="forum-home-search-results"
              role="region"
              aria-label="Результаты поиска тем"
            >
              {!token || searchState === 'idle' ||
              (searchState === 'loading' && searchResults.length === 0) ? (
                <p className="forum-home-search__message">Ищу темы…</p>
              ) : null}
              {searchState === 'error' ? (
                <div className="forum-home-search__message" role="alert">
                  <span>{searchError}</span>
                  <button type="button" onClick={() => setSearchRetryKey((value) => value + 1)}>
                    Повторить
                  </button>
                </div>
              ) : null}
              {searchState === 'ready' && searchResults.length === 0 ? (
                <p className="forum-home-search__message">Темы не найдены.</p>
              ) : null}
              {searchResults.map((theme) => (
                <button
                  className="forum-home-search__option"
                  type="button"
                  key={theme.id}
                  onClick={() => {
                    setSearch('')
                    setSearchOpen(false)
                    navigate(`/themes/${theme.id}`)
                  }}
                >
                  {theme.title}
                </button>
              ))}
              {hasMoreSearchResults ? (
                <button
                  className="forum-home-search__more"
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
            </div>
          ) : null}
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
        </section>
      ) : null}

      {!displayedTheme ? (
        <PageState
          title={loadState === 'error' ? 'Не удалось открыть тему' : 'Загружаю тему…'}
          description={loadState === 'error' ? errorMessage : 'Получаю тему с сервера.'}
          action={loadState === 'error' ? {
            label: 'Повторить',
            onClick: () => setReloadKey((value) => value + 1),
          } : undefined}
        />
      ) : (
        <>
          {[displayedTheme].map(({ theme, sections }) => {
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
                      if (theme.parent_id) {
                        navigate(`/themes/${theme.parent_id}`)
                      } else {
                        getTelegramWebApp()?.close()
                      }
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
        </>
      )}
    </div>
  )
}
