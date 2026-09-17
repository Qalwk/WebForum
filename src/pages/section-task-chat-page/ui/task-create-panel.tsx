import { useRef, useState } from 'react'
import { uploadMediaFiles } from '../../../entities/media/api/media-api'
import {
  createTask,
  improveMessageText,
} from '../../../entities/message/api/messages-api'
import { formatTaskText } from '../../../entities/message/lib/task-text'
import { HttpError } from '../../../shared/api/http-client'
import { getTelegramWebApp } from '../../../shared/lib/telegram-web-app'
import skrepkaIcon from '../../../assets/home-legacy/skrepkaIcon.webp'

const DEFAULT_TASK_RATIO = 50
const GPT_REVIEW_TIMEOUT_MS = 20_000

type CreateStep = 'title' | 'description' | 'review' | 'ratio'

type TaskCreatePanelProps = {
  themeId: string
  sectionId: string
  token: string
  hasTasks: boolean
  isExperiment?: boolean
  aiEnabled?: boolean
  onCreated: () => void
}

function showError(message: string) {
  const app = getTelegramWebApp()
  if (app?.showAlert) {
    app.showAlert(message)
  } else {
    window.alert(message)
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: number | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('GPT request timed out'))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

export function TaskCreatePanel({
  themeId,
  sectionId,
  token,
  hasTasks,
  isExperiment = false,
  aiEnabled = true,
  onCreated,
}: TaskCreatePanelProps) {
  const entityName = isExperiment ? 'эксперимент' : 'задача'
  const entityNameGenitive = isExperiment ? 'эксперимента' : 'задачи'
  const [open, setOpen] = useState(!hasTasks)
  const [step, setStep] = useState<CreateStep>('title')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [gptText, setGptText] = useState<string | null>(null)
  const [useGpt, setUseGpt] = useState(false)
  const [skipRatio, setSkipRatio] = useState(true)
  const [ratioStr, setRatioStr] = useState('50')
  const [busy, setBusy] = useState(false)
  const [pendingMediaIds, setPendingMediaIds] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetFlow() {
    setStep('title')
    setTitle('')
    setDescription('')
    setGptText(null)
    setUseGpt(false)
    setSkipRatio(true)
    setRatioStr('50')
    setPendingMediaIds([])
    if (hasTasks) {
      setOpen(false)
    }
  }

  async function runGptReview() {
    const combined = formatTaskText(title, description)
    if (!combined?.trim()) {
      showError(`Укажите название или описание ${entityNameGenitive}.`)
      return
    }

    if (!aiEnabled) {
      setUseGpt(false)
      setGptText(null)
      setStep('ratio')
      return
    }

    setBusy(true)
    try {
      const res = await withTimeout(
        improveMessageText(
          themeId,
          sectionId,
          { text: combined },
          token,
        ),
        GPT_REVIEW_TIMEOUT_MS,
      )
      const out = res.output_text?.trim()
      setGptText(out && out.length > 0 ? out : null)
      setStep('review')
    } catch (error) {
      if (
        error instanceof HttpError &&
        error.status === 409 &&
        apiErrorCode(error) === 'ai_disabled_for_section'
      ) {
        setUseGpt(false)
        setGptText(null)
        setStep('ratio')
        return
      }

      const message =
        error instanceof HttpError
          ? error.message
          : 'Не удалось улучшить текст через GPT.'
      showError(message)
      setGptText(null)
      setStep('ratio')
    } finally {
      setBusy(false)
    }
  }

  function pickOriginalForPublish() {
    setUseGpt(false)
    setStep('ratio')
  }

  function pickGptForPublish() {
    if (!gptText) {
      pickOriginalForPublish()
      return
    }
    setUseGpt(true)
    const parsed = gptText.includes('\n')
      ? gptText
      : `${title.trim()}\n\n${gptText}`
    const firstNl = parsed.indexOf('\n')
    if (firstNl === -1) {
      setTitle(parsed.trim())
      setDescription('')
    } else {
      setTitle(parsed.slice(0, firstNl).trim())
      setDescription(parsed.slice(firstNl + 1).trim())
    }
    setStep('ratio')
  }

  async function publishTask() {
    const bodyText = formatTaskText(title, description)
    if (!bodyText?.trim()) {
      showError(
        isExperiment
          ? 'Эксперимент не может быть пустым.'
          : 'Задача не может быть пустой.',
      )
      return
    }
    const ratio = (() => {
      if (skipRatio) {
        return DEFAULT_TASK_RATIO
      }
      const raw = parseInt(ratioStr.replace(/\s/g, ''), 10)
      if (Number.isFinite(raw) && raw >= 1 && raw <= 100) {
        return raw
      }
      return DEFAULT_TASK_RATIO
    })()

    setBusy(true)
    try {
      await createTask(
        themeId,
        sectionId,
        {
          text: bodyText,
          ratio,
          is_openai_generated: useGpt,
          media_file_ids: [...pendingMediaIds],
        },
        token,
      )
      resetFlow()
      onCreated()
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : `Не удалось опубликовать ${entityName}.`
      showError(message)
    } finally {
      setBusy(false)
    }
  }

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return
    }
    setUploadingFiles(true)
    try {
      const ids = await uploadMediaFiles(Array.from(fileList), token)
      setPendingMediaIds((prev) => [...prev, ...ids])
    } catch (error) {
      const message =
        error instanceof HttpError ? error.message : 'Загрузка не удалась.'
      showError(message)
    } finally {
      setUploadingFiles(false)
    }
  }

  if (!open && hasTasks) {
    return (
      <div
        className="section-chat__composer"
        role="region"
        aria-label={isExperiment ? 'Новый эксперимент' : 'Новая задача'}
      >
        <button
          type="button"
          className="section-chat__task-add-btn"
          onClick={() => {
            setOpen(true)
            setStep('title')
          }}
        >
          {isExperiment ? 'Добавить эксперимент' : 'Добавить задачу'}
        </button>
      </div>
    )
  }

  return (
    <div
      className="section-chat__composer"
      role="region"
      aria-label={isExperiment ? 'Создание эксперимента' : 'Создание задачи'}
    >
      {step === 'title' ? (
        <div className="section-chat__task-wizard">
          <label className="section-chat__task-wizard-label" htmlFor="task-title">
            {isExperiment ? 'Название эксперимента' : 'Название задачи'}
          </label>
          <input
            id="task-title"
            className="section-chat__task-wizard-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
            }}
            placeholder={
              isExperiment
                ? 'Назвать эксперимент'
                : 'Назвать и сформулировать задачу'
            }
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="button"
            className="section-chat__task-wizard-next"
            disabled={!title.trim() || busy}
            onClick={() => {
              setStep('description')
            }}
          >
            Далее
          </button>
        </div>
      ) : null}

      {step === 'description' ? (
        <div className="section-chat__task-wizard">
          <label className="section-chat__task-wizard-label" htmlFor="task-desc">
            {isExperiment ? 'Сценарий эксперимента' : 'Описание задачи'}
          </label>
          <textarea
            id="task-desc"
            className="section-chat__task-wizard-textarea"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
            placeholder={
              isExperiment
                ? 'Опишите сценарий эксперимента'
                : 'Сформулируйте задачу подробнее'
            }
            maxLength={7500}
          />
          <div className="section-chat__task-wizard-actions">
            <button
              type="button"
              className="section-chat__task-wizard-back"
              disabled={busy}
              onClick={() => {
                setStep('title')
              }}
            >
              Назад
            </button>
            <button
              type="button"
              className="section-chat__task-wizard-next"
              disabled={busy}
              onClick={() => {
                void runGptReview()
              }}
            >
              {busy ? 'GPT…' : 'Далее'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="section-chat__task-wizard section-chat__task-wizard--review">
          <p className="section-chat__task-wizard-hint">
            GPT предлагает улучшенную формулировку. Выберите вариант или отредактируйте
            текст на следующем шаге.
          </p>
          <div className="section-chat__task-review-block">
            <p className="section-chat__task-review-label">Оригинал</p>
            <p className="section-chat__task-review-text">
              {formatTaskText(title, description) || '—'}
            </p>
            <button
              type="button"
              className="section-chat__task-review-pick"
              disabled={busy}
              onClick={pickOriginalForPublish}
            >
              Опубликовать оригинал
            </button>
          </div>
          {gptText ? (
            <div className="section-chat__task-review-block section-chat__task-review-block--gpt">
              <p className="section-chat__task-review-label">Версия GPT</p>
              <p className="section-chat__task-review-text">{gptText}</p>
              <button
                type="button"
                className="section-chat__task-review-pick section-chat__task-review-pick--primary"
                disabled={busy}
                onClick={pickGptForPublish}
              >
                Опубликовать версию GPT
              </button>
            </div>
          ) : (
            <p className="section-chat__task-wizard-hint">
              GPT не вернул текст — можно опубликовать оригинал.
            </p>
          )}
          <button
            type="button"
            className="section-chat__task-wizard-back"
            disabled={busy}
            onClick={() => {
              setStep('description')
            }}
          >
            Редактировать оригинал
          </button>
        </div>
      ) : null}

      {step === 'ratio' ? (
        <div className="section-chat__task-wizard">
          <p className="section-chat__task-wizard-hint">
            Назначьте рейтинговый коэффициент {entityNameGenitive} (1–100) или
            пропустите шаг.
          </p>
          <div className="section-chat__task-top">
            <label className="section-chat__task-skip">
              <input
                type="checkbox"
                checked={skipRatio}
                onChange={(e) => {
                  setSkipRatio(e.target.checked)
                }}
              />
              <span>Пропустить</span>
            </label>
            {skipRatio ? null : (
              <div className="section-chat__task-row">
                <span className="section-chat__task-top-label" id="create-task-ratio-label">
                  Коэффициент 1–100
                </span>
                <input
                  id="create-task-ratio"
                  className="section-chat__task-ratio"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-labelledby="create-task-ratio-label"
                  value={ratioStr}
                  onChange={(e) => {
                    setRatioStr(e.target.value)
                  }}
                />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => {
              void onPickFiles(e.target.files)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
          />
          <div className="section-chat__composer-row">
            <button
              type="button"
              className="section-chat__composer-attach"
              aria-label={
                pendingMediaIds.length > 0
                  ? `Вложения: ${pendingMediaIds.length}`
                  : 'Прикрепить файл'
              }
              disabled={uploadingFiles}
              onClick={() => {
                fileInputRef.current?.click()
              }}
            >
              {uploadingFiles ? (
                <span className="section-chat__attach-busy" aria-hidden>
                  …
                </span>
              ) : (
                <img src={skrepkaIcon} alt="" width={24} height={24} />
              )}
              {pendingMediaIds.length > 0 ? (
                <span className="section-chat__attach-badge" aria-hidden>
                  {pendingMediaIds.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="section-chat__task-publish-btn"
              disabled={busy}
              onClick={() => {
                void publishTask()
              }}
            >
              {busy
                ? '…'
                : isExperiment
                  ? 'Опубликовать эксперимент'
                  : 'Опубликовать задачу'}
            </button>
            {hasTasks ? (
              <button
                type="button"
                className="section-chat__task-wizard-back"
                disabled={busy}
                onClick={resetFlow}
              >
                Отмена
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
