import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getThemeById, updateTheme } from '../../../entities/theme/api/theme-api'
import type { Theme, UpdateThemePayload } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { PageState } from '../../../shared/ui/page-state'

const IKR_FIELDS = [
  {
    key: 'ikr_desirable_effects',
    title: 'Желаемые эффекты',
    placeholder: 'Опишите целевой результат и полезные эффекты…',
  },
  {
    key: 'ikr_technical_modeling',
    title: 'Техническое моделирование',
    placeholder: 'Опишите модель решения, элементы системы и связи…',
  },
  {
    key: 'ikr_undesirable_effects',
    title: 'Нежелательные эффекты',
    placeholder: 'Опишите риски и нежелательные последствия…',
  },
] as const

type IkrKey = (typeof IKR_FIELDS)[number]['key']
type Draft = Record<IkrKey, string>

function draftFromTheme(theme: Theme): Draft {
  return {
    ikr_desirable_effects: theme.ikr_desirable_effects ?? '',
    ikr_technical_modeling: theme.ikr_technical_modeling ?? '',
    ikr_undesirable_effects: theme.ikr_undesirable_effects ?? '',
  }
}

export function ThemeIkrPage() {
  const navigate = useNavigate()
  const { search, hash } = useLocation()
  const { themeId } = useParams()
  const { token, isTelegram } = useSession()
  const [theme, setTheme] = useState<Theme | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function goHome() {
    navigate({ pathname: '/', search, hash })
  }

  useTelegramBackButton(isTelegram, goHome)

  useEffect(() => {
    if (!themeId || !token) return
    let active = true
    void getThemeById(themeId, token)
      .then((loaded) => {
        if (!active) return
        setTheme(loaded)
        setDraft(draftFromTheme(loaded))
        setError('')
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить ИКР.')
        }
      })
    return () => {
      active = false
    }
  }, [themeId, token])

  async function save() {
    if (!themeId || !token || !theme || !draft) return
    const initial = draftFromTheme(theme)
    const payload: UpdateThemePayload = {}
    for (const { key } of IKR_FIELDS) {
      if (draft[key] !== initial[key]) {
        payload[key] = draft[key].trim() ? draft[key] : null
      }
    }
    if (Object.keys(payload).length === 0) {
      goHome()
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = await updateTheme(themeId, payload, token)
      setTheme(updated)
      setDraft(draftFromTheme(updated))
      goHome()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить ИКР.')
    } finally {
      setSaving(false)
    }
  }

  if (!themeId) {
    return <PageState title="Тема не найдена" description="Не передан идентификатор темы." />
  }

  return (
    <div className="page page--description-edit desc-edit">
      <header className="desc-screen__header">
        <button className="desc-screen__back" type="button" onClick={goHome}>
          <span className="desc-screen__back-chevron" aria-hidden>‹</span>
          Назад
        </button>
        <h1 className="desc-screen__title desc-screen__title--smaller">ИКР</h1>
      </header>

      {theme ? <p className="desc-screen__prompt">{theme.title}</p> : null}
      {error ? <p className="desc-screen__warn">{error}</p> : null}

      <div className="desc-edit__body">
        {draft
          ? IKR_FIELDS.map(({ key, title, placeholder }) => (
              <label className="desc-edit__field" key={key} htmlFor={key}>
                <span>{title}</span>
                <textarea
                  id={key}
                  className="desc-edit__textarea"
                  value={draft[key]}
                  onChange={(event) => {
                    setDraft({ ...draft, [key]: event.target.value })
                  }}
                  placeholder={placeholder}
                  rows={7}
                />
              </label>
            ))
          : null}
      </div>

      <div className="desc-edit__toolbar" role="group" aria-label="Сохранение ИКР">
        <button
          type="button"
          className="desc-edit__publish"
          onClick={() => void save()}
          disabled={saving || !draft || !token}
        >
          {saving ? 'Сохраняю…' : 'Сохранить ИКР'}
        </button>
      </div>
    </div>
  )
}
