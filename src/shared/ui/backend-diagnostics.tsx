import { useCallback, useEffect, useState } from 'react'
import {
  runBackendDiagnostics,
  type BackendCheckResult,
} from '../api/backend-diagnostics'
import { API_BASE_URL, API_ROOT_ORIGIN } from '../config/env'

type LoadState = 'idle' | 'running' | 'done' | 'error'

export function BackendDiagnostics() {
  const [state, setState] = useState<LoadState>('idle')
  const [results, setResults] = useState<BackendCheckResult[]>([])
  const [open, setOpen] = useState(false)

  const run = useCallback(async () => {
    setState('running')
    try {
      const next = await runBackendDiagnostics()
      setResults(next)
      setState('done')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  const summaryOk = results.length > 0 && results.every((r) => r.ok)
  const hostLine = `${API_ROOT_ORIGIN} → API ${API_BASE_URL}`

  return (
    <section className="backend-diagnostics">
      <button
        className="backend-diagnostics__toggle"
        type="button"
        onClick={() => {
          setOpen((value) => !value)
        }}
        aria-expanded={open}
      >
        <span className="backend-diagnostics__toggle-label">
          Проверка бэкенда
        </span>
        {state === 'running' ? (
          <span className="backend-diagnostics__badge backend-diagnostics__badge--pending">
            …
          </span>
        ) : results.length > 0 ? (
          <span
            className={
              summaryOk
                ? 'backend-diagnostics__badge backend-diagnostics__badge--ok'
                : 'backend-diagnostics__badge backend-diagnostics__badge--warn'
            }
          >
            {summaryOk ? 'OK' : 'есть сбои'}
          </span>
        ) : state === 'error' ? (
          <span className="backend-diagnostics__badge backend-diagnostics__badge--warn">
            ошибка
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="backend-diagnostics__panel">
          <p className="backend-diagnostics__host">{hostLine}</p>
          <button
            className="button button--secondary backend-diagnostics__retry"
            type="button"
            disabled={state === 'running'}
            onClick={() => {
              void run()
            }}
          >
            Повторить запросы
          </button>
          <ul className="backend-diagnostics__list">
            {results.map((row) => (
              <li
                key={row.label}
                className={
                  row.ok
                    ? 'backend-diagnostics__item backend-diagnostics__item--ok'
                    : 'backend-diagnostics__item backend-diagnostics__item--fail'
                }
              >
                <span className="backend-diagnostics__item-label">
                  {row.label}
                  {row.status !== undefined ? ` [${row.status}]` : ''}
                </span>
                <span className="backend-diagnostics__item-detail">
                  {row.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="backend-diagnostics__hint">
            Если все три запроса падают по сети/CORS — проблема не в токене
            Telegram, а в доступности API или заголовках CORS на сервере.
          </p>
        </div>
      ) : null}
    </section>
  )
}
