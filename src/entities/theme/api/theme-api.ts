import { requestJson } from '../../../shared/api/http-client'
import { normalizeThemeSection } from '../lib/normalize-theme-section'
import type {
  CreateThemePayload,
  Theme,
  ThemeSection,
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
