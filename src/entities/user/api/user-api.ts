import { requestJson } from '../../../shared/api/http-client'
import type { CurrentUserResponse } from '../model/types'

/** OpenAPI: GET /users/me */
export function getCurrentUser(token: string) {
  return requestJson<CurrentUserResponse>('/users/me', { token })
}
