import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { DEFAULT_API_TOKEN } from '../../../shared/config/env'
import { initTelegramWebAppAppearance, isTelegramMiniApp, getTelegramInitDataRaw } from '../../../shared/lib/telegram-web-app'
import { authByTelegram } from '../api/auth-api'

const SESSION_STORAGE_KEY = 'webforum_access_token'

type AuthStatus = 'idle' | 'authenticating' | 'ready' | 'error'

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
    getInitialToken() ? 'ready' : 'idle',
  )
  const [authError, setAuthError] = useState('')
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    const isTelegramApp = initTelegramWebAppAppearance()
    setIsTelegram(isTelegramApp)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function runTelegramAuth() {
      if (token || !isTelegramMiniApp()) {
        return
      }

      const initDataRaw = getTelegramInitDataRaw()

      if (!initDataRaw) {
        return
      }

      setAuthStatus('authenticating')
      setAuthError('')

      try {
        const response = await authByTelegram(initDataRaw)

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
  }, [token])

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
        setAuthStatus('idle')
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
