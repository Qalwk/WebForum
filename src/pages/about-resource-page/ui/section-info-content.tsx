import { useEffect, useRef, useState } from 'react'
import { uploadMediaFiles } from '../../../entities/media/api/media-api'
import { getSectionById, updateSection } from '../../../entities/section/api/section-api'
import type { SectionResponse, UpdateSectionPayload } from '../../../entities/section/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { RichDescription } from '../../../shared/ui/rich-description'
import { SectionAttachments } from '../../../shared/ui/section-attachments'

type Props = {
  sectionId: string | null
  placeholder: string
}

export function SectionInfoContent({ sectionId, placeholder }: Props) {
  const { token } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const [section, setSection] = useState<SectionResponse | null>(null)
  const [loading, setLoading] = useState(Boolean(sectionId))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    if (!sectionId || !token) return
    let active = true
    getSectionById(sectionId, token)
      .then((result) => {
        if (!active) return
        setSection(result)
        setDraft(result.description ?? '')
        setError('')
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить секцию.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sectionId, token])

  useEffect(() => {
    const element = descriptionRef.current
    if (!element || editing || expanded) return
    const measure = () => setCanExpand(element.scrollHeight > element.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [section?.description, editing, expanded])

  function startEdit() {
    if (!section) return
    setDraft(section.description ?? '')
    setFiles([])
    setError('')
    setExpanded(false)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(section?.description ?? '')
    setFiles([])
    setEditing(false)
    setError('')
  }

  async function save() {
    if (!section || !token || saving) return
    const payload: UpdateSectionPayload = {}
    if (draft !== (section.description ?? '')) {
      if (!draft.trim()) {
        setError('Описание нельзя полностью очистить через API. Введите текст.')
        return
      }
      payload.description = draft
    }
    if (!payload.description && files.length === 0) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      if (files.length) payload.media_file_ids = await uploadMediaFiles(files, token)
      await updateSection(section.id, payload, token)
      const updated = await getSectionById(section.id, token)
      setSection(updated)
      setDraft(updated.description ?? '')
      setFiles([])
      setEditing(false)
      setExpanded(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить секцию.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="section-info__content"><p>Загрузка…</p></main>

  return (
    <main className="section-info__content">
      {error ? <p className="section-info__error" role="alert">{error}</p> : null}
      {editing && section ? (
        <div className="section-info__editor">
          <label htmlFor="section-info-description">Текст страницы</label>
          <textarea
            id="section-info-description"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={12}
            placeholder={placeholder}
          />
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            multiple
            onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])}
          />
          <button type="button" className="section-info__attach" onClick={() => fileInputRef.current?.click()}>
            📎 Прикрепить рисунок или файл
          </button>
          {files.length ? <p className="section-info__selected">Выбрано файлов: {files.length}. Существующие вложения сохранятся.</p> : null}
          <div className="section-info__actions">
            <button type="button" onClick={cancelEdit} disabled={saving}>Отмена</button>
            <button type="button" className="section-info__save" onClick={() => void save()} disabled={saving}>
              {saving ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={descriptionRef} className={`section-info__description${expanded ? ' section-info__description--open' : ''}`}>
            {section?.description?.trim()
              ? <RichDescription value={section.description} />
              : <p className="section-info__placeholder">{placeholder}</p>}
          </div>
          {canExpand ? (
            <button type="button" className="section-info__read-more" onClick={() => setExpanded((open) => !open)}>
              {expanded ? 'Свернуть' : 'Читать далее'}
            </button>
          ) : null}
          {section ? <SectionAttachments files={section.media_files ?? []} /> : null}
          {section && token ? (
            <button type="button" className="section-info__edit" onClick={startEdit} aria-label="Редактировать страницу">
              ✎ Редактировать
            </button>
          ) : null}
        </>
      )}
    </main>
  )
}
