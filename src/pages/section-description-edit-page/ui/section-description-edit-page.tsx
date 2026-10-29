import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getThemeById, updateTheme } from '../../../entities/theme/api/theme-api'
import { getCurrentUser } from '../../../entities/user/api/user-api'
import { useSession } from '../../../entities/session/model/session-context'
import { PageState } from '../../../shared/ui/page-state'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { TabAboutLink } from '../../../shared/ui/tab-about-link'
import { HttpError } from '../../../shared/api/http-client'

type EditLocationState = {
  themeTitle?: string
}

export function SectionDescriptionEditPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { themeId } = useParams()
  const { token, isTelegram } = useSession()
  const [themeTitle, setThemeTitle] = useState(
    (location.state as EditLocationState | null)?.themeTitle ?? '',
  )
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [loadError, setLoadError] = useState('')
  const [initialTitle, setInitialTitle] = useState('')
  const [initialBody, setInitialBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function insertMarkup(kind: 'heading' | 'bold' | 'link') {
    const textarea = bodyRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end)
    let insertion: string
    let selectStart: number
    let selectEnd: number
    if (kind === 'heading') {
      insertion = `# ${selected || 'Заголовок'}`
      selectStart = start + 2
      selectEnd = start + insertion.length
    } else if (kind === 'bold') {
      insertion = `**${selected || 'жирный текст'}**`
      selectStart = start + 2
      selectEnd = start + insertion.length - 2
    } else {
      insertion = `[${selected || 'текст ссылки'}](https://example.com)`
      selectStart = start + insertion.indexOf('https://')
      selectEnd = start + insertion.length - 1
    }
    setBody(`${body.slice(0, start)}${insertion}${body.slice(end)}`)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(selectStart, selectEnd)
    })
  }

  useTelegramBackButton(isTelegram && Boolean(themeId), () => {
    if (!themeId) {
      return
    }
    navigate(`/themes/${themeId}/description`, {
      state: { themeTitle: themeTitle || undefined },
      replace: true,
    })
  })

  useEffect(() => {
    let active = true

    async function run() {
      if (!themeId || !token) {
        if (active) setIsLoading(false)
        return
      }
      try {
        const [theme, user] = await Promise.all([
          getThemeById(themeId, token),
          getCurrentUser(token).catch(() => null),
        ])
        if (active) {
          setPermissionDenied(Boolean(theme.author_id && theme.author_id !== user?.id))
          setThemeTitle(theme.title)
          setHeading(theme.title)
          setBody(theme.description ?? '')
          setInitialTitle(theme.title)
          setInitialBody(theme.description ?? '')
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Не удалось загрузить тему.',
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [themeId, token])

  if (!themeId) {
    return (
      <PageState
        title="Раздел не найден"
        description="Не передан идентификатор темы."
        action={{ label: 'На главный', onClick: () => navigate('/') }}
      />
    )
  }

  async function handlePublish() {
    if (permissionDenied) return
    if (!themeId || !token) {
      setLoadError('Для сохранения нужна авторизация.')
      return
    }

    const nextTitle = heading.trim()
    if (nextTitle.length < 3 || nextTitle.length > 32) {
      setLoadError('Название темы должно содержать от 3 до 32 символов.')
      return
    }

    const payload: { title?: string; description?: string | null } = {}
    if (nextTitle !== initialTitle) {
      payload.title = nextTitle
    }
    if (body !== initialBody) {
      payload.description = body.trim() ? body : null
    }

    if (Object.keys(payload).length === 0) {
      navigate(`/themes/${themeId}/description`, {
        state: { themeTitle: nextTitle },
        replace: true,
      })
      return
    }

    setIsSaving(true)
    setLoadError('')
    try {
      const updated = await updateTheme(themeId, payload, token)
      navigate(`/themes/${themeId}/description`, {
        state: { themeTitle: updated.title },
        replace: true,
      })
    } catch (error) {
      if (error instanceof HttpError && error.status === 403) {
        setPermissionDenied(true)
      } else {
        setLoadError(
          error instanceof Error ? error.message : 'Не удалось сохранить тему.',
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page page--description-edit desc-edit">
      <header className="desc-screen__header">
        <button
          className="desc-screen__back"
          type="button"
          onClick={() =>
            navigate(`/themes/${themeId}/description`, {
              state: { themeTitle: themeTitle || undefined },
              replace: true,
            })
          }
        >
          <span className="desc-screen__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>
        <h1 className="desc-screen__title desc-screen__title--smaller">
          Описание раздела
        </h1>
      </header>

      <TabAboutLink themeId={themeId} sectionCode="description" />

      {loadError ? (
        <p className="desc-screen__warn">{loadError}</p>
      ) : null}
      {isLoading ? <p className="desc-screen__prompt desc-screen__loading">Загружаю описание…</p> : null}

      {permissionDenied ? (
        <div className="ikr-screen__permission" role="status">
          <p>Право редактировать описание не подтверждено. Для доступа обратитесь к администратору.</p>
          <button type="button" disabled title="Запрос прав пока не поддерживается сервером">
            Запросить право редактирования
          </button>
        </div>
      ) : null}

      {!permissionDenied && !isLoading ? <div className="desc-edit__body">
        <label className="visually-hidden" htmlFor="desc-heading">
          Заголовок раздела
        </label>
        <input
          id="desc-heading"
          className="desc-edit__heading"
          value={heading}
          onChange={(event) => {
            setHeading(event.target.value)
          }}
          placeholder="Заголовок раздела"
          autoComplete="off"
        />
        <label className="visually-hidden" htmlFor="desc-body">
          Текст описания
        </label>
        <div className="desc-edit__format" role="toolbar" aria-label="Форматирование описания">
          <button type="button" onClick={() => insertMarkup('heading')}>Заголовок</button>
          <button type="button" onClick={() => insertMarkup('bold')}>Жирный</button>
          <button type="button" onClick={() => insertMarkup('link')}>Ссылка</button>
        </div>
        <textarea
          id="desc-body"
          ref={bodyRef}
          className="desc-edit__textarea"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
          }}
          placeholder="Начните описание раздела…"
          rows={12}
        />
        <p className="desc-edit__format-hint">Для ссылки замените пример адреса на нужный URL.</p>
      </div> : null}

      {!permissionDenied && !isLoading ? <div className="desc-edit__toolbar" role="group" aria-label="Публикация">
        <button
          type="button"
          className="desc-edit__publish"
          onClick={() => void handlePublish()}
          disabled={isSaving || !token}
        >
          {isSaving ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div> : null}
    </div>
  )
}
