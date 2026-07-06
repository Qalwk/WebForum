const TELEGRAM_WEB_APP_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js'

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function setCssVariable(name: string, value: string | undefined) {
  if (!value || typeof document === 'undefined') {
    return
  }

  document.documentElement.style.setProperty(name, value)
}

/**
 * Пробрасываем contentSafeAreaInset / safeAreaInset в CSS, чтобы вёрстка не
 * залезала под кнопки «Закрыть» / «⋯» и вырез. См. safeAreaChanged в WebApp.
 */
function applyTelegramSafeAreaToCss() {
  const webApp = getTelegramWebApp()
  if (!webApp) {
    return
  }

  const c = webApp.contentSafeAreaInset
  const s = webApp.safeAreaInset
  const top = (typeof c?.top === 'number' ? c.top : s?.top) ?? 0
  const bottom = (typeof c?.bottom === 'number' ? c.bottom : s?.bottom) ?? 0
  const left = (typeof c?.left === 'number' ? c.left : s?.left) ?? 0
  const right = (typeof c?.right === 'number' ? c.right : s?.right) ?? 0

  setCssVariable(
    '--app-content-inset-top',
    Number.isFinite(top) && top >= 0 ? `${top}px` : '0px',
  )
  setCssVariable(
    '--app-content-inset-bottom',
    Number.isFinite(bottom) && bottom >= 0 ? `${bottom}px` : '0px',
  )
  setCssVariable(
    '--app-content-inset-left',
    Number.isFinite(left) && left >= 0 ? `${left}px` : '0px',
  )
  setCssVariable(
    '--app-content-inset-right',
    Number.isFinite(right) && right >= 0 ? `${right}px` : '0px',
  )
}

let safeAreaEventsSubscribed = false

function subscribeTelegramSafeAreaEvents() {
  if (safeAreaEventsSubscribed) {
    return
  }
  const webApp = getTelegramWebApp()
  if (!webApp?.onEvent) {
    return
  }
  const handler = () => {
    applyTelegramSafeAreaToCss()
  }
  webApp.onEvent('safeAreaChanged', handler)
  webApp.onEvent('contentSafeAreaChanged', handler)
  safeAreaEventsSubscribed = true
}

/** User-Agent в клиенте Telegram часто содержит «Telegram» (но не всегда). */
export function isLikelyTelegramUserAgent() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /Telegram/i.test(navigator.userAgent)
}

/**
 * Признак «скорее всего Mini App», без опоры на window.Telegram:
 * скрипт telegram-web-app.js создаёт Telegram и в обычном Chrome — это даёт ложные срабатывания.
 */
export function isTelegramClientHint(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (isLikelyTelegramUserAgent()) {
    return true
  }

  const { hash, search } = window.location
  return /tgWebAppData=/.test(hash) || /tgWebAppData=/.test(search)
}

/**
 * Строка initData из адреса (hash/query), если клиент передал Web App так.
 * Нужна, когда SDK ещё не поднялся или hash успели не потерять при редиректе.
 */
export function readTelegramInitDataFromLocation(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const fromSearch = new URLSearchParams(window.location.search).get(
    'tgWebAppData',
  )
  if (fromSearch?.trim()) {
    return fromSearch.trim()
  }

  const rawHash = window.location.hash
  if (rawHash.length > 1) {
    const h = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
    const fromHash = new URLSearchParams(h).get('tgWebAppData')
    if (fromHash?.trim()) {
      return fromHash.trim()
    }
  }

  return ''
}

/**
 * Если в head скрипт с CDN не поднялся, пробуем подгрузить SDK ещё раз (async).
 * Без window.Telegram.WebApp сессия и initData недоступны.
 */
export function ensureTelegramScriptLoaded(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }

  if (getTelegramWebApp()) {
    return Promise.resolve()
  }

  const pending = document.querySelector(
    'script[data-webforum-telegram-loader="1"]',
  )

  if (pending) {
    return new Promise((resolve) => {
      pending.addEventListener('load', () => resolve(), { once: true })
      pending.addEventListener('error', () => resolve(), { once: true })
    })
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = TELEGRAM_WEB_APP_SCRIPT_SRC
    script.async = true
    script.dataset.webforumTelegramLoader = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => resolve(), { once: true })
    document.head.appendChild(script)
  })
}

/**
 * Сначала ready()/expand() и тема — только потом читаем initData с объекта;
 * если пусто — та же строка может лежать в URL как tgWebAppData (Mini App).
 */
