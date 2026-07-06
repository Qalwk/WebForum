import { useEffect, useRef, useState } from 'react'
import { uploadMediaFiles } from '../../../entities/media/api/media-api'
import {
  createComment,
  createTaskAssignment,
  getTaskAssignments,
} from '../../../entities/message/api/messages-api'
import { parseTaskText } from '../../../entities/message/lib/task-text'
import type { TaskAssignmentResponse, TaskMessageResponse } from '../../../entities/message/model/types'
import { HttpError } from '../../../shared/api/http-client'
import { getTelegramWebApp } from '../../../shared/lib/telegram-web-app'
import { MessageAttachments } from '../../../shared/ui/message-attachments'
import { UserAvatar } from '../../../shared/ui/user-avatar'

type TaskMessageCardProps = {
  task: TaskMessageResponse
  token: string
  themeId: string
  sectionId: string
  currentUserId: string | null
}

function defaultExpiresDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeadlineDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function authorIdPeek(authorId: string) {
  if (authorId.length <= 10) {
    return authorId
  }
  return `${authorId.slice(0, 6)}…`
}

function taskAuthorLabel(t: TaskMessageResponse) {
  const n = t.first_name?.trim()
  return n ? n : authorIdPeek(t.author_id)
}

function assignmentHeadline(a: TaskAssignmentResponse) {
  const until = formatDeadlineDate(a.expires_at)
  if (a.is_partially) {
    return `Часть задачи в работе_до ${until}`
  }
  return `Задача в работе_до ${until}`
}

function isAssignmentDone(status: string) {
  const s = status.toLowerCase()
  return s.includes('done') || s.includes('complete') || s.includes('closed')
}

function showError(message: string) {
  const app = getTelegramWebApp()
  if (app?.showAlert) {
    app.showAlert(message)
  } else {
    window.alert(message)
  }
}

function buildApplicationText(laborRatio: number, note: string) {
  const lines = [`Коэффициент трудоёмкости: ${laborRatio}`]
  const n = note.trim()
  if (n) {
    lines.push(n)
  }
  return lines.join('\n\n')
}

