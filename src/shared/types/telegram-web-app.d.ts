export {}

declare global {
  interface TelegramWebAppUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
  }

  interface TelegramThemeParams {
    bg_color?: string
    secondary_bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
    link_color?: string
  }

  interface TelegramWebApp {
    initData: string
    initDataUnsafe?: {
      user?: TelegramWebAppUser
    }
    themeParams: TelegramThemeParams
    ready: () => void
    expand: () => void
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
