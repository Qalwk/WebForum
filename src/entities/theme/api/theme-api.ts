import { requestJson } from '../../../shared/api/http-client'
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

export function getThemeSections(themeId: string, token: string) {
  return requestJson<ThemeSection[]>(`/themes/${themeId}/sections`, { token })
}

export async function createTheme(payload: CreateThemePayload, token: string) {
  const response = await requestJson<IdResponse>('/themes', {
    method: 'POST',
    token,
    body: payload,
  })

  return response.id
}
