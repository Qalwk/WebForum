/** База совпадает с префиксом путей в OpenAPI: /api/v1/... */
const DEFAULT_API_BASE_URL =
  'https://oleg-forum-site.matthew-0203.ru/api/v1'

/** Тот же хост без пути (для /openapi.json и т.п.). Задаётся в .env как VITE_API_ROOT_ORIGIN. */
const DEFAULT_API_ROOT_ORIGIN =
  'https://oleg-forum-site.matthew-0203.ru'

function trimTrailingSlashes(base: string) {
  return base.replace(/\/+$/, '')
}

/** Без завершающего `/`: иначе `https://host/api/v1/` + `/themes` даёт двойной слэш. */
export const API_BASE_URL = trimTrailingSlashes(
  String(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).trim(),
)

export const API_ROOT_ORIGIN = trimTrailingSlashes(
  String(import.meta.env.VITE_API_ROOT_ORIGIN ?? DEFAULT_API_ROOT_ORIGIN).trim(),
)

/** Локально: .env.local. На Vercel переменные задаются в настройках проекта (файл .env.local в git не едет). */
export const DEFAULT_API_TOKEN = (
  import.meta.env.VITE_API_BEARER_TOKEN ??
  import.meta.env.VITE_API_TOKEN ??
  ''
).trim()
