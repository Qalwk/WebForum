import { useEffect, useMemo, useState } from 'react'
import {
  buildAvatarUrlCandidates,
  resolveAvatarPathUrl,
} from '../../entities/media/api/media-api'

export type UserAvatarProps = {
  userId: string
  /** Подпись к аватару и буква, если фото недоступно. */
  displayLabel: string
  className?: string
  avatarUrl?: string | null
  avatarFilename?: string | null
}

export function UserAvatar({
  userId,
  displayLabel,
  className = '',
  avatarUrl,
  avatarFilename,
}: UserAvatarProps) {
  const label = displayLabel.trim() || '?'
  const letter = label.slice(0, 1).toUpperCase()

  const urls = useMemo(() => {
    const list: string[] = []

    if (typeof avatarUrl === 'string') {
      const t = avatarUrl.trim()
      if (t) {
        if (/^https?:\/\//i.test(t)) {
          list.push(t)
        } else {
          list.push(resolveAvatarPathUrl(t, userId))
        }
      }
    }

    const fromFile =
      typeof avatarFilename === 'string' && avatarFilename.trim().length > 0
        ? buildAvatarUrlCandidates(userId, avatarFilename.trim())
        : []

    return [...list, ...fromFile]
  }, [avatarUrl, avatarFilename, userId])

  const [candidateIndex, setCandidateIndex] = useState(0)
  const [imgBroken, setImgBroken] = useState(false)

  useEffect(() => {
    setCandidateIndex(0)
    setImgBroken(false)
  }, [avatarUrl, avatarFilename, userId])

  const activeSrc =
    urls.length > 0 && candidateIndex < urls.length && !imgBroken
      ? urls[candidateIndex]
      : undefined

  return (
    <div
      className={`user-avatar ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <span className="user-avatar__letter">{letter}</span>
      {activeSrc ? (
        <img
          className="user-avatar__img"
          alt=""
          src={activeSrc}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => {
            setImgBroken(false)
          }}
          onError={() => {
            if (candidateIndex + 1 < urls.length) {
              setCandidateIndex((i) => i + 1)
            } else {
              setImgBroken(true)
            }
          }}
        />
      ) : null}
    </div>
  )
}
