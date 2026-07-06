import { HttpError, requestFormDataJson } from '../../../shared/api/http-client'
import { API_BASE_URL, API_ROOT_ORIGIN } from '../../../shared/config/env'

/** Вложения и аватары не в OpenAPI — договорённость с бэкендом (статик без Bearer):
 * - вложения: `https://ХОСТ/static/messages/{message_id}/{filename}` (message_id — id поста/коммента)
 * - аватар: `https://ХОСТ/static/avatars/{user_id}/{filename}`
 */
const STATIC_FILES_ORIGIN = API_ROOT_ORIGIN
const STATIC_MESSAGES_PREFIX = '/static/messages'
const STATIC_AVATARS_PREFIX = '/static/avatars'

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}

function normalizePathLike(value: string): string {
  return value.trim().replace(/\\/g, '/')
}

function hasProtocol(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function joinPublicPath(...parts: string[]): string {
  const path = parts
    .flatMap((part) => trimSlashes(part).split('/'))
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')

  return `${STATIC_FILES_ORIGIN}${path ? `/${path}` : ''}`
}

function resolveStaticPath(pathOrAbsoluteUrl: string): string {
  const t = normalizePathLike(pathOrAbsoluteUrl)
  if (!t || hasProtocol(t)) {
    return t
  }
  const normalized = t.startsWith('/') ? t : `/${t}`
  return `${STATIC_FILES_ORIGIN}${normalized}`
}

/**
 * Публичный URL по пути вида `/static/...` (как в UserResponse.avatar_path).
 */
export function resolvePublicFileUrl(pathOrAbsoluteUrl: string): string {
  const t = normalizePathLike(pathOrAbsoluteUrl)
  if (!t) {
    return t
  }
  if (hasProtocol(t)) {
    return t
  }
  const normalized = t.startsWith('/') ? t : `/${t}`
  return `${STATIC_FILES_ORIGIN}${normalized}`
}

/**
 * `avatar_path` с бэка может прийти как:
 * - `/static/avatars/{user_id}/{filename}`
 * - `static/avatars/{user_id}/{filename}`
 * - `{user_id}/{filename}` (по договорённости: `/static/avatars/avatar_path`)
 * - просто `{filename}` — тогда добавляем `userId`.
 */
export function resolveAvatarPathUrl(
  avatarPath: string,
  userId?: string,
): string {
  const t = normalizePathLike(avatarPath)
  if (!t || hasProtocol(t)) {
    return t
  }

  const rel = trimSlashes(t)
  if (rel.startsWith('static/avatars/')) {
    return resolveStaticPath(rel)
  }
  if (rel.startsWith('avatars/')) {
    return resolveStaticPath(`static/${rel}`)
  }

  const parts = rel.includes('/')
    ? rel.split('/').filter(Boolean)
    : [userId?.trim() ?? '', rel].filter(Boolean)
  return joinPublicPath(STATIC_AVATARS_PREFIX, ...parts)
}

/**
 * URL вида `/api/v1/media_files/{id}` требует Bearer — в `<img src>` не подходит.
 */
export function isProtectedMediaApiUrl(url: string): boolean {
  const t = normalizePathLike(url).toLowerCase()
  return /\/api\/v1\/media_files\//.test(t) || /\/media_files\/[0-9a-f-]{36}/i.test(t)
}

/**
 * Имя файла на статике: `{media_file_id}{extension}`.
 */
export function messageMediaStaticBasename(media: {
  media_file_id: string
  extension: string
  original_filename: string
}): string {
  const id = media.media_file_id.trim()
  if (!id) {
    return ''
  }
  if (/\.[a-z0-9]{2,8}$/i.test(id)) {
    return id
  }
  const ext = media.extension.trim()
  if (ext) {
    const dotExt = ext.startsWith('.') ? ext : `.${ext}`
    return `${id}${dotExt}`
  }
  const orig = media.original_filename.trim()
  if (orig) {
    const leaf = orig.split(/[/\\]/).pop() ?? orig
    return leaf.trim()
  }
  return id
}

/**
 * Публичный URL вложения для `<img>` / `<video>` без Bearer.
 */
export function resolveMessageMediaPublicUrl(
  ownerMessageId: string,
  media: {
    url: string
    media_file_id: string
    extension: string
    original_filename: string
  },
): string | undefined {
  const rawUrl = media.url.trim()
  if (rawUrl && !isProtectedMediaApiUrl(rawUrl)) {
    return resolvePublicFileUrl(rawUrl)
  }

  const owner = ownerMessageId.trim()
  if (!owner) {
    return undefined
  }

  const basename = messageMediaStaticBasename(media)
  if (!basename) {
    return undefined
  }

  return buildStaticMessageAttachmentUrl(owner, basename)
}

const mediaBlobCache = new Map<string, Promise<string>>()

/** Бэкенд отдаёт `url` на `/api/v1/media_files/{id}` — нужен Bearer, не прямой `<img src>`. */
export function mediaFileRequiresAuth(media: { url: string }): boolean {
  const raw = media.url.trim()
  return raw !== '' && isProtectedMediaApiUrl(raw)
}

/**
 * GET /media_files/{id} с Bearer → blob: URL для `<img>` / `<video>`.
 * Токен в src напрямую передать нельзя — только так.
 */
export async function fetchAuthenticatedMediaBlobUrl(
  mediaFileId: string,
  token: string,
): Promise<string> {
  const id = mediaFileId.trim()
  if (!id || !token) {
    throw new HttpError('Media file id or token is missing', 0, null)
  }

  const cacheKey = id
  const cached = mediaBlobCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const promise = (async () => {
    const response = await fetch(
      `${API_BASE_URL}/media_files/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (!response.ok) {
      const text = await response.text()
      let payload: unknown = text
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        /* не JSON */
      }
      throw new HttpError('Media file request failed', response.status, payload)
    }
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  })()

  mediaBlobCache.set(cacheKey, promise)
  promise.catch(() => {
    mediaBlobCache.delete(cacheKey)
  })
  return promise
}

/**
 * Публичный URL вложения сообщения — для `<img>` / `<video>` без Bearer.
 * Пример: `https://…/static/messages/<post_or_comment_uuid>/<stored>.png`
 */
export function buildStaticMessageAttachmentUrl(
  ownerMessageId: string,
  filename: string,
): string {
  const file = normalizePathLike(filename)
  if (!file || hasProtocol(file)) {
    return file
  }

  const rel = trimSlashes(file)
  if (rel.startsWith('static/messages/')) {
    return resolveStaticPath(rel)
  }
  if (rel.startsWith('messages/')) {
    return resolveStaticPath(`static/${rel}`)
  }
  if (rel.includes('/')) {
    return joinPublicPath(STATIC_MESSAGES_PREFIX, rel)
  }

  return joinPublicPath(STATIC_MESSAGES_PREFIX, ownerMessageId, rel)
}

/**
 * Публичный URL аватара — для `<img src>` без Bearer.
 */
export function buildStaticAvatarUrl(userId: string, filename: string): string {
  return resolveAvatarPathUrl(filename, userId)
}

/**
 * Если с бэка приходит stem без расширения — перебираем типичные варианты (onError у img).
 */
export function buildAvatarUrlCandidates(
  userId: string,
  filenameOrStem: string,
): string[] {
  const fn = filenameOrStem.trim()
  const uid = userId.trim()
  if (!fn || !uid) {
    return []
  }
  const hasDot = /\.[a-zA-Z0-9]{2,8}$/.test(fn)
  if (hasDot) {
    return [buildStaticAvatarUrl(uid, fn)]
  }
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].map((ext) =>
    buildStaticAvatarUrl(uid, `${fn}.${ext}`),
  )
}

/**
 * OpenAPI: POST /media_files/uploads — form field `files` (массив бинарников).
 * Ответ: массив UUID медиафайлов.
 */
export async function uploadMediaFiles(
  files: File[],
  token: string,
): Promise<string[]> {
  if (files.length === 0) {
    return []
  }
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  return requestFormDataJson<string[]>('/media_files/uploads', form, {
    method: 'POST',
    token,
  })
}
