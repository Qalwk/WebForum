function setCssVariable(name: string, value: string | undefined) {
  if (!value || typeof document === 'undefined') {
    return
  }

  document.documentElement.style.setProperty(name, value)
}

export function getTelegramWebApp() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.Telegram?.WebApp ?? null
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
