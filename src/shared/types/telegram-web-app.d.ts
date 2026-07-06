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

  interface TelegramWebAppInsets {
    top: number
    bottom: number
    left: number
    right: number
  }

  interface TelegramWebApp {
    initData: string
    initDataUnsafe?: {
      user?: TelegramWebAppUser
    }
    themeParams: TelegramThemeParams
    ready: () => void
    /** Раскрыть WebView по высоте (классика Mini App). */
    expand: () => void
    /** Bot API 7.7+: отключить сворачивание жестом вниз. */
    disableVerticalSwipes?: () => void
    /**
     * Bot API 8.0+: настоящий полноэкранный режим (см. {@link https://core.telegram.org/bots/webapps}).
     * Не во всех клиентах/версиях; вызывать с проверкой.
     */
    requestFullscreen?: () => void
    /** Уже в полноэкранном режиме (если поле приходит от клиента). */
    isFullscreen?: boolean
    /** Безопасные отступы устройства (вырез, домашняя кнопка). */
    safeAreaInset?: TelegramWebAppInsets
    /** Зона для контента — учитывает шапку/кнопки Telegram, не наезжать под них. */
    contentSafeAreaInset?: TelegramWebAppInsets
    onEvent?: (eventType: string, eventHandler: () => void) => void
    offEvent?: (eventType: string, eventHandler: () => void) => void
    close: () => void
    /** Синхронизирует фон контейнера Mini App (если доступно). */
    setBackgroundColor?: (color: string) => void
    /** Синхронизирует цвет шапки клиента (если доступно). */
    setHeaderColor?: (color: string) => void
    BackButton: TelegramBackButton
    /** Доступен в рантайме Telegram; используем для коротких подсказок. */
    showAlert?: (message: string) => void
    /**
     * Открыть ссылку во встроенном браузере клиента Telegram (Bot API 6.4+).
     */
    openLink?: (url: string, options?: { try_instant_view?: boolean }) => void
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