export function TaskMessageCard({
  task: t,
  token,
  themeId,
  sectionId,
  currentUserId,
}: TaskMessageCardProps) {
  const [showApply, setShowApply] = useState(false)
  const [items, setItems] = useState<TaskAssignmentResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [laborRatioStr, setLaborRatioStr] = useState('50')
  const [fullTask, setFullTask] = useState(true)
  const [deadlineDate, setDeadlineDate] = useState(defaultExpiresDate)
  const [applyNote, setApplyNote] = useState('')
  const [sending, setSending] = useState(false)
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportMediaIds, setReportMediaIds] = useState<string[]>([])
  const [uploadingReport, setUploadingReport] = useState(false)
  const reportFileRef = useRef<HTMLInputElement>(null)

  const { title, description } = parseTaskText(t.text)
  const myAssignment = currentUserId
    ? items.find((a) => a.author_id === currentUserId)
    : undefined

  useEffect(() => {
    let on = true
    setLoading(true)
    getTaskAssignments(t.id, token, { limit: 100, offset: 0 })
      .then((rows) => {
        if (on) {
          setItems(rows)
        }
      })
      .catch(() => {
        if (on) {
          setItems([])
        }
      })
      .finally(() => {
        if (on) {
          setLoading(false)
        }
      })
    return () => {
      on = false
    }
  }, [t.id, token])

  async function reloadAssignments() {
    const rows = await getTaskAssignments(t.id, token, { limit: 100, offset: 0 })
    setItems(rows)
  }

  async function submitApplication() {
    const labor = parseInt(laborRatioStr.replace(/\s/g, ''), 10)
    const laborRatio =
      Number.isFinite(labor) && labor >= 1 && labor <= 100 ? labor : 50
    const expiresIso = new Date(`${deadlineDate}T23:59:59`).toISOString()

    setSending(true)
    try {
      await createTaskAssignment(
        t.id,
        themeId,
        sectionId,
        {
          text: buildApplicationText(laborRatio, applyNote),
          expires_at: expiresIso,
          is_partially: !fullTask,
          media_file_ids: [],
        },
        token,
      )
      setShowApply(false)
      setApplyNote('')
      await reloadAssignments()
    } catch (error) {
      const err =
        error instanceof HttpError
          ? error.message
          : 'Не удалось подать заявку.'
      showError(err)
    } finally {
      setSending(false)
    }
  }

  async function onPickReportFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return
    }
    setUploadingReport(true)
    try {
      const ids = await uploadMediaFiles(Array.from(fileList), token)
      setReportMediaIds((prev) => [...prev, ...ids])
    } catch (error) {
      showError(
        error instanceof HttpError ? error.message : 'Загрузка не удалась.',
      )
    } finally {
      setUploadingReport(false)
      if (reportFileRef.current) {
        reportFileRef.current.value = ''
      }
    }
  }

  async function submitCompletion() {
    const note = reportText.trim()
    if (!note && reportMediaIds.length === 0) {
      showError('Добавьте описание или прикрепите файл.')
      return
    }
    const reportBody = note
      ? `✅ Задача выполнена\n\n${note}`
      : '✅ Задача выполнена'
    setSending(true)
    try {
      await createComment(
        t.id,
        themeId,
        sectionId,
        t.id,
        {
          text: reportBody,
          media_file_ids: [...reportMediaIds],
        },
        token,
      )
      setReportText('')
      setReportMediaIds([])
      setOpenAssignmentId(null)
    } catch (error) {
      const err =
        error instanceof HttpError
          ? error.message
          : 'Не удалось сохранить отчёт. Нужен PATCH назначения на бэкенде.'
      showError(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <article className="section-chat__bubble section-chat__bubble--task">
      <div className="section-chat__author-row">
        <UserAvatar
          className="section-chat__author-avatar"
          userId={t.author_id}
          displayLabel={taskAuthorLabel(t)}
          avatarUrl={t.author_avatar_url ?? undefined}
          avatarFilename={t.avatar_filename ?? undefined}
        />
        <span className="section-chat__author-name">{taskAuthorLabel(t)}</span>
      </div>
      {t.media_files.length > 0 ? (
        <MessageAttachments ownerMessageId={t.id} mediaFiles={t.media_files} />
      ) : null}
      {title ? <p className="section-chat__task-title">{title}</p> : null}
      {description ? (
        <p className="section-chat__text">{description}</p>
      ) : !title ? (
        <p className="section-chat__text">{t.text || '—'}</p>
      ) : null}
      <p className="section-chat__task-meta">Коэффициент задачи: {t.ratio}</p>
      <p className="section-chat__date">{formatShortDate(t.created_at)}</p>

      {!myAssignment ? (
        <button
          type="button"
          className="section-chat__task-help-btn"
          onClick={() => {
            setShowApply((v) => !v)
          }}
        >
          Готов помочь с задачей
        </button>
      ) : null}

      {showApply && !myAssignment ? (
        <div className="section-chat__assign-form section-chat__task-apply">
          <p className="section-chat__task-apply-title">Подача заявки</p>
          <label className="section-chat__assign-label" htmlFor={`labor-${t.id}`}>
            Коэффициент трудоёмкости
          </label>
          <input
            id={`labor-${t.id}`}
            className="section-chat__task-ratio"
            type="text"
            inputMode="numeric"
            value={laborRatioStr}
            onChange={(e) => {
              setLaborRatioStr(e.target.value)
            }}
          />
          <label className="section-chat__assign-check">
            <input
              type="radio"
              name={`scope-${t.id}`}
              checked={fullTask}
              onChange={() => {
                setFullTask(true)
              }}
            />
            Выполню всю задачу
          </label>
          <label className="section-chat__assign-check">
            <input
              type="radio"
              name={`scope-${t.id}`}
              checked={!fullTask}
              onChange={() => {
                setFullTask(false)
              }}
            />
            Выполню часть задачи
          </label>
          <label className="section-chat__assign-label" htmlFor={`deadline-${t.id}`}>
            Дата завершения
          </label>
          <input
            id={`deadline-${t.id}`}
            className="section-chat__assign-datetime"
            type="date"
            value={deadlineDate}
            onChange={(e) => {
              setDeadlineDate(e.target.value)
            }}
          />
          <textarea
            className="section-chat__comment-input"
            rows={2}
            value={applyNote}
            onChange={(e) => {
              setApplyNote(e.target.value)
            }}
            placeholder="Комментарий к заявке (необязательно)"
          />
          <button
            type="button"
            className="section-chat__comment-send"
            disabled={sending}
            onClick={() => {
              void submitApplication()
            }}
          >
            {sending ? '…' : 'Подать заявку'}
          </button>
        </div>
      ) : null}

      {loading ? <p className="section-chat__comments-hint">Загрузка назначений…</p> : null}

      {items.length > 0 ? (
        <ul className="section-chat__assign-list" aria-label="Заявки на задачу">
          {items.map((a) => {
            const mine = currentUserId && a.author_id === currentUserId
            const done = isAssignmentDone(a.status)
            const expanded = openAssignmentId === a.id
            return (
              <li key={a.id} className="section-chat__assign-item section-chat__assign-item--child">
                <p className="section-chat__assign-child-title">{assignmentHeadline(a)}</p>
                <p className="section-chat__text">{a.text || '—'}</p>
                <p className="section-chat__assign-meta">
                  {done ? 'Задача выполнена' : a.status} · {formatShortDate(a.created_at)}
                </p>
                {a.media_files.length > 0 ? (
                  <MessageAttachments
                    ownerMessageId={a.id}
                    mediaFiles={a.media_files}
                  />
                ) : null}
                {mine && !done ? (
                  <>
                    <button
                      type="button"
                      className="section-chat__comments-toggle"
                      onClick={() => {
                        setOpenAssignmentId(expanded ? null : a.id)
                      }}
                    >
                      {expanded ? '▼' : '▶'} Отчёт о выполнении
                    </button>
                    {expanded ? (
                      <div className="section-chat__assign-form">
                        <input
                          ref={reportFileRef}
                          className="visually-hidden"
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            void onPickReportFiles(e.target.files)
                          }}
                        />
                        <button
                          type="button"
                          className="section-chat__task-attach-link"
                          disabled={uploadingReport}
                          onClick={() => {
                            reportFileRef.current?.click()
                          }}
                        >
                          📎 Прикрепить файл
                          {reportMediaIds.length > 0
                            ? ` (${reportMediaIds.length})`
                            : ''}
                        </button>
                        <textarea
                          className="section-chat__comment-input"
                          rows={3}
                          value={reportText}
                          onChange={(e) => {
                            setReportText(e.target.value)
                          }}
                          placeholder="Добавить описание выполнения"
                        />
                        <button
                          type="button"
                          className="section-chat__task-done-btn"
                          disabled={sending}
                          onClick={() => {
                            void submitCompletion()
                          }}
                        >
                          Задача выполнена
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {done ? (
                  <p className="section-chat__task-done-label">
                    {a.is_partially
                      ? 'Часть задачи выполнена'
                      : 'Задача выполнена'}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}
