import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { uploadMediaFiles } from '../../../entities/media/api/media-api'
import {
  createPost,
  getMessageReactionStats,
  getPosts,
  upsertMessageReaction,
} from '../../../entities/message/api/messages-api'
import type {
  MessageReactionTypeApi,
  PostMessageResponse,
} from '../../../entities/message/model/types'
import { getThemeById, getThemeSections } from '../../../entities/theme/api/theme-api'
import { getIkrPostEmptyCopy, isIkrSubsection } from '../../../entities/theme/lib/ikr-copy'
import { getSectionMeta } from '../../../entities/theme/lib/section-meta'
import { countTextLines } from '../../../entities/theme/lib/ikr-ui'
import {
  getSectionRouteKind,
  pathToPostChat,
  pathToPostComments,
} from '../../../entities/theme/lib/section-routing'
import type { ThemeSection } from '../../../entities/theme/model/types'
import { useSession } from '../../../entities/session/model/session-context'
import { PageState } from '../../../shared/ui/page-state'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { HttpError } from '../../../shared/api/http-client'
import { getTelegramWebApp } from '../../../shared/lib/telegram-web-app'
import { PostMessageCard } from './post-message-card'
import skrepkaIcon from '../../../assets/home-legacy/skrepkaIcon.webp'
import { ComposerSendIcon } from '../../../shared/ui/composer-send-icon'

type LocationState = {
  themeTitle?: string
  sectionCode?: string
}

