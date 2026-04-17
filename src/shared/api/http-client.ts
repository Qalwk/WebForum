import { API_BASE_URL } from '../config/env'

type RequestOptions = {
  method?: 'GET' | 'POST'
  token?: string
  body?: unknown
}

export class HttpError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', token, body } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload: unknown = null

  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload &&
      'detail' in payload &&
      typeof payload.detail === 'object' &&
      payload.detail &&
      'message' in payload.detail
        ? String(payload.detail.message)
        : `Request failed with status ${response.status}`

    throw new HttpError(message, response.status, payload)
  }

  return payload as T
}
