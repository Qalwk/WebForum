import { API_BASE_URL } from '../config/env'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
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

function messageFromApiPayload(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload && 'message' in payload) {
    const message = (payload as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof payload !== 'object' || !payload || !('detail' in payload)) {
    return `Request failed with status ${status}`
  }

  const detail = (payload as { detail: unknown }).detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === 'object' && first && 'msg' in first) {
      return String((first as { msg: unknown }).msg)
    }
  }

  if (typeof detail === 'object' && detail && 'message' in detail) {
    return String((detail as { message: unknown }).message)
  }

  return `Request failed with status ${status}`
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
      /* Только при теле: на GET с Content-Type: application/json часть прокси/серверов даёт сбой. */
      ...(body ? { 'Content-Type': 'application/json' } : {}),
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
    throw new HttpError(
      messageFromApiPayload(payload, response.status),
      response.status,
      payload,
    )
  }

  return payload as T
}

/**
 * Multipart: не задаём Content-Type, чтобы браузер проставил boundary.
 */
export async function requestFormDataJson<T>(
  path: string,
  formData: FormData,
  options: { method?: 'POST' | 'PATCH'; token?: string } = {},
): Promise<T> {
  const { method = 'POST', token } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
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
    throw new HttpError(
      messageFromApiPayload(payload, response.status),
      response.status,
      payload,
    )
  }

  return payload as T
}
