import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getRootTheme,
  getThemeById,
  getThemeSections,
} from '../../../entities/theme/api/theme-api'
import { getSectionMeta } from '../../../entities/theme/lib/section-meta'
import { getKnownThemeIds, saveKnownThemeIds } from '../../../entities/theme/model/theme-catalog'
import type { Theme, ThemeSection, ThemeWithSections } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
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
import resumeRowImg from '../../../assets/home-legacy/resumeUser.png'
import footerPigImg from '../../../assets/home-legacy/pigSimple.webp'
import footerHeadImg from '../../../assets/home-legacy/headSimple.webp'
import footerTypewriterImg from '../../../assets/home-legacy/typewriterSimple.webp'
import footerGearImg from '../../../assets/home-legacy/gearSimple.webp'
import footerMicroscopeImg from '../../../assets/home-legacy/microscopeSimple.webp'

type LoadState = 'idle' | 'loading' | 'error' | 'ready'

const HOME_SECTION_ORDER = [
  'experience_exchange',
  'description',
  'perfect_result',
  'project_modules',
] as const

const HOME_BUTTON_LABEL: Record<string, string> = {
  experience_exchange: 'Обмен опытом',
  description: 'Описание',
  perfect_result: 'Идеальный результат',
  project_modules: 'Модули проекта',
}

function sortSectionsForHome(sections: ThemeSection[]): ThemeSection[] {
  const byCode = new Map(sections.map((s) => [s.section_code, s]))
  const ordered: ThemeSection[] = []
  for (const code of HOME_SECTION_ORDER) {
    const section = byCode.get(code)
    if (section) {
      ordered.push(section)
    }
  }
  for (const section of sections) {
    if (!HOME_SECTION_ORDER.includes(section.section_code as (typeof HOME_SECTION_ORDER)[number])) {
      ordered.push(section)
    }
  }
  return ordered
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

export function HomePage() {
  const navigate = useNavigate()
  const { token, authStatus, authError, isTelegram } = useSession()
  useTelegramBackButton(false, () => {})
  const [search, setSearch] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [themes, setThemes] = useState<ThemeWithSections[]>([])
  const [reloadKey, setReloadKey] = useState(0)

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

  const filteredThemes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const sourceThemes = themes.length > 0 ? themes : [FALLBACK_THEME]

    if (!normalizedSearch) {
      return sourceThemes
    }

    return sourceThemes.filter((item) =>
      item.theme.title.toLowerCase().includes(normalizedSearch),
    )
  }, [search, themes])

  const notice = useMemo(() => {
    if (authStatus === 'checking_telegram') {
      return 'Подключаю Telegram Mini App. Если Telegram передаст initDataRaw, данные подтянутся автоматически.'
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
          <button className="forum-home-toolbar__icon-btn" type="button" aria-label="Уведомления">
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
            const ordered = sortSectionsForHome(sections)

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
                  <button type="button" aria-label="Сообщения">
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
                  {ordered.map((section) => {
                    const meta = getSectionMeta(section.section_code)
                    const label =
                      HOME_BUTTON_LABEL[section.section_code] ?? meta.title
                    const isDescription = section.section_code === 'description'
                    const isThemeModule = section.section_code === 'project_modules'
                    const isImplemented = isDescription || isThemeModule

                    return (
                      <button
                        key={section.section_id}
                        type="button"
                        className="forum-home-section-btn"
                        disabled={!isImplemented}
                        onClick={() => {
                          if (isDescription) {
                            navigate(`/themes/${theme.id}/description`, {
                              state: { themeTitle: theme.title },
                            })
                            return
                          }
                          if (isThemeModule) {
                            navigate('/themes/manage')
                          }
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <footer className="forum-home-footer" aria-label="Нижняя панель">
            <div className="forum-home-footer__inner">
              <button type="button" aria-label="Копилка">
                <img
                  className="forum-home-footer__icon--pig"
                  src={footerPigImg}
                  alt=""
                />
              </button>
              <button type="button" aria-label="Вопросы">
                <img src={footerHeadImg} alt="" />
              </button>
              <button type="button" aria-label="Публикации">
                <img src={footerTypewriterImg} alt="" />
              </button>
              <button type="button" aria-label="Задачи">
                <img src={footerGearImg} alt="" />
              </button>
              <button type="button" aria-label="Лаборатория">
                <img src={footerMicroscopeImg} alt="" />
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}
