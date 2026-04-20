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

  interface TelegramBackButton {
    isVisible: boolean
    show: () => TelegramBackButton
    hide: () => TelegramBackButton
    onClick: (callback: () => void) => TelegramBackButton
    offClick: (callback: () => void) => TelegramBackButton
  }

  interface TelegramWebApp {
    initData: string
    initDataUnsafe?: {
      user?: TelegramWebAppUser
    }
    themeParams: TelegramThemeParams
    ready: () => void
    expand: () => void
    close: () => void
    BackButton: TelegramBackButton
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
