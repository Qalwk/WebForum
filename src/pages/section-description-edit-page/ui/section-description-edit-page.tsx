import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getThemeById } from '../../../entities/theme/api/theme-api'
import { useSession } from '../../../entities/session/model/session-context'
import { PageState } from '../../../shared/ui/page-state'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'

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
  const [heading, setHeading] = useState('[Заголовок раздела]')
  const [body, setBody] = useState('')
  const [loadError, setLoadError] = useState('')

  useTelegramBackButton(isTelegram && Boolean(themeId), () => {
    if (!themeId) {
      return
    }
    navigate(`/themes/${themeId}/description`, {
      state: { themeTitle: themeTitle || undefined },
    })
  })

  useEffect(() => {
    let active = true

    async function run() {
      if (!themeId || !token || themeTitle) {
        return
      }
      try {
        const theme = await getThemeById(themeId, token)
        if (active) {
          setThemeTitle(theme.title)
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Не удалось загрузить тему.',
          )
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [themeId, token, themeTitle])

  if (!themeId) {
    return (
      <PageState
        title="Раздел не найден"
        description="Не передан идентификатор темы."
        action={{ label: 'На главный', onClick: () => navigate('/') }}
      />
    )
  }

  function handlePublish() {
    navigate(`/themes/${themeId}/description`, {
      state: { themeTitle: themeTitle || undefined },
    })
  }

  return (
    <div className="page page--description-edit desc-edit">
      <header className="desc-screen__header">
        <button
          className="desc-screen__back"
          type="button"
          onClick={() => navigate(`/themes/${themeId}/description`, {
            state: { themeTitle: themeTitle || undefined },
          })}
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

      {loadError ? (
        <p className="desc-screen__warn">{loadError}</p>
      ) : null}

      <div className="desc-edit__body">
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
          autoComplete="off"
        />
        <label className="visually-hidden" htmlFor="desc-body">
          Текст описания
        </label>
        <textarea
          id="desc-body"
          className="desc-edit__textarea"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
          }}
          placeholder="Начните описание раздела…"
          rows={12}
        />
      </div>

      <div className="desc-edit__toolbar" role="toolbar" aria-label="Форматирование">
        <button type="button" className="desc-edit__tool" aria-label="Жирный">
          B
        </button>
        <button type="button" className="desc-edit__tool" aria-label="Курсив">
          З
        </button>
        <button type="button" className="desc-edit__tool" aria-label="Подчёркивание">
          A
        </button>
        <span className="desc-edit__tool-sep" aria-hidden>
          |
        </span>
        <button type="button" className="desc-edit__tool" aria-label="Ссылка">
          🔗
        </button>
        <button type="button" className="desc-edit__tool" aria-label="Вложение">
          📎
        </button>
        <button
          type="button"
          className="desc-edit__publish"
          onClick={handlePublish}
        >
          Опубликовать
        </button>
      </div>
    </div>
  )
}
