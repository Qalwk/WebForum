import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { uploadMediaFiles, resolveAvatarPathUrl } from '../../../entities/media/api/media-api'
import {
  createComment,
  getComments,
  getMessageReactionStats,
  getPostById,
  upsertMessageReaction,
} from '../../../entities/message/api/messages-api'
import type {
  CommentMessageResponse,
  MessageReactionTypeApi,
  PostMessageResponse,
} from '../../../entities/message/model/types'
import { getThemeById, getThemeSections } from '../../../entities/theme/api/theme-api'
import { getSectionMeta } from '../../../entities/theme/lib/section-meta'
import { getSectionRouteKind, pathToPostChat } from '../../../entities/theme/lib/section-routing'
import { useSession } from '../../../entities/session/model/session-context'
import { PageState } from '../../../shared/ui/page-state'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { HttpError } from '../../../shared/api/http-client'
import { getTelegramWebApp } from '../../../shared/lib/telegram-web-app'
import skrepkaIcon from '../../../assets/home-legacy/skrepkaIcon.webp'
import { ComposerSendIcon } from '../../../shared/ui/composer-send-icon'
import { MessageAttachments } from '../../../shared/ui/message-attachments'
import { UserAvatar } from '../../../shared/ui/user-avatar'
import { getCurrentUser } from '../../../entities/user/api/user-api'
import type { CurrentUserResponse } from '../../../entities/user/model/types'

type ThreadLocationState = {
  themeTitle?: string
  sectionCode?: string
}

function formatShortTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function authorIdPeek(authorId: string) {
  if (authorId.length <= 10) {
    return authorId
  }
  return `${authorId.slice(0, 6)}…`
}

function commentDisplayName(
  comment: CommentMessageResponse,
  me: CurrentUserResponse | null,
): string {
  const name = comment.first_name?.trim()
  if (name) {
    return name
  }
  if (me && comment.author_id === me.id) {
    const selfName = me.first_name?.trim()
    if (selfName) {
      return selfName
    }
  }
  return authorIdPeek(comment.author_id)
}

function postAuthorDisplayName(
  post: PostMessageResponse,
  me: CurrentUserResponse | null,
): string {
  const name = post.first_name?.trim()
  if (name) {
    return name
  }
  if (me && post.author_id === me.id) {
    const selfName = me.first_name?.trim()
    if (selfName) {
      return selfName
    }
  }
  return authorIdPeek(post.author_id)
}

function commentHeading(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return `${count} комментарий`
  }
  if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  ) {
    return `${count} комментария`
  }
  return `${count} комментариев`
}

