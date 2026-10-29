import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { improveMessageText } from '../../../entities/message/api/messages-api'
import { getThemeById, getThemeSections, updateTheme } from '../../../entities/theme/api/theme-api'
import type { Theme, ThemeSection, UpdateThemePayload } from '../../../entities/theme/model/types'
import { getCurrentUser } from '../../../entities/user/api/user-api'
import { useSession } from '../../../entities/session/model/session-context'
import { HttpError } from '../../../shared/api/http-client'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { PageState } from '../../../shared/ui/page-state'
import { TabAboutLink } from '../../../shared/ui/tab-about-link'

const IKR_FIELDS = [
  {
    key: 'ikr_desirable_effects',
    sectionCode: 'desirable_effects',
    title: 'Желаемые эффекты',
    placeholder: 'Опишите целевой результат и полезные эффекты…',
    hint: 'Опишите целевой результат: кому он полезен, что изменится после его достижения и по каким признакам будет понятно, что задача решена.',
  },
  {
    key: 'ikr_technical_modeling',
    sectionCode: 'technical_modeling',
    title: 'Техническое моделирование',
    placeholder: 'Опишите модель решения, элементы системы и связи…',
    hint: 'Опишите элементы решения, их связи и то, как система должна работать.',
  },
  {
    key: 'ikr_undesirable_effects',
    sectionCode: 'undesirable_effects',
    title: 'Нежелательные эффекты',
    placeholder: 'Опишите риски и нежелательные последствия…',
    hint: 'Укажите возможные побочные последствия, ограничения и риски решения.',
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
  const [sections, setSections] = useState<ThemeSection[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingKey, setEditingKey] = useState<IkrKey | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantText, setAssistantText] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function goHome() {
    navigate({ pathname: themeId ? `/themes/${themeId}` : '/', search, hash })
  }

  useTelegramBackButton(isTelegram, goHome)

  useEffect(() => {
    if (!themeId || !token) return
    let active = true
    async function load() {
      try {
        const [loaded, sectionRows, user] = await Promise.all([
          getThemeById(themeId!, token),
          getThemeSections(themeId!, token).catch(() => []),
          getCurrentUser(token).catch(() => null),
        ])
        if (!active) return
        setTheme(loaded)
        setDraft(draftFromTheme(loaded))
        setSections(sectionRows)
        setCurrentUserId(user?.id ?? null)
        setError('')
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить ИКР.')
      }
    }
    void load()
    return () => { active = false }
  }, [themeId, token])

  function beginEdit(key: IkrKey) {
    if (!theme) return
    if (theme.author_id && theme.author_id !== currentUserId) {
      setPermissionDenied(true)
      return
    }
    setPermissionDenied(false)
    setError('')
    setDraft(draftFromTheme(theme))
    setEditingKey(key)
    setAssistantOpen(false)
    setAssistantText('')
  }

  async function saveField() {
    if (!themeId || !token || !theme || !draft || !editingKey) return
    const value = draft[editingKey]
    if (value === (theme[editingKey] ?? '')) {
      setEditingKey(null)
      return
    }
    const payload: UpdateThemePayload = { [editingKey]: value.trim() ? value : null }
    setSaving(true)
    setError('')
    try {
      const updated = await updateTheme(themeId, payload, token)
      setTheme(updated)
      setDraft(draftFromTheme(updated))
      setEditingKey(null)
      setAssistantOpen(false)
      setAssistantText('')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 403) {
        setEditingKey(null)
        setPermissionDenied(true)
      } else {
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить ИКР.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function improveField(key: IkrKey, sectionCode: string) {
    if (!themeId || !token || !draft?.[key].trim()) return
    const section = sections.find((item) => item.section_code === sectionCode)
    if (!section) {
      setError('GPT для этой вкладки пока недоступен.')
      return
    }
    setAssistantBusy(true)
    setError('')
    try {
      const result = await improveMessageText(themeId, section.section_id, { text: draft[key] }, token)
      if (!result.output_text?.trim()) {
        setError('GPT не вернул вариант текста.')
        return
      }
      setAssistantText(result.output_text)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось получить вариант GPT.')
    } finally {
      setAssistantBusy(false)
    }
  }

  if (!themeId) {
    return <PageState title="Тема не найдена" description="Не передан идентификатор темы." />
  }

  return (
    <div className="page page--ikr desc-screen">
      <header className="desc-screen__header">
        <button className="desc-screen__back" type="button" onClick={goHome}>
          <span className="desc-screen__back-chevron" aria-hidden>‹</span>
          Назад
        </button>
        <h1 className="desc-screen__title">ИКР</h1>
      </header>

      <TabAboutLink themeId={themeId} sectionCode="ikr" />
      {theme ? <p className="ikr-screen__theme-title">{theme.title}</p> : null}
      {error ? <p className="desc-screen__warn" role="alert">{error}</p> : null}
      {permissionDenied ? (
        <div className="ikr-screen__permission" role="status">
          <p>Право редактировать ИКР не подтверждено. Для доступа обратитесь к администратору.</p>
          <button type="button" disabled title="Запрос прав пока не поддерживается сервером">
            Запросить право редактирования
          </button>
        </div>
      ) : null}

      <div className="ikr-screen__fields">
        {theme && draft ? IKR_FIELDS.map(({ key, sectionCode, title, placeholder, hint }) => (
          <section className="ikr-screen__field" key={key}>
            <div className="ikr-screen__field-heading">
              <h2>{title}</h2>
              <button
                type="button"
                className="ikr-screen__edit"
                aria-label={`Редактировать: ${title}`}
                onClick={() => beginEdit(key)}
              >
                ✎
              </button>
            </div>
            {key === 'ikr_desirable_effects' ? <p className="ikr-screen__hint">{hint}</p> : null}
            {editingKey === key ? (
              <div className="ikr-screen__editor">
                <textarea
                  className="desc-edit__textarea"
                  value={draft[key]}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                  placeholder={placeholder}
                  rows={7}
                />
                <button type="button" className="ikr-screen__assistant-toggle" onClick={() => setAssistantOpen((open) => !open)}>
                  ИИ-помощник
                </button>
                {assistantOpen ? (
                  <div className="ikr-screen__assistant">
                    <p>{hint}</p>
                    <button type="button" disabled={assistantBusy || !draft[key].trim()} onClick={() => void improveField(key, sectionCode)}>
                      {assistantBusy ? 'GPT обрабатывает…' : 'GPT: улучшить текст'}
                    </button>
                    {assistantText ? (
                      <div className="ikr-screen__assistant-result">
                        <p>{assistantText}</p>
                        <button type="button" onClick={() => { setDraft({ ...draft, [key]: assistantText }); setAssistantText('') }}>
                          Использовать вариант
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="ikr-screen__editor-actions">
                  <button type="button" onClick={() => { setEditingKey(null); setAssistantOpen(false); setAssistantText('') }}>
                    Отмена
                  </button>
                  <button type="button" className="desc-edit__publish" disabled={saving} onClick={() => void saveField()}>
                    {saving ? 'Сохраняю…' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="ikr-screen__value">{theme[key]?.trim() || 'Пока не заполнено.'}</p>
            )}
          </section>
        )) : null}
      </div>
    </div>
  )
}
