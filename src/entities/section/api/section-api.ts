import { requestJson } from '../../../shared/api/http-client'
import type { SectionResponse, UpdateSectionPayload } from '../model/types'

export function getSections(token: string) {
  return requestJson<SectionResponse[]>('/sections', { token })
}

export function getSectionById(sectionId: string, token: string) {
  return requestJson<SectionResponse>(`/sections/${encodeURIComponent(sectionId)}`, { token })
}

export function updateSection(sectionId: string, payload: UpdateSectionPayload, token: string) {
  return requestJson<unknown>(`/sections/${encodeURIComponent(sectionId)}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}
