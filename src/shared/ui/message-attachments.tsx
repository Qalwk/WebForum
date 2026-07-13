import { useEffect, useState, type ReactNode } from 'react'
import {
  fetchAuthenticatedMediaBlob,
  mediaFileRequiresAuth,
  resolveMessageMediaPublicUrl,
} from '../../entities/media/api/media-api'
import type { MessageMediaFileData } from '../../entities/message/model/types'
import { useSession } from '../../entities/session/model/session-context'

function normalizeExt(ext: string): string {
  return ext.trim().replace(/^\./, '').toLowerCase()
}

function extHint(media: MessageMediaFileData): string {
  if (media.extension.trim()) {
    return normalizeExt(media.extension)
  }
  const name = media.original_filename.trim()
  if (name) {
    const match = /\.([^.\/]+)$/i.exec(name)
    if (match?.[1]) {
      return match[1].toLowerCase()
    }
  }
  const mime = media.mime_type.trim().toLowerCase()
  if (mime.startsWith('image/')) {
    const sub = mime.slice('image/'.length).split(';', 1)[0]?.trim() ?? ''
    return sub === 'jpeg' ? 'jpg' : sub === 'svg+xml' ? 'svg' : sub
  }
  if (mime.startsWith('video/')) {
    const sub = mime.slice('video/'.length).split(';', 1)[0]?.trim() ?? ''
    return sub === 'quicktime' ? 'mov' : sub
  }
  if (mime.startsWith('audio/')) {
    return mime.slice('audio/'.length).split(';', 1)[0]?.trim() ?? ''
  }
  if (mime === 'application/pdf') {
    return 'pdf'
  }
  return ''
}

function useAuthenticatedMediaSrc(
  mediaFileId: string,
  enabled: boolean,
): { src: string | null; loading: boolean; error: boolean } {
  const { token } = useSession()
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled || !token) {
      setSrc(null)
      setLoading(false)
      setError(!enabled ? false : !token)
      return
    }

    let blobUrl: string | null = null
    let cancelled = false
    setLoading(true)
    setError(false)
    setSrc(null)

    fetchAuthenticatedMediaBlob(mediaFileId, token)
      .then((blob) => {
        if (cancelled) {
          return
        }
        blobUrl = URL.createObjectURL(blob)
        setSrc(blobUrl)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [mediaFileId, token, enabled])

  return { src, loading, error }
}

type MediaSrcProps = {
  media: MessageMediaFileData
  ownerMessageId: string
  kind: 'image' | 'video' | 'audio'
}

function MediaWithFallback({ media, ownerMessageId, kind }: MediaSrcProps) {
  const publicUrl = resolveMessageMediaPublicUrl(ownerMessageId, media)
  const useAuthFirst = mediaFileRequiresAuth(media)
  const auth = useAuthenticatedMediaSrc(
    media.media_file_id,
    useAuthFirst || !publicUrl,
  )
  const [publicFailed, setPublicFailed] = useState(false)

  const authFallback = useAuthenticatedMediaSrc(
    media.media_file_id,
    publicFailed && !useAuthFirst,
  )

  const activeSrc = useAuthFirst || publicFailed
    ? auth.src ?? authFallback.src
    : publicUrl

  const loading =
    (useAuthFirst || !publicUrl ? auth.loading : false) ||
    (publicFailed ? authFallback.loading : false)
  const error =
    (useAuthFirst || !publicUrl ? auth.error : false) ||
    (publicFailed ? authFallback.error : false)

  if (loading) {
    return <span className="message-att__loading">Загрузка…</span>
  }

  if (error || !activeSrc) {
    return (
      <span className="message-att__err">Не удалось загрузить вложение.</span>
    )
  }

  const onPublicError = () => {
    if (!useAuthFirst) {
      setPublicFailed(true)
    }
  }

  if (kind === 'image') {
    return (
      <img
        className="message-att__img"
        src={activeSrc}
        alt=""
        loading="lazy"
        onError={useAuthFirst || publicFailed ? undefined : onPublicError}
      />
    )
  }

  if (kind === 'video') {
    return (
      <video
        className="message-att__video"
        src={activeSrc}
        controls
        playsInline
        preload="metadata"
        onError={useAuthFirst || publicFailed ? undefined : onPublicError}
      >
        Видео
      </video>
    )
  }

  return (
    <audio
      className="message-att__audio"
      src={activeSrc}
      controls
      onError={useAuthFirst || publicFailed ? undefined : onPublicError}
    />
  )
}

function renderAttachment(
  media: MessageMediaFileData,
  ownerMessageId: string,
  publicUrl: string | undefined,
): ReactNode {
  const ext = extHint(media)
  const mime = media.mime_type.trim().toLowerCase()
  const label = media.original_filename.trim() || 'Скачать файл'

  if (
    /^png|jpe?g|gif|webp|svg$/i.test(ext) ||
    ext === 'svg+xml' ||
    mime.startsWith('image/')
  ) {
    return (
      <MediaWithFallback
        media={media}
        ownerMessageId={ownerMessageId}
        kind="image"
      />
    )
  }

  if (/^mp4|webm|ogv|mov$/i.test(ext) || mime.startsWith('video/')) {
    return (
      <MediaWithFallback
        media={media}
        ownerMessageId={ownerMessageId}
        kind="video"
      />
    )
  }

  if (/^mp3|m4a|wav|aac|ogg|opus$/i.test(ext) || mime.startsWith('audio/')) {
    return (
      <MediaWithFallback
        media={media}
        ownerMessageId={ownerMessageId}
        kind="audio"
      />
    )
  }

  const linkUrl =
    publicUrl && !mediaFileRequiresAuth(media)
      ? publicUrl
      : undefined

  if (!linkUrl) {
    return (
      <span className="message-att__err">
        Ссылка на файл доступна только через авторизованный API.
      </span>
    )
  }

  if (ext === 'pdf' || mime === 'application/pdf') {
    return (
      <a
        className="message-att__link"
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Открыть PDF
      </a>
    )
  }

  return (
    <a
      className="message-att__link"
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  )
}

function AttachmentSlot({
  ownerMessageId,
  media,
}: {
  ownerMessageId: string
  media: MessageMediaFileData
}) {
  const publicUrl = resolveMessageMediaPublicUrl(ownerMessageId, media)
  return renderAttachment(media, ownerMessageId, publicUrl)
}

export type MessageAttachmentsProps = {
  ownerMessageId: string
  mediaFiles: MessageMediaFileData[]
  className?: string
}

export function MessageAttachments({
  ownerMessageId,
  mediaFiles,
  className = '',
}: MessageAttachmentsProps) {
  if (mediaFiles.length === 0) {
    return null
  }

  const sorted = [...mediaFiles].sort((a, b) => a.sort_order - b.sort_order)

  const rootClass =
    className.trim() !== ''
      ? `message-att ${className}`.trim()
      : 'message-att'

  return (
    <div className={rootClass} role="region" aria-label="Вложения">
      <ul className="message-att__list">
        {sorted.map((m) => (
          <li
            key={`${ownerMessageId}-${m.media_file_id}-${m.sort_order}`}
            className="message-att__item"
          >
            <div className="message-att__slot">
              <AttachmentSlot ownerMessageId={ownerMessageId} media={m} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
