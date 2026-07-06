import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
import {
  getRootTheme,
  getThemeById,
  getThemeSections,
} from '../../../entities/theme/api/theme-api'
import { getSectionMeta } from '../../../entities/theme/lib/section-meta'
import {
  getSectionRouteKind,
  IKR_SUBSECTION_CODES,
  pathToPostChat,
  pathToTaskChat,
  type IkrSubsectionCode,
} from '../../../entities/theme/lib/section-routing'
import {
  fetchIkrSubsectionsFilled,
  isIkrBlockComplete,
  type IkrSubsectionFilled,
} from '../../../entities/theme/lib/ikr-ui'
import { getKnownThemeIds, saveKnownThemeIds } from '../../../entities/theme/model/theme-catalog'
import type { Theme, ThemeSection, ThemeWithSections } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { HttpError } from '../../../shared/api/http-client'
import { PageState } from '../../../shared/ui/page-state'
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

const HOME_BUTTON_LABEL: Record<string, string> = {
  experience_exchange: 'Обмен опытом',
  description: 'Описание',
  perfect_result: 'ИКР',
  project_modules: 'Модули проекта',
}

type NavigateSectionParams = {
  theme: { id: string; title: string }
  sections: ThemeSection[]
  sectionCode: string
  navigate: NavigateFunction
  setIkrOpen: Dispatch<SetStateAction<Record<string, boolean>>>
}

