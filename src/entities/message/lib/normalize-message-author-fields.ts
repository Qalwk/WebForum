import { resolveAvatarPathUrl } from '../../media/api/media-api'
import type {
  CommentMessageResponse,
  PostMessageResponse,
  TaskMessageResponse,
} from '../model/types'

function pickTrim(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  return value as Record<string, unknown>
}

function stripLeaf(pathOrName: string): string {
  const t = pathOrName.trim()
  const slash = Math.max(t.lastIndexOf('/'), t.lastIndexOf('\\'))
  return slash >= 0 ? t.slice(slash + 1) : t
}

function pickAvatarFilenameFromObject(o: Record<string, unknown>): string | undefined {
  const keys = [
    'avatar_filename',
    'avatar_file_name',
    'avatar_storage_name',
    'stored_filename',
    'filename',
  ]
  for (const key of keys) {
    const s = pickTrim(o[key])
    if (s && !/^https?:\/\//i.test(s)) {
      return stripLeaf(s)
    }
  }
  const pathLike = pickTrim(o.avatar_path) ?? pickTrim(o.photo_path)
  if (pathLike) {
    if (pathLike.startsWith('/')) {
      return undefined
    }
    return stripLeaf(pathLike)
  }
  return undefined
}

function looksLikeUuid(s: string): boolean {
  const t = s.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)
}

function firstNameFromUserLike(o: Record<string, unknown>): string | undefined {
  const direct =
    pickTrim(o.first_name) ??
    pickTrim(o.firstName) ??
    pickTrim(o.display_name) ??
    pickTrim(o.displayName) ??
    pickTrim(o.author_name) ??
    pickTrim(o.author_display_name) ??
    pickTrim(o.authorDisplayName) ??
    pickTrim(o.full_name) ??
    pickTrim(o.fullName) ??
    pickTrim(o.name) ??
    pickTrim(o.nickname) ??
    pickTrim(o.nick_name)

  if (direct) {
    return direct
  }

  const login = pickTrim(o.username) ?? pickTrim(o.user_name) ?? pickTrim(o.login)
  if (login && !looksLikeUuid(login)) {
    return login
  }

  return undefined
}

/** Готовый URL аватара: абсолютный http(s) или путь для `/static/avatars/...`. */
function pickResolvedAvatarUrlFromObject(o: Record<string, unknown>): string | undefined {
  const absKeys = [
    'author_avatar_url',
    'avatar_url',
    'photo_url',
    'avatarUrl',
    'photoUrl',
  ]
  for (const key of absKeys) {
    const s = pickTrim(o[key])
    if (s && /^https?:\/\//i.test(s)) {
      return s
    }
  }

  const pathKeys = ['avatar_path', 'photo_path', 'avatar_rel_path', 'photo_rel_path']
  for (const key of pathKeys) {
    const s = pickTrim(o[key])
    if (s) {
      return resolveAvatarPathUrl(s, pickTrim(o.id) ?? pickTrim(o.author_id))
    }
  }

  return undefined
}

export type ExtractedAuthorFields = {
  first_name?: string
  avatar_filename?: string
  author_avatar_url?: string
}

/**
 * Вытащить имя и аватар из плоского ответа и вложенных `author` / `user`.
 */
export function extractAuthorFieldsFromEnvelope(
  raw: Record<string, unknown>,
): ExtractedAuthorFields {
  const out: ExtractedAuthorFields = {}

  let name =
    pickTrim(raw.first_name) ??
    pickTrim(raw.author_first_name) ??
    pickTrim(raw.user_first_name) ??
    pickTrim(raw.display_name) ??
    pickTrim(raw.displayName) ??
    pickTrim(raw.author_name)

  if (!name) {
    const guess = firstNameFromUserLike(raw)
    if (guess) {
      name = guess
    }
  }

  const flatUrl = pickResolvedAvatarUrlFromObject(raw)
  if (flatUrl) {
    out.author_avatar_url = flatUrl
  }

  const flatFn = pickAvatarFilenameFromObject(raw)
  if (flatFn) {
    out.avatar_filename = flatFn
  }

  for (const key of ['author', 'user'] as const) {
    const nested = asRecord(raw[key])
    if (!nested) {
      continue
    }
    if (!name) {
      const n = firstNameFromUserLike(nested)
      if (n) {
        name = n
      }
    }
    if (!out.author_avatar_url) {
      const u = pickResolvedAvatarUrlFromObject(nested)
      if (u) {
        out.author_avatar_url = u
      }
    }
    if (!out.avatar_filename) {
      const fn = pickAvatarFilenameFromObject(nested)
      if (fn) {
        out.avatar_filename = fn
      }
    }
  }

  if (name) {
    out.first_name = name
  }
  return out
}

export function normalizePostMessagePayload(
  raw: PostMessageResponse,
): PostMessageResponse {
  const r = raw as unknown as Record<string, unknown>
  const ex = extractAuthorFieldsFromEnvelope(r)
  if (
    !ex.first_name &&
    !ex.avatar_filename &&
    !ex.author_avatar_url
  ) {
    return raw
  }
  return {
    ...raw,
    ...(ex.first_name ? { first_name: ex.first_name } : {}),
    ...(ex.avatar_filename ? { avatar_filename: ex.avatar_filename } : {}),
    ...(ex.author_avatar_url ? { author_avatar_url: ex.author_avatar_url } : {}),
  }
}

export function normalizeTaskMessagePayload(
  raw: TaskMessageResponse,
): TaskMessageResponse {
  const r = raw as unknown as Record<string, unknown>
  const ex = extractAuthorFieldsFromEnvelope(r)
  if (
    !ex.first_name &&
    !ex.avatar_filename &&
    !ex.author_avatar_url
  ) {
    return raw
  }
  return {
    ...raw,
    ...(ex.first_name ? { first_name: ex.first_name } : {}),
    ...(ex.avatar_filename ? { avatar_filename: ex.avatar_filename } : {}),
    ...(ex.author_avatar_url ? { author_avatar_url: ex.author_avatar_url } : {}),
  }
}

export function normalizeCommentMessagePayload(
  raw: CommentMessageResponse,
): CommentMessageResponse {
  const r = raw as unknown as Record<string, unknown>
  const ex = extractAuthorFieldsFromEnvelope(r)
  const first_name =
    pickTrim(r.first_name) ??
    pickTrim(r.author_first_name) ??
    pickTrim(r.user_first_name) ??
    pickTrim(r.display_name) ??
    pickTrim(r.displayName) ??
    pickTrim(r.author_name) ??
    ex.first_name
  return {
    ...raw,
    ...(first_name ? { first_name } : {}),
    ...(ex.avatar_filename ? { avatar_filename: ex.avatar_filename } : {}),
    ...(ex.author_avatar_url ? { author_avatar_url: ex.author_avatar_url } : {}),
  }
}
