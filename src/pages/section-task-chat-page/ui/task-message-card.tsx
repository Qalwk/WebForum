import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadMediaFiles } from '../../../entities/media/api/media-api'
import {
  completeTaskAssignment,
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
  if (a.status === 'completed') {
    return a.is_partially ? 'Часть задачи выполнена' : 'Задача выполнена'
  }
  if (a.status === 'failed') {
    return a.is_partially
      ? `Часть задачи не выполнена до ${until}`
      : `Задача не выполнена до ${until}`
  }
  if (a.is_partially) {
    return `Часть задачи в работе до ${until}`
  }
  return `Задача в работе до ${until}`
}

function assignmentStatusLabel(a: TaskAssignmentResponse) {
  switch (a.status) {
    case 'in_progress':
      return 'В работе'
    case 'completed':
      return 'Выполнено'
    case 'failed':
      return 'Не выполнено / срок истёк'
    case 'cancelled':
      return 'Отменено'
  }
}

function apiErrorCode(error: HttpError): string | null {
  if (!error.details || typeof error.details !== 'object') {
    return null
  }
  const payload = error.details as Record<string, unknown>
  if (typeof payload.error === 'string') {
    return payload.error
  }
  if (payload.detail && typeof payload.detail === 'object') {
    const detail = payload.detail as Record<string, unknown>
    return typeof detail.error === 'string' ? detail.error : null
  }
  return null
}

function assignmentErrorMessage(error: unknown, action: 'assign' | 'complete') {
  if (!(error instanceof HttpError)) {
    return action === 'assign'
      ? 'Не удалось взять задачу в работу.'
      : 'Не удалось сдать задачу.'
  }

  switch (apiErrorCode(error)) {
    case 'task_already_assigned':
      return 'Задача уже взята кем-то другим.'
    case 'task_assignment_access_denied':
      return 'Сдать задачу может только пользователь, который взял её в работу.'
    case 'task_assignment_state_conflict':
      return 'Задача уже сдана или срок её выполнения истёк.'
    default:
      return error.status === 422
        ? 'Добавьте описание выполнения или прикрепите файл.'
        : error.message
  }
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
  const activeAssignment = items.find((a) => a.status === 'in_progress')

  const reloadAssignments = useCallback(async () => {
    const rows = await getTaskAssignments(t.id, token, { limit: 100, offset: 0 })
    setItems(rows)
  }, [t.id, token])

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

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        void reloadAssignments()
      }
    }

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [reloadAssignments])

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
      if (
        error instanceof HttpError &&
        apiErrorCode(error) === 'task_already_assigned'
      ) {
        setShowApply(false)
        try {
          await reloadAssignments()
        } catch {
          // Основная ошибка важнее ошибки фонового обновления списка.
        }
      }
      showError(assignmentErrorMessage(error, 'assign'))
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

  async function submitCompletion(assignmentId: string) {
    const note = reportText.trim()
    if (!note && reportMediaIds.length === 0) {
      showError('Добавьте описание или прикрепите файл.')
      return
    }
    setSending(true)
    try {
      const updated = await completeTaskAssignment(
        assignmentId,
        {
          text: note || null,
          media_file_ids: [...reportMediaIds],
        },
        token,
      )
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setReportText('')
      setReportMediaIds([])
      setOpenAssignmentId(null)
    } catch (error) {
      showError(assignmentErrorMessage(error, 'complete'))
      if (error instanceof HttpError && error.status === 409) {
        try {
          await reloadAssignments()
        } catch {
          // Состояние обновится при следующем открытии страницы или фокусе окна.
        }
      }
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

      {!activeAssignment ? (
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

      {showApply && !activeAssignment ? (
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
            const expanded = openAssignmentId === a.id
            return (
              <li key={a.id} className="section-chat__assign-item section-chat__assign-item--child">
                <p className="section-chat__assign-child-title">{assignmentHeadline(a)}</p>
                <p className="section-chat__text">{a.text || '—'}</p>
                <p className="section-chat__assign-meta">
                  {assignmentStatusLabel(a)} · {formatShortDate(a.created_at)}
                </p>
                {a.media_files.length > 0 ? (
                  <MessageAttachments
                    ownerMessageId={a.id}
                    mediaFiles={a.media_files}
                  />
                ) : null}
                {mine && a.status === 'in_progress' ? (
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
                            void submitCompletion(a.id)
                          }}
                        >
                          Задача выполнена
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {a.status === 'completed' ? (
                  <p className="section-chat__task-done-label">
                    {a.is_partially
                      ? 'Часть задачи выполнена'
                      : 'Задача выполнена'}
                  </p>
                ) : null}
                {a.status === 'completed' && a.completion_text ? (
                  <p className="section-chat__text">{a.completion_text}</p>
                ) : null}
                {a.status === 'completed' && a.completed_at ? (
                  <p className="section-chat__assign-meta">
                    Сдано {formatShortDate(a.completed_at)}
                  </p>
                ) : null}
                {a.status === 'failed' ? (
                  <p className="section-chat__task-done-label">
                    Не выполнено / срок истёк
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
