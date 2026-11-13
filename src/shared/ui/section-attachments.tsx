import { useEffect, useState } from 'react'
import { fetchAuthenticatedMediaBlob } from '../../entities/media/api/media-api'
import { useSession } from '../../entities/session/model/session-context'
import type { SectionMediaFile } from '../../entities/section/model/types'

function SectionAttachment({ file }: { file: SectionMediaFile }) {
  const { token } = useSession()
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    let objectUrl = ''
    fetchAuthenticatedMediaBlob(file.media_file_id, token)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setError(false)
      })
      .catch(() => { if (active) setError(true) })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.media_file_id, token])

  const name = file.original_filename || `Вложение ${file.sort_order}`
  const mime = file.mime_type.toLowerCase()
  if (error) return <p className="section-info__attachment-error">Не удалось загрузить файл «{name}».</p>
  if (!src) return <p className="section-info__attachment-loading">Загрузка файла «{name}»…</p>
  if (mime.startsWith('image/')) {
    return <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={name} className="section-info__image" /></a>
  }
  if (mime.startsWith('video/')) return <video src={src} controls playsInline className="section-info__video" />
  if (mime.startsWith('audio/')) return <audio src={src} controls className="section-info__audio" />
  return <a href={src} download={name} className="section-info__file">📎 {name}</a>
}

export function SectionAttachments({ files }: { files: SectionMediaFile[] }) {
  if (!files.length) return null
  return (
    <div className="section-info__attachments" aria-label="Вложения секции">
      {[...files].sort((a, b) => a.sort_order - b.sort_order).map((file) => (
        <SectionAttachment key={file.media_file_id} file={file} />
      ))}
    </div>
  )
}
