import { API_BASE_URL } from '../../../shared/config/env'

type TelegramAuthResponse = {
  access_token: string
  refresh_token: string | null
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

  const payload = (await response.json()) as TelegramAuthResponse | { detail?: unknown }

  if (!response.ok || !('access_token' in payload)) {
    throw new Error('Не удалось авторизоваться через Telegram Mini App.')
  }

  return payload
}