export function PostCommentsThreadPage() {
  const navigate = useNavigate()
  const { search, hash, state: rawState } = useLocation()
  const state = rawState as ThreadLocationState | null
  const { themeId, sectionId, postId } = useParams<{
    themeId: string
    sectionId: string
    postId: string
  }>()
  const { token, isTelegram, authError, authStatus } = useSession()

  const [themeTitle, setThemeTitle] = useState(() => state?.themeTitle ?? '')
  const [sectionCode, setSectionCode] = useState(() => state?.sectionCode ?? '')
  const [loadError, setLoadError] = useState('')
  const [post, setPost] = useState<PostMessageResponse | null>(null)
  const [comments, setComments] = useState<CommentMessageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [likeCount, setLikeCount] = useState(0)
  const [dislikeCount, setDislikeCount] = useState(0)
  const [myReaction, setMyReaction] = useState<MessageReactionTypeApi | null>(
    null,
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingMediaIds, setPendingMediaIds] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null)

  const feedPath =
    post?.theme_id && post?.section_id
      ? pathToPostChat(post.theme_id, post.section_id)
      : themeId && sectionId
        ? pathToPostChat(themeId, sectionId)
        : '/'
  const feedState = {
    themeTitle: themeTitle || undefined,
    sectionCode: sectionCode || undefined,
  }

  function goToFeed() {
    navigate({ pathname: feedPath, search, hash }, { state: feedState })
  }

  useTelegramBackButton(isTelegram && Boolean(themeId), goToFeed)

  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      return
    }
    let active = true
    getCurrentUser(token)
      .then((u) => {
        if (active) {
          setCurrentUser(u)
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null)
        }
      })
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!themeId || !sectionId || !postId || !token) {
      return
    }
    const tid = themeId
    const sid = sectionId
    const pid = postId
    const tok = token
    let active = true

    async function run() {
      setLoadError('')
      setLoading(true)

      try {
        const sections = await getThemeSections(tid, tok)
        const mySection = sections.find((s) => s.section_id === sid)
        if (!active) {
          return
        }
        if (!mySection) {
          setLoadError('Секция не найдена.')
          setPost(null)
          return
        }
        if (getSectionRouteKind(mySection.section_code) !== 'post_messages') {
          setLoadError('Этот раздел не для постов.')
          setPost(null)
          return
        }
        setSectionCode(mySection.section_code)

        const [p, rows] = await Promise.all([
          getPostById(pid, tok),
          getComments(pid, pid, tok, { limit: 200, offset: 0 }),
        ])
        if (!active) {
          return
        }
        setPost(p)
        setComments(rows)

        try {
          const t = await getThemeById(p.theme_id, tok)
          if (active) {
            setThemeTitle(t.title)
          }
        } catch {
          if (active && state?.themeTitle) {
            setThemeTitle(state.themeTitle)
          }
        }

        try {
          const s = await getMessageReactionStats(pid, tok)
          if (active) {
            setLikeCount(s.reactions?.like ?? 0)
            setDislikeCount(s.reactions?.dislike ?? 0)
            setMyReaction(s.user_reaction ?? null)
          }
        } catch {
          if (active) {
            setLikeCount(0)
            setDislikeCount(0)
            setMyReaction(null)
          }
        }
      } catch (error) {
        if (!active) {
          return
        }
        setLoadError(
          error instanceof Error ? error.message : 'Не удалось загрузить.',
        )
        setPost(null)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [themeId, sectionId, postId, token, state?.themeTitle])

  async function handleReaction(kind: MessageReactionTypeApi) {
    if (!token || !postId) {
      return
    }
    const mid = postId
    const tok = token
    try {
      const current = myReaction
      const next: MessageReactionTypeApi | null =
        current === kind ? null : kind
      await upsertMessageReaction(mid, { reaction: next }, tok)
      setMyReaction(next)
      setLikeCount((like) => {
        let n = like
        if (current === 'like') {
          n -= 1
        }
        if (next === 'like') {
          n += 1
        }
        return Math.max(0, n)
      })
      setDislikeCount((dislike) => {
        let n = dislike
        if (current === 'dislike') {
          n -= 1
        }
        if (next === 'dislike') {
          n += 1
        }
        return Math.max(0, n)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Реакция не сохранилась.'
      getTelegramWebApp()?.showAlert?.(message)
    }
  }

  async function handleSendComment() {
    const text = draft.trim()
    if (!text || !post || !postId || !token) {
      return
    }
    if (post.allow_comments === false) {
      return
    }
    const tid = post.theme_id
    const sid = post.section_id
    const pid = postId
    const tok = token
    setSending(true)
    try {
      await createComment(
        pid,
        tid,
        sid,
        pid,
        { text, media_file_ids: [...pendingMediaIds] },
        tok,
      )
      setDraft('')
      setPendingMediaIds([])
      const rows = await getComments(pid, pid, tok, {
        limit: 200,
        offset: 0,
      })
      setComments(rows)
    } catch (error) {
      const err =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Комментарий не отправлен.'
      const app = getTelegramWebApp()
      if (app?.showAlert) {
        app.showAlert(err)
      } else {
        window.alert(err)
      }
    } finally {
      setSending(false)
    }
  }

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length || !token) {
      return
    }
    setUploadingFiles(true)
    try {
      const ids = await uploadMediaFiles(Array.from(fileList), token)
      setPendingMediaIds((prev) => [...prev, ...ids])
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : 'Загрузка не удалась.'
      getTelegramWebApp()?.showAlert?.(message)
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!themeId || !sectionId || !postId) {
    return (
      <PageState
        title="Неверный маршрут"
        description="Не указаны тема, секция или пост."
        action={{ label: 'Назад', onClick: () => navigate(-1) }}
      />
    )
  }

  if (authStatus === 'checking_telegram' || authStatus === 'authenticating') {
    return (
      <PageState title="Секунду" description="Соединяю с Telegram…" />
    )
  }

  if (!token) {
    return (
      <PageState
        title="Нет доступа"
        description={
          authError ??
          'Войдите через Telegram Mini App или задайте VITE_API_BEARER_TOKEN.'
        }
        action={{ label: 'На главный', onClick: () => navigate('/') }}
      />
    )
  }

  if (loadError && !post) {
    return (
      <PageState
        title="Комментарии"
        description={loadError}
        action={{ label: 'К ленте', onClick: goToFeed }}
      />
    )
  }

  const canComment = post ? post.allow_comments !== false : false
  const sectionLabel =
    (sectionCode ? getSectionMeta(sectionCode).title : null) || 'Пост'
  const headerTitleText = loading
    ? 'Загрузка…'
    : commentHeading(comments.length)

  return (
    <div className="page page--section-chat post-comments-thread">
      <header className="post-comments-thread__header">
        <button
          className="section-chat__back"
          type="button"
          onClick={goToFeed}
        >
          <span className="section-chat__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>
        <div className="post-comments-thread__header-center">
          <h1 className="post-comments-thread__title">{headerTitleText}</h1>
          <p className="post-comments-thread__subtitle">{sectionLabel}</p>
        </div>
        <button
          type="button"
          className="post-comments-thread__search"
          aria-label="Поиск в обсуждении"
          disabled
        >
          🔍
        </button>
      </header>

      <div
        className="post-comments-thread__scroll"
        role="region"
        aria-label="Обсуждение"
      >
        {loading && !post ? (
          <p className="section-chat__empty">Загрузка…</p>
        ) : null}

        {post ? (
          <>
            <div className="post-comments-thread__context">
              <div className="post-comments-thread__context-row">
                <UserAvatar
                  className="post-comments-thread__context-avatar"
                  userId={post.author_id}
                  displayLabel={postAuthorDisplayName(post, currentUser)}
                  avatarUrl={
                    currentUser?.id === post.author_id &&
                    currentUser.avatar_path?.trim()
                      ? resolveAvatarPathUrl(
                          currentUser.avatar_path.trim(),
                          currentUser.id,
                        )
                      : post.author_avatar_url ?? undefined
                  }
                  avatarFilename={
                    currentUser?.id === post.author_id &&
                    currentUser.avatar_path?.trim()
                      ? undefined
                      : post.avatar_filename ?? undefined
                  }
                />
                <div className="post-comments-thread__context-main">
                  <p className="post-comments-thread__context-label">Пост</p>
                  <p className="post-comments-thread__context-author">
                    {postAuthorDisplayName(post, currentUser)}
                  </p>
                  {post.media_files.length > 0 ? (
                    <MessageAttachments
                      ownerMessageId={post.id}
                      mediaFiles={post.media_files}
                      className="message-att--compact"
                    />
                  ) : null}
                  <p className="post-comments-thread__context-text">
                    {post.text || '—'}
                  </p>
                </div>
              </div>
              <div className="post-comments-thread__context-meta">
                <div className="section-chat__reactions" role="group">
                  <button
                    type="button"
                    className={
                      myReaction === 'like'
                        ? 'section-chat__reaction section-chat__reaction--active'
                        : 'section-chat__reaction'
                    }
                    onClick={() => {
                      void handleReaction('like')
                    }}
                  >
                    👍 {likeCount}
                  </button>
                  <button
                    type="button"
                    className={
                      myReaction === 'dislike'
                        ? 'section-chat__reaction section-chat__reaction--active'
                        : 'section-chat__reaction'
                    }
                    onClick={() => {
                      void handleReaction('dislike')
                    }}
                  >
                    👎 {dislikeCount}
                  </button>
                </div>
                <span className="post-comments-thread__context-time">
                  {formatShortTime(post.created_at)}
                </span>
              </div>
            </div>

            <p className="post-comments-thread__divider">Начало обсуждения</p>

            {comments.length === 0 && !loading ? (
              <p className="section-chat__empty">Пока нет ответов.</p>
            ) : null}

            <ul className="post-comments-thread__list" role="list">
              {comments.map((c) => (
                <li key={c.id} className="post-comments-thread__item">
                  <UserAvatar
                    className="post-comments-thread__avatar"
                    userId={c.author_id}
                    displayLabel={commentDisplayName(c, currentUser)}
                    avatarUrl={
                      currentUser?.id === c.author_id &&
                      currentUser.avatar_path?.trim()
                        ? resolveAvatarPathUrl(
                            currentUser.avatar_path.trim(),
                            currentUser.id,
                          )
                        : c.author_avatar_url ?? undefined
                    }
                    avatarFilename={
                      currentUser?.id === c.author_id &&
                      currentUser.avatar_path?.trim()
                        ? undefined
                        : c.avatar_filename ?? undefined
                    }
                  />
                  <div className="post-comments-thread__bubble">
                    <p className="post-comments-thread__author">
                      {commentDisplayName(c, currentUser)}
                    </p>
                    {c.media_files.length > 0 ? (
                      <MessageAttachments
                        ownerMessageId={c.id}
                        mediaFiles={c.media_files}
                        className="message-att--compact"
                      />
                    ) : null}
                    <p className="post-comments-thread__text">
                      {c.text || '—'}
                    </p>
                    <p className="post-comments-thread__time">
                      {formatShortTime(c.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {canComment && post ? (
        <div
          className="section-chat__composer post-comments-thread__composer"
          role="region"
          aria-label="Новый комментарий"
        >
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => {
              void onPickFiles(e.target.files)
            }}
          />
          <div className="section-chat__composer-row">
            <button
              className="section-chat__composer-attach"
              type="button"
              disabled={uploadingFiles}
              aria-label="Прикрепить файл"
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
            </button>
            <input
              className="section-chat__composer-pill"
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
              }}
              placeholder="Написать комментарий…"
              maxLength={8000}
              enterKeyHint="send"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim() && !sending) {
                  e.preventDefault()
                  void handleSendComment()
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
                void handleSendComment()
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
      ) : post && !canComment ? (
        <p className="post-comments-thread__readonly">
          Комментарии к этому посту отключены.
        </p>
      ) : null}
    </div>
  )
}