export function SectionPostChatPage() {
  const navigate = useNavigate()
  const { search, hash, state: rawState } = useLocation()
  const state = rawState as LocationState | null
  const { themeId, sectionId } = useParams<{
    themeId: string
    sectionId: string
  }>()
  const { token, isTelegram, authError, authStatus } = useSession()

  const [themeTitle, setThemeTitle] = useState(() => state?.themeTitle ?? '')
  const [sectionCode, setSectionCode] = useState(() => state?.sectionCode ?? '')
  const [loadError, setLoadError] = useState('')
  const [messages, setMessages] = useState<PostMessageResponse[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [statsById, setStatsById] = useState<
    Record<string, { like: number; dislike: number }>
  >({})
  const [userReactionById, setUserReactionById] = useState<
    Record<string, MessageReactionTypeApi | null>
  >({})
  const [pendingMediaIds, setPendingMediaIds] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [themeSectionsCatalog, setThemeSectionsCatalog] = useState<ThemeSection[]>([])
  /** Экран 13.2.1.7: при коротком первом посте «жел. эффекта» — превью соседних подвкладок. */
  const [ikrPeek, setIkrPeek] = useState<{
    techText?: string
    undText?: string
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function goHome() {
    navigate({ pathname: '/', search, hash })
  }

  useTelegramBackButton(isTelegram, goHome)

  useEffect(() => {
    if (!themeId || !sectionId || !token) {
      return
    }
    const tid = themeId
    const sid = sectionId

    let active = true

    async function run() {
      setLoadError('')

      try {
        const sections = await getThemeSections(tid, token)
        if (active) {
          setThemeSectionsCatalog(sections)
        }
        const mySection = sections.find((s) => s.section_id === sid)
        if (!active) {
          return
        }
        if (!mySection) {
          setLoadError('Секция не найдена в этой теме.')
          return
        }
        if (getSectionRouteKind(mySection.section_code) !== 'post_messages') {
          setLoadError('Этот раздел открыт не в режиме постов.')
          return
        }
        setSectionCode(mySection.section_code)

        if (state?.themeTitle) {
          setThemeTitle(state.themeTitle)
        } else {
          const t = await getThemeById(tid, token)
          if (active) {
            setThemeTitle(t.title)
          }
        }

        const rows = await getPosts(tid, sid, token, {
          limit: 100,
          offset: 0,
        })
        if (active) {
          setMessages(rows)
        }
      } catch (error) {
        if (!active) {
          return
        }
        if (error instanceof Error) {
          setLoadError(error.message)
        } else {
          setLoadError('Не удалось загрузить чат.')
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [token, themeId, sectionId, state])

  useEffect(() => {
    if (
      !themeId ||
      !token ||
      sectionCode !== 'desirable_effects' ||
      messages.length === 0
    ) {
      setIkrPeek({})
      return
    }
    const main = messages[0]
    if (!main || countTextLines(main.text) > 11) {
      setIkrPeek({})
      return
    }

    const techRow = themeSectionsCatalog.find(
      (s) => s.section_code === 'technical_modeling',
    )
    const undRow = themeSectionsCatalog.find(
      (s) => s.section_code === 'undesirable_effects',
    )
    let cancelled = false

    async function peek() {
      const next: { techText?: string; undText?: string } = {}
      const tid = themeId
      if (!tid) {
        return
      }
      try {
        if (techRow?.section_id) {
          const rows = await getPosts(tid, techRow.section_id, token, {
            limit: 1,
            offset: 0,
          })
          if (!cancelled && rows[0]?.text?.trim()) {
            next.techText = rows[0].text
          }
        }
        if (undRow?.section_id) {
          const rows = await getPosts(tid, undRow.section_id, token, {
            limit: 1,
            offset: 0,
          })
          if (!cancelled && rows[0]?.text?.trim()) {
            next.undText = rows[0].text
          }
        }
      } catch {
        //
      }
      if (!cancelled) {
        setIkrPeek(
          next.techText || next.undText ? next : {},
        )
      }
    }

    void peek()
    return () => {
      cancelled = true
    }
  }, [themeId, token, sectionCode, messages, themeSectionsCatalog])

  useEffect(() => {
    if (
      !token ||
      !messages.length ||
      sectionCode === 'technical_modeling'
    ) {
      if (sectionCode === 'technical_modeling') {
        setStatsById({})
        setUserReactionById({})
      }
      return
    }
    let active = true

    async function loadReactionStats() {
      const rows = await Promise.all(
        messages.map(async (m) => {
          try {
            const s = await getMessageReactionStats(m.id, token)
            return {
              id: m.id,
              stats: {
                like: s.reactions?.like ?? 0,
                dislike: s.reactions?.dislike ?? 0,
              },
              userReaction: s.user_reaction ?? null,
            }
          } catch {
            return {
              id: m.id,
              stats: { like: 0, dislike: 0 },
              userReaction: null as MessageReactionTypeApi | null,
            }
          }
        }),
      )

      if (!active) {
        return
      }

      const nextStats: Record<string, { like: number; dislike: number }> = {}
      const nextUserReactions: Record<string, MessageReactionTypeApi | null> =
        {}
      for (const row of rows) {
        nextStats[row.id] = row.stats
        nextUserReactions[row.id] = row.userReaction
      }
      setStatsById(nextStats)
      setUserReactionById(nextUserReactions)
    }

    void loadReactionStats()
    return () => {
      active = false
    }
  }, [messages, token, sectionCode])

  async function handleSend() {
    const text = draft.trim()
    if (!text || !themeId || !sectionId || !token) {
      return
    }
    setSending(true)

    try {
      await createPost(
        themeId,
        sectionId,
        { text, media_file_ids: [...pendingMediaIds] },
        token,
      )
      setDraft('')
      setPendingMediaIds([])
      const rows = await getPosts(themeId, sectionId, token, {
        limit: 100,
        offset: 0,
      })
      setMessages(rows)
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Не удалось отправить.'
      const app = getTelegramWebApp()
      if (app?.showAlert) {
        app.showAlert(message)
      } else {
        window.alert(message)
      }
    } finally {
      setSending(false)
    }
  }

  /**
   * У пользователя максимум одна реакция: лайк или дизлайк (см. OpenAPI).
   * Повторный клик по своей реакции снимает её. Клик по другой — меняет.
   */
  async function handleReactionClick(
    messageId: string,
    kind: MessageReactionTypeApi,
  ) {
    if (!token) {
      return
    }
    try {
      const current = userReactionById[messageId] ?? null
      let next: MessageReactionTypeApi | null
      if (current === kind) {
        next = null
      } else {
        next = kind
      }
      await upsertMessageReaction(messageId, { reaction: next }, token)
      setUserReactionById((prev) => ({ ...prev, [messageId]: next }))
      setStatsById((prev) => {
        const cur = prev[messageId] ?? { like: 0, dislike: 0 }
        let like = cur.like
        let dislike = cur.dislike
        if (current === 'like') {
          like -= 1
        }
        if (current === 'dislike') {
          dislike -= 1
        }
        if (next === 'like') {
          like += 1
        }
        if (next === 'dislike') {
          dislike += 1
        }
        return {
          ...prev,
          [messageId]: {
            like: Math.max(0, like),
            dislike: Math.max(0, dislike),
          },
        }
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Реакция не сохранилась.'
      getTelegramWebApp()?.showAlert?.(message)
    }
  }

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length || !token) {
      return
    }
    const files = Array.from(fileList)
    setUploadingFiles(true)
    try {
      const ids = await uploadMediaFiles(files, token)
      setPendingMediaIds((prev) => [...prev, ...ids])
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : 'Не удалось загрузить файлы.'
      const app = getTelegramWebApp()
      if (app?.showAlert) {
        app.showAlert(message)
      } else {
        window.alert(message)
      }
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!themeId || !sectionId) {
    return (
      <PageState
        title="Неверный маршрут"
        description="Не указаны тема или секция."
        action={{ label: 'На главный', onClick: goHome }}
      />
    )
  }

  if (authStatus === 'checking_telegram' || authStatus === 'authenticating') {
    return (
      <PageState
        title="Секунду"
        description="Соединяю с Telegram…"
      />
    )
  }

  if (!token) {
    return (
      <PageState
        title="Нет доступа"
        description={
          authError ??
          'Войдите через Telegram Mini App или задайте VITE_API_BEARER_TOKEN для разработки.'
        }
        action={{ label: 'На главный', onClick: goHome }}
      />
    )
  }

  if (loadError) {
    return (
      <PageState
        title="Раздел"
        description={loadError}
        action={{ label: 'Назад', onClick: goHome }}
      />
    )
  }

  const label =
    (sectionCode ? getSectionMeta(sectionCode).title : null) || 'Сообщения'
  const headerTitle = themeTitle || 'Тема'

  const ikrEmpty =
    messages.length === 0 && sectionCode && isIkrSubsection(sectionCode)
      ? getIkrPostEmptyCopy(sectionCode, headerTitle)
      : null

  function truncatePeek(text: string, max: number) {
    const t = text.trim()
    if (t.length <= max) {
      return t
    }
    return `${t.slice(0, max).trim()}…`
  }

  let composerPlaceholder = 'Комментировать'
  if (sectionCode === 'chat_experiments') {
    composerPlaceholder = 'Добавить эксперимент'
  } else if (sectionCode === 'desirable_effects') {
    composerPlaceholder = 'Текст поста: желаемый эффект…'
  } else if (sectionCode === 'technical_modeling') {
    composerPlaceholder = 'Техническое моделирование…'
  } else if (sectionCode === 'undesirable_effects') {
    composerPlaceholder = 'Новый пост / нежелательный эффект…'
  }

  const techPeekId = themeSectionsCatalog.find(
    (s) => s.section_code === 'technical_modeling',
  )?.section_id
  const undPeekId = themeSectionsCatalog.find(
    (s) => s.section_code === 'undesirable_effects',
  )?.section_id

  return (
    <div className="page page--section-chat section-post-chat">
      <header className="section-chat__header">
        <button
          className="section-chat__back"
          type="button"
          onClick={goHome}
        >
          <span className="section-chat__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>
        <h1 className="section-chat__title">{label}</h1>
        <p className="section-chat__subtitle">{headerTitle}</p>
      </header>

      <div
        className="section-chat__list"
        role="feed"
        aria-busy={sending}
        aria-label="Лента постов"
      >
        {messages.length === 0 ? (
          ikrEmpty ? (
            <div className="section-chat__empty-block section-chat__empty-block--ikr">
              <p className="section-chat__empty-line section-chat__empty-line--lead">
                {ikrEmpty.lead}
              </p>
              <p className="section-chat__empty">{ikrEmpty.hint}</p>
            </div>
          ) : sectionCode === 'chat_experiments' ? (
            <div className="section-chat__empty-block">
              <p className="section-chat__empty">
                Придумайте название эксперимента и сформулируйте его сценарий
              </p>
            </div>
          ) : (
            <p className="section-chat__empty">Пока нет сообщений. Напишите первым.</p>
          )
        ) : null}

        {token && themeId && sectionId
          ? messages.map((m) => {
              const stats = statsById[m.id] ?? { like: 0, dislike: 0 }
              const my = userReactionById[m.id] ?? null
              const hideReactions = sectionCode === 'technical_modeling'
              return (
                <PostMessageCard
                  key={m.id}
                  post={m}
                  likeCount={stats.like}
                  dislikeCount={stats.dislike}
                  myReaction={my}
                  hideReactions={hideReactions}
                  onReaction={(id, kind) => {
                    void handleReactionClick(id, kind)
                  }}
                  onOpenCommentThread={() => {
                    navigate(
                      {
                        pathname: pathToPostComments(themeId, sectionId, m.id),
                        search,
                        hash,
                      },
                      {
                        state: {
                          themeTitle: themeTitle || undefined,
                          sectionCode: sectionCode || undefined,
                        },
                      },
                    )
                  }}
                />
              )
            })
          : null}

        {sectionCode === 'desirable_effects' &&
        messages[0] &&
        countTextLines(messages[0].text) <= 11 &&
        (ikrPeek.techText || ikrPeek.undText) ? (
          <section
            className="section-chat__ikr-stack"
            aria-label="Превью смежных подразделов ИКР"
          >
            {ikrPeek.techText && techPeekId ? (
              <div className="section-chat__ikr-stack-item">
                <p className="section-chat__ikr-stack-label">
                  Техническое моделирование
                </p>
                <article className="section-chat__bubble section-chat__bubble--peek">
                  <p className="section-chat__text">
                    {truncatePeek(ikrPeek.techText, 320)}
                  </p>
                </article>
                <button
                  type="button"
                  className="section-chat__ikr-stack-link"
                  onClick={() => {
                    navigate(
                      {
                        pathname: pathToPostChat(themeId!, techPeekId),
                        search,
                        hash,
                      },
                      {
                        state: {
                          themeTitle: themeTitle || undefined,
                          sectionCode: 'technical_modeling',
                        },
                      },
                    )
                  }}
                >
                  Открыть техническое моделирование →
                </button>
              </div>
            ) : null}
            {ikrPeek.undText && undPeekId ? (
              <div className="section-chat__ikr-stack-item section-chat__ikr-stack-item--und">
                <p className="section-chat__ikr-stack-label">Нежелательные эффекты</p>
                <article className="section-chat__bubble section-chat__bubble--peek section-chat__bubble--peek-mask">
                  <p className="section-chat__text">{truncatePeek(ikrPeek.undText, 280)}</p>
                </article>
                <button
                  type="button"
                  className="section-chat__ikr-stack-link"
                  onClick={() => {
                    navigate(
                      {
                        pathname: pathToPostChat(themeId!, undPeekId),
                        search,
                        hash,
                      },
                      {
                        state: {
                          themeTitle: themeTitle || undefined,
                          sectionCode: 'undesirable_effects',
                        },
                      },
                    )
                  }}
                >
                  Открыть нежелательные эффекты →
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="section-chat__composer" role="region" aria-label="Новый пост">
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          multiple
          accept="image/*,application/pdf,audio/*,video/*"
          onChange={(e) => {
            void onPickFiles(e.target.files)
          }}
        />
        <div className="section-chat__composer-row">
          <button
            className="section-chat__composer-attach"
            type="button"
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
          <input
            id="post-draft"
            className="section-chat__composer-pill"
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
            }}
            placeholder={composerPlaceholder}
            maxLength={8000}
            enterKeyHint="send"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim() && !sending) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <button
            className={[
              'section-chat__composer-send',
              draft.trim() ? 'section-chat__composer-send--active' : '',
            ]
              .join(' ')
              .trim()}
            type="button"
            disabled={sending || !draft.trim()}
            aria-label="Отправить"
            onClick={() => {
              void handleSend()
            }}
          >
            {sending ? (
              <span className="section-chat__send-busy" aria-hidden>
                …
              </span>
            ) : (
              <ComposerSendIcon />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