export function tryCaptureTelegramSession(): {
  webAppOk: boolean
  initDataRaw: string
} {
  const webApp = getTelegramWebApp()
  let initDataRaw = ''

  if (webApp) {
    try {
      initTelegramWebAppAppearance()
    } catch {
      // продолжаем: initData всё равно может быть уже в объекте
    }
    initDataRaw = webApp.initData?.trim() ?? ''
  }

  if (!initDataRaw) {
    initDataRaw = readTelegramInitDataFromLocation()
  }

  return {
    webAppOk: Boolean(webApp),
    initDataRaw,
  }
}

export async function waitForTelegramInitData(options: {
  maxAttempts: number
  delayMs: number
  cancelled: () => boolean
}): Promise<{ webAppOk: boolean; initDataRaw: string }> {
  let last: { webAppOk: boolean; initDataRaw: string } = {
    webAppOk: false,
    initDataRaw: '',
  }

  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    if (options.cancelled()) {
      return last
    }

    last = tryCaptureTelegramSession()

    if (last.initDataRaw) {
      return last
    }

    await sleep(options.delayMs)
  }

  return last
}

export function getTelegramWebApp() {
  if (typeof window === 'undefined') {
    return null
  }

  const self = window.Telegram?.WebApp ?? null
  if (self) {
    return self
  }

  try {
    if (window.parent !== window) {
      return window.parent.Telegram?.WebApp ?? null
    }
  } catch {
    // родитель с другого origin — недоступен
  }

  return null
}

export function hasTelegramWebApp() {
  return Boolean(getTelegramWebApp())
}

/**
 * Внешняя страница (например, сценарий GPT в канале/Telegram).
 * В Mini App безопаснее openLink родного WebApp, чем window.open.
 */
export function openTelegramExternalLink(url: string) {
  const trimmed = url.trim()
  if (!trimmed) {
    return
  }

  try {
    const webApp = getTelegramWebApp()
    const openLink = webApp?.openLink
    if (typeof openLink === 'function') {
      openLink(trimmed)
      return
    }
  } catch {
    // см. ниже fallback
  }

  try {
    window.open(trimmed, '_blank', 'noopener,noreferrer')
  } catch {
    window.location.href = trimmed
  }
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramInitDataRaw())
}

export function getTelegramInitDataRaw() {
  const webApp = getTelegramWebApp()
  const fromApp = webApp?.initData?.trim() ?? ''
  if (fromApp) {
    return fromApp
  }
  return readTelegramInitDataFromLocation()
}

/**
 * Светлая тема UI приложения: не зависит от тёмной/светлой темы Telegram.
 * Иначе в Mini App с тёмным клиентом фон и --tg-text-color ломают читаемость.
 */
const LIGHT_MINI_APP_THEME = {
  bg_color: '#ffffff',
  secondary_bg_color: '#f1f5f9',
  text_color: '#111827',
  hint_color: '#667085',
  button_color: '#1e88d3',
  button_text_color: '#ffffff',
  link_color: '#2563eb',
} as const

function markTelegramMiniAppDocument() {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.add('tg-mini-app')
}

export function initTelegramWebAppAppearance() {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    return false
  }

  markTelegramMiniAppDocument()
  webApp.ready()
  webApp.expand()

  try {
    webApp.disableVerticalSwipes?.()
  } catch {
    // Bot API 7.7+ — не во всех клиентах
  }

  try {
    webApp.requestFullscreen?.()
  } catch {
    // Старые клиенты / Telegram without Bot API 8+ fullscreen
  }

  const t = LIGHT_MINI_APP_THEME

  setCssVariable('--tg-bg-color', t.bg_color)
  setCssVariable('--tg-secondary-bg-color', t.secondary_bg_color)
  setCssVariable('--tg-text-color', t.text_color)
  setCssVariable('--tg-hint-color', t.hint_color)
  setCssVariable('--tg-button-color', t.button_color)
  setCssVariable('--tg-button-text-color', t.button_text_color)
  setCssVariable('--tg-link-color', t.link_color)

  try {
    webApp.setBackgroundColor?.(t.bg_color)
  } catch {
    // старые клиенты / ограничения WebView
  }
  try {
    webApp.setHeaderColor?.(t.bg_color)
  } catch {
    // idem
  }

  applyTelegramSafeAreaToCss()
  subscribeTelegramSafeAreaEvents()

  return true
}
