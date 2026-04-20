import { API_BASE_URL } from '../../../shared/config/env'

type TelegramAuthResponse = {
  access_token: string
  refresh_token: string | null
}

function messageFromAuthPayload(payload: unknown): string {
  const fallback = 'Не удалось авторизоваться через Telegram Mini App.'

  if (typeof payload === 'object' && payload && 'message' in payload) {
    const message = (payload as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof payload !== 'object' || !payload || !('detail' in payload)) {
    return fallback
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

  return fallback
}

export async function authByTelegram(initDataRaw: string) {
  const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      init_data: initDataRaw,
    }),
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

  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error(messageFromAuthPayload(payload))
  }

  if (!('access_token' in payload)) {
    throw new Error(messageFromAuthPayload(payload))
  }

  return payload as TelegramAuthResponse
}
