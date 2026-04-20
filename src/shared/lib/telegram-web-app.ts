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

/** User-Agent в клиенте Telegram обычно содержит «Telegram». */
export function isLikelyTelegramUserAgent() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /Telegram/i.test(navigator.userAgent)
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
 * Сначала ready()/expand() и тема — только потом читаем initData
 * (до ready() в части клиентов initData пустой).
 */
export function tryCaptureTelegramSession(): {
  webAppOk: boolean
  initDataRaw: string
} {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    return { webAppOk: false, initDataRaw: '' }
  }

  try {
    initTelegramWebAppAppearance()
  } catch {
    // продолжаем: initData всё равно может быть уже в объекте
  }

  return { webAppOk: true, initDataRaw: webApp.initData ?? '' }
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

  return window.Telegram?.WebApp ?? null
}

export function hasTelegramWebApp() {
  return Boolean(getTelegramWebApp())
}

export function isTelegramMiniApp() {
  const webApp = getTelegramWebApp()
  return Boolean(webApp?.initData)
}

export function getTelegramInitDataRaw() {
  return getTelegramWebApp()?.initData ?? ''
}

export function initTelegramWebAppAppearance() {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    return false
  }

  webApp.ready()
  webApp.expand()

  const themeParams = webApp.themeParams

  setCssVariable('--tg-bg-color', themeParams.bg_color)
  setCssVariable('--tg-secondary-bg-color', themeParams.secondary_bg_color)
  setCssVariable('--tg-text-color', themeParams.text_color)
  setCssVariable('--tg-hint-color', themeParams.hint_color)
  setCssVariable('--tg-button-color', themeParams.button_color)
  setCssVariable('--tg-button-text-color', themeParams.button_text_color)
  setCssVariable('--tg-link-color', themeParams.link_color)

  return true
}
