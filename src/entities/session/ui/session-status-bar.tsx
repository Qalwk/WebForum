import { useEffect, useState } from 'react'
import { useSession } from '../model/session-context'

export function SessionStatusBar() {
  const { token, authStatus, authError, isTelegram, setToken, clearToken } =
    useSession()
  const [draftToken, setDraftToken] = useState(token)

  const isConfigured = Boolean(token)

  useEffect(() => {
    setDraftToken(token)
  }, [token])

  if (isTelegram && authStatus === 'ready') {
    return null
  }

  return (
    <section className="session-bar">
      <div>
        <p className="session-bar__title">
          {isTelegram ? 'Telegram Mini App' : 'Dev session'}
        </p>
        <p className="session-bar__text">
          {isTelegram
            ? authStatus === 'authenticating'
              ? 'Пробую авторизоваться через initDataRaw от Telegram.'
              : authError || 'Mini App запущен внутри Telegram.'
            : isConfigured
              ? 'Bearer токен взят из env или сохранен вручную и будет добавляться к API-запросам.'
              : 'Укажи access token вручную или добавь VITE_API_BEARER_TOKEN в .env.local.'}
        </p>
      </div>

      <div className="session-bar__controls">
        <input
          className="input"
          type="password"
          value={draftToken}
          onChange={(event) => setDraftToken(event.target.value)}
          placeholder="Bearer access token"
          aria-label="Access token"
        />
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setToken(draftToken)}
        >
          Сохранить
        </button>
        {isConfigured ? (
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              setDraftToken('')
              clearToken()
            }}
          >
            Очистить
          </button>
        ) : null}
      </div>
    </section>
  )
}
