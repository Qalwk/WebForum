import { API_BASE_URL, API_ROOT_ORIGIN } from '../config/env'

export type BackendCheckResult = {
  label: string
  ok: boolean
  status?: number
  detail: string
}

/**
 * Три лёгких запроса с клиента: есть ли связь с бэком, CORS и ожидаемые ответы.
 * Не использует токен — только публичные/полупубличные сценарии.
 */
export async function runBackendDiagnostics(): Promise<BackendCheckResult[]> {
  const results: BackendCheckResult[] = []
  const openapiUrl = `${API_ROOT_ORIGIN.replace(/\/+$/, '')}/openapi.json`

  try {
    const response = await fetch(openapiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    results.push({
      label: 'GET /openapi.json',
      ok: response.ok,
      status: response.status,
      detail: response.ok
        ? 'Спецификация доступна'
        : `Ответ ${response.status} (на проде иногда отключён — смотри следующие строки)`,
    })
  } catch (error) {
    results.push({
      label: 'GET /openapi.json',
      ok: false,
      detail:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Сеть или CORS с браузера',
    })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/themes/root`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const unauthorized = response.status === 401 || response.status === 403
    results.push({
      label: 'GET /api/v1/themes/root (без токена)',
      ok: unauthorized,
      status: response.status,
      detail: unauthorized
        ? 'Бэкенд отвечает: без JWT ожидаемо 401/403'
        : response.status === 404
          ? 'Маршрут не найден — проверь VITE_API_BASE_URL (нужен суффикс /api/v1)'
          : `Неожиданный статус ${response.status}`,
    })
  } catch (error) {
    results.push({
      label: 'GET /api/v1/themes/root (без токена)',
      ok: false,
      detail:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Сеть или CORS',
    })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    const routeAlive = response.status === 422 || response.status === 400
    results.push({
      label: 'POST /api/v1/auth/telegram (пустое тело)',
      ok: routeAlive,
      status: response.status,
      detail: routeAlive
        ? 'Ручка жива (422/400 на пустой JSON — норма)'
        : `Статус ${response.status} — ожидали 422 валидации`,
    })
  } catch (error) {
    results.push({
      label: 'POST /api/v1/auth/telegram (пустое тело)',
      ok: false,
      detail:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Сеть или CORS',
    })
  }

  return results
}
