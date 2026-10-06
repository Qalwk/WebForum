import { requestJson } from '../../../shared/api/http-client'
import { normalizeThemeSection } from '../lib/normalize-theme-section'
import type {
  CreateThemePayload,
  Theme,
  ThemeSection,
  UpdateThemePayload,
} from '../model/types'

type IdResponse = {
  id: string
}

export function getRootTheme(token: string) {
  return requestJson<Theme>('/themes/root', { token })
}

export function getThemeById(themeId: string, token: string) {
  return requestJson<Theme>(`/themes/${themeId}`, { token })
}

export function getChildThemes(themeId: string, token: string) {
  return requestJson<Theme[]>(`/themes/${themeId}/children`, { token })
}

export function searchThemes(
  query: string,
  token: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
  })
  return requestJson<Theme[]>(`/themes/search?${params}`, { token })
}

export function updateTheme(
  themeId: string,
  payload: UpdateThemePayload,
  token: string,
) {
  return requestJson<Theme>(`/themes/${themeId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export async function getThemeSections(themeId: string, token: string) {
  const rows = await requestJson<unknown>(`/themes/${themeId}/sections`, {
    token,
  })
  if (!Array.isArray(rows)) {
    return []
  }
  return rows.map((row): ThemeSection => normalizeThemeSection(row))
}

export async function createTheme(payload: CreateThemePayload, token: string) {
  const response = await requestJson<IdResponse>('/themes', {
    method: 'POST',
    token,
    body: payload,
  })

  return response.id
}
