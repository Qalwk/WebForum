import type { MessageReactionTypeApi } from '../../../entities/message/model/types'
import type { PostMessageResponse } from '../../../entities/message/model/types'
import { MessageAttachments } from '../../../shared/ui/message-attachments'
import { UserAvatar } from '../../../shared/ui/user-avatar'

type PostMessageCardProps = {
  post: PostMessageResponse
  likeCount: number
  dislikeCount: number
  myReaction: MessageReactionTypeApi | null
  onReaction: (messageId: string, kind: MessageReactionTypeApi) => void
  /** ИКР: «техническое моделирование» без лайков/дизлайков по ТЗ. */
  hideReactions?: boolean
  /** Отдельный экран обсуждения (как тред в Telegram). */
  onOpenCommentThread?: () => void
}

function formatShortDate(iso: string) {
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

function postAuthorLabel(m: PostMessageResponse) {
  const n = m.first_name?.trim()
  return n ? n : authorIdPeek(m.author_id)
}

export function PostMessageCard({
  post: m,
  likeCount,
  dislikeCount,
  myReaction,
  onReaction,
  hideReactions = false,
  onOpenCommentThread,
}: PostMessageCardProps) {
  const canComment = m.allow_comments !== false
  const showThread = canComment && onOpenCommentThread

  return (
    <article className="section-chat__bubble">
      <div className="section-chat__author-row">
        <UserAvatar
          className="section-chat__author-avatar"
          userId={m.author_id}
          displayLabel={postAuthorLabel(m)}
          avatarUrl={m.author_avatar_url ?? undefined}
          avatarFilename={m.avatar_filename ?? undefined}
        />
        <span className="section-chat__author-name">{postAuthorLabel(m)}</span>
      </div>
      {m.media_files.length > 0 ? (
        <MessageAttachments ownerMessageId={m.id} mediaFiles={m.media_files} />
      ) : null}
      <p className="section-chat__text">{m.text || '—'}</p>
      <div
        className={
          hideReactions
            ? 'section-chat__meta section-chat__meta--no-reactions'
            : 'section-chat__meta'
        }
      >
        {hideReactions ? null : (
          <div className="section-chat__reactions" role="group" aria-label="Реакции">
            <button
              type="button"
              className={
                myReaction === 'like'
                  ? 'section-chat__reaction section-chat__reaction--active'
                  : 'section-chat__reaction'
              }
              onClick={() => {
                onReaction(m.id, 'like')
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
                onReaction(m.id, 'dislike')
              }}
            >
              👎 {dislikeCount}
            </button>
          </div>
        )}
        <span className="section-chat__date">
          {formatShortDate(m.created_at)}
        </span>
      </div>

      {showThread ? (
        <div className="section-chat__comments-block">
          <button
            type="button"
            className="section-chat__comments-thread-cta"
            onClick={onOpenCommentThread}
          >
            Комментарии
            <span className="section-chat__comments-thread-cta-hint" aria-hidden>
              →
            </span>
          </button>
        </div>
      ) : null}
    </article>
  )
}