function navigateToSection(p: NavigateSectionParams) {
  const { theme, sections, sectionCode, navigate, setIkrOpen } = p
  const app = getTelegramWebApp()
  const kind = getSectionRouteKind(sectionCode)
  if (!kind) {
    app?.showAlert?.(`Код «${sectionCode}» не поддержан в приложении.`)
    return
  }
  if (kind === 'ikr_group') {
    setIkrOpen((prev) => ({
      ...prev,
      [theme.id]: !prev[theme.id],
    }))
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

  const state = { themeTitle: theme.title, sectionCode }

  if (kind === 'description') {
    navigate(`/themes/${theme.id}/description`, { state })
    return
  }
  if (kind === 'project_modules') {
    navigate('/themes/manage')
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
    created_at: '',
    updated_at: '',
  },
  sections: [
    { section_id: 'fallback-experience', section_code: 'experience_exchange' },
    { section_id: 'fallback-description', section_code: 'description' },
    { section_id: 'fallback-perfect-result', section_code: 'perfect_result' },
    { section_id: 'fallback-project-modules', section_code: 'project_modules' },
  ],
}

async function loadKnownThemes(token: string): Promise<ThemeWithSections[]> {
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

  const themes = [rootTheme, ...validExtraThemes]

  return Promise.all(
    themes.map(async (theme) => ({
      theme,
      sections: await getThemeSections(theme.id, token),
    })),
  )
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
  const [reloadKey, setReloadKey] = useState(0)
  const [ikrOpenByTheme, setIkrOpenByTheme] = useState<Record<string, boolean>>(
    {},
  )
  /** Заполненность трёх подвкладок ИКР (посты через GET …/posts). */
  const [ikrFilledByTheme, setIkrFilledByTheme] = useState<
    Record<string, IkrSubsectionFilled | undefined>
  >({})

  useEffect(() => {
    let isMounted = true

    async function run() {
      setLoadState('loading')
      setErrorMessage('')

      try {
        const nextThemes = await loadKnownThemes(token)

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
  }, [reloadKey, token])

  useEffect(() => {
    if (!token || loadState !== 'ready') {
      return
    }

    let cancelled = false

    async function fillIkr() {
      try {
        const next: Record<string, IkrSubsectionFilled | undefined> = {}
        await Promise.all(
          themes.map(async ({ theme: t, sections }) => {
            try {
              const fill = await fetchIkrSubsectionsFilled(t.id, sections, token)
              next[t.id] = fill
            } catch {
              next[t.id] = undefined
            }
          }),
        )
        if (!cancelled) {
          setIkrFilledByTheme(next)
        }
      } catch {
        //
      }
    }

    void fillIkr()
    return () => {
      cancelled = true
    }
  }, [token, themes, loadState])

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

    return displayThemes.filter((item) =>
      item.theme.title.toLowerCase().includes(normalizedSearch),
    )
  }, [search, rootThemeEntry])

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

  return (
    <div className="page page--home">
      <header className="forum-home-toolbar">
        <button className="forum-home-toolbar__icon-btn" type="button" aria-label="Меню">
          <img src={burgerImg} alt="" width={32} height={32} />
        </button>
        <div className="forum-home-search">
          <input
            className="forum-home-search__input"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
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

      {filteredThemes.length === 0 ? (
        <PageState
          title="Темы не найдены"
          description="Измени поисковый запрос или создай новую тему в модуле управления."
        />
      ) : (
        <>
          {filteredThemes.map(({ theme, sections }) => {
            const byCode = new Map(sections.map((s) => [s.section_code, s]))
            const ikrOpen = ikrOpenByTheme[theme.id] ?? false
            const footerTheme = rootThemeEntry?.theme ?? theme
            const footerSections = rootThemeEntry?.sections ?? sections

            function go(code: string) {
              navigateToSection({
                theme: footerTheme,
                sections: footerSections,
                sectionCode: code,
                navigate,
                setIkrOpen: setIkrOpenByTheme,
              })
            }

            function goSectionForCard(code: string) {
              navigateToSection({
                theme,
                sections,
                sectionCode: code,
                navigate,
                setIkrOpen: setIkrOpenByTheme,
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
                  {byCode.get('description') ? (
                    <button
                      type="button"
                      className="forum-home-section-btn"
                      onClick={() => {
                        goSectionForCard('description')
                      }}
                    >
                      {HOME_BUTTON_LABEL.description}
                    </button>
                  ) : null}
                  {byCode.get('perfect_result') ? (
                    <button
                      type="button"
                      className={[
                        'forum-home-section-btn forum-home-section-btn--ikr-main',
                        (() => {
                          const fill = ikrFilledByTheme[theme.id]
                          if (!fill) {
                            return 'forum-home-section-btn--ikr-accent'
                          }
                          return isIkrBlockComplete(fill)
                            ? 'forum-home-section-btn--ikr-filled'
                            : 'forum-home-section-btn--ikr-accent'
                        })(),
                      ]
                        .join(' ')
                        .trim()}
                      onClick={() => {
                        goSectionForCard('perfect_result')
                      }}
                    >
                      {HOME_BUTTON_LABEL.perfect_result}
                      {ikrOpen ? ' ▲' : ' ▼'}
                    </button>
                  ) : null}
                  {ikrOpen
                    ? IKR_SUBSECTION_CODES.map((code) => {
                        if (!byCode.get(code)) {
                          return null
                        }
                        const fill = ikrFilledByTheme[theme.id]
                        const subsectionFilled =
                          fill?.[code as IkrSubsectionCode] ?? false
                        const subCls = subsectionFilled
                          ? 'forum-home-section-btn forum-home-section-btn--sub forum-home-section-btn--sub-ikr forum-home-section-btn--ikr-sub-filled'
                          : 'forum-home-section-btn forum-home-section-btn--sub forum-home-section-btn--sub-ikr forum-home-section-btn--ikr-accent'
                        return (
                          <button
                            key={code}
                            type="button"
                            className={subCls}
                            onClick={() => {
                              goSectionForCard(code)
                            }}
                          >
                            {getSectionMeta(code).title}
                          </button>
                        )
                      })
                    : null}
                  {byCode.get('project_modules') ? (
                    <button
                      type="button"
                      className="forum-home-section-btn"
                      onClick={() => {
                        goSectionForCard('project_modules')
                      }}
                    >
                      {HOME_BUTTON_LABEL.project_modules}
                    </button>
                  ) : null}
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
