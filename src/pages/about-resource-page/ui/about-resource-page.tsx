import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSections } from '../../../entities/section/api/section-api'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { SectionInfoContent } from './section-info-content'

const RESOURCE_CODES = ['about_resource', 'resource_about', 'about_project', 'project_about', 'about', 'resource']

function isResourceSection(code: string) {
  const normalized = code.toLowerCase().replace(/[-\s]+/g, '_')
  return RESOURCE_CODES.includes(normalized) || /about.*resource|resource.*about/.test(normalized)
}

export function AboutResourcePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, isTelegram } = useSession()
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const from = (location.state as { from?: unknown } | null)?.from
  const returnPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'

  useTelegramBackButton(isTelegram, () => navigate(returnPath))

  useEffect(() => {
    if (!token) return
    let active = true
    getSections(token)
      .then((sections) => {
        if (!active) return
        const section = sections.find((item) => isResourceSection(item.code))
        setSectionId(section?.id ?? null)
        if (!section) setError('Раздел «О ресурсе» пока не найден в API.')
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить раздел «О ресурсе».')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  return (
    <div className="page tab-guide-page section-info-page">
      <header className="desc-screen__header tab-guide-page__header">
        <button className="desc-screen__back" type="button" onClick={() => navigate(returnPath)}>
          <span className="desc-screen__back-chevron" aria-hidden>‹</span>
          Назад
        </button>
        <h1 className="desc-screen__title">О ресурсе</h1>
      </header>
      {loading ? <main className="section-info__content"><p>Загрузка…</p></main> : null}
      {error ? <p className="section-info__error" role="alert">{error}</p> : null}
      {!loading ? <SectionInfoContent key={sectionId ?? 'resource'} sectionId={sectionId} placeholder="О ресурсе" /> : null}
    </div>
  )
}
