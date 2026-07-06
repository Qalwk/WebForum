import { API_BASE_URL } from '../../../shared/config/env'
import { HttpError } from '../../../shared/api/http-client'
import {
  getAuthErrorMessage,
  parseAuthErrorPayload,
} from '../lib/parse-auth-error'
import type {
  AuthTokensResponse,
  LoginByEmailRequest,
  RegisterByEmailRequest,
} from '../model/auth-types'

async function postAuthJson<T>(
  path: string,
  body: unknown,
  context: 'login' | 'register',
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let payload: unknown = null

  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = { detail: text }
    }
  }

  if (!response.ok) {
    throw new HttpError(
      parseAuthErrorPayload(payload, response.status, context),
      response.status,
      payload,
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new HttpError(
      getAuthErrorMessage(null, context),
      response.status,
      payload,
    )
  }

  return payload as T
}

export function authByTelegram(initDataRaw: string) {
  return postAuthJson<AuthTokensResponse>(
    '/auth/telegram',
    { init_data: initDataRaw },
    'login',
  )
}

/** OpenAPI: POST /api/v1/auth/login */
export function loginByEmail(body: LoginByEmailRequest) {
  return postAuthJson<AuthTokensResponse>('/auth/login', body, 'login')
}

/** OpenAPI: POST /api/v1/auth/register (201) */
export function registerByEmail(body: RegisterByEmailRequest) {
  return postAuthJson<AuthTokensResponse>('/auth/register', body, 'register')
}
