import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { DEFAULT_API_TOKEN } from '../../../shared/config/env'
import {
  ensureTelegramScriptLoaded,
  isLikelyTelegramUserAgent,
  tryCaptureTelegramSession,
  waitForTelegramInitData,
} from '../../../shared/lib/telegram-web-app'
import { authByTelegram } from '../api/auth-api'

const SESSION_STORAGE_KEY = 'webforum_access_token'
const TELEGRAM_BOOT_DELAY_MS = 250
const TELEGRAM_BOOT_ATTEMPTS_BROWSER = 28
const TELEGRAM_BOOT_ATTEMPTS_TG_UA = 80

type AuthStatus =
  | 'checking_telegram'
  | 'idle'
  | 'authenticating'
  | 'ready'
  | 'error'

type SessionContextValue = {
  token: string
  authStatus: AuthStatus
  authError: string
  isTelegram: boolean
  setToken: (token: string) => void
  clearToken: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function getInitialToken() {
  if (typeof window === 'undefined') {
    return DEFAULT_API_TOKEN
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY) ?? DEFAULT_API_TOKEN
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setTokenState] = useState(getInitialToken)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    getInitialToken() ? 'ready' : 'checking_telegram',
  )
  const [authError, setAuthError] = useState('')
  const [isTelegram, setIsTelegram] = useState(false)
  const [telegramInitDataRaw, setTelegramInitDataRaw] = useState('')

  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    let cancelled = false

    function finishAsBrowserMode() {
      setIsTelegram(false)
      setTelegramInitDataRaw('')
      setAuthError('')
      setAuthStatus(tokenRef.current ? 'ready' : 'idle')
    }

    async function runTelegramBoot() {
      const activeToken = tokenRef.current

      if (activeToken) {
        setAuthStatus('ready')
        await ensureTelegramScriptLoaded()
        if (cancelled) {
          return
        }

        const snapshot = tryCaptureTelegramSession()
        if (snapshot.webAppOk) {
          setIsTelegram(true)
        }

        return
      }

      setAuthStatus('checking_telegram')
      setAuthError('')

      await ensureTelegramScriptLoaded()
      if (cancelled) {
        return
      }

      const maxAttempts = isLikelyTelegramUserAgent()
        ? TELEGRAM_BOOT_ATTEMPTS_TG_UA
        : TELEGRAM_BOOT_ATTEMPTS_BROWSER

      const result = await waitForTelegramInitData({
        maxAttempts,
        delayMs: TELEGRAM_BOOT_DELAY_MS,
        cancelled: () => cancelled,
      })

      if (cancelled) {
        return
      }

      if (result.webAppOk) {
        setIsTelegram(true)
      }

      if (result.initDataRaw) {
        setTelegramInitDataRaw(result.initDataRaw)
        return
      }

      if (result.webAppOk) {
        setAuthStatus('error')
        setAuthError(
          'Telegram Mini App найден, но initData не пришёл. Закройте мини-приложение и откройте снова кнопкой Web App у бота (не из превью ссылки).',
        )
        return
      }

      finishAsBrowserMode()
    }

    void runTelegramBoot()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let isMounted = true

    async function runTelegramAuth() {
      if (token || !telegramInitDataRaw) {
        return
      }

      setAuthStatus('authenticating')
      setAuthError('')

      try {
        const response = await authByTelegram(telegramInitDataRaw)

        if (!isMounted) {
          return
        }

        setTokenState(response.access_token)
        setAuthStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAuthStatus('error')
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Ошибка авторизации через Telegram Mini App.',
        )
      }
    }

    void runTelegramAuth()

    return () => {
      isMounted = false
    }
  }, [telegramInitDataRaw, token])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (token) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token)
      return
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [token])

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      authStatus,
      authError,
      isTelegram,
      setToken: (nextToken) => {
        setTokenState(nextToken.trim())
        setAuthStatus(nextToken.trim() ? 'ready' : 'idle')
        setAuthError('')
      },
      clearToken: () => {
        setTokenState('')
        setAuthStatus(isTelegram ? 'error' : 'idle')
        setAuthError('')
      },
    }),
    [authError, authStatus, isTelegram, token],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider')
  }

  return context
}
