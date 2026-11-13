import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getThemeSections } from '../../../entities/theme/api/theme-api'
import { useSession } from '../../../entities/session/model/session-context'
import { useTelegramBackButton } from '../../../shared/hooks/use-telegram-back-button'
import { SectionInfoContent } from '../../about-resource-page/ui/section-info-content'

export function TabGuidePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { themeId, sectionCode } = useParams()
  const { isTelegram, token } = useSession()
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const from = (location.state as { from?: unknown } | null)?.from
  const returnPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : themeId ? `/themes/${themeId}` : '/'

  useTelegramBackButton(isTelegram, () => navigate(returnPath))

  useEffect(() => {
    if (!themeId || !sectionCode || !token) return
    let active = true
    const code = sectionCode === 'ikr' ? 'perfect_result' : sectionCode
    getThemeSections(themeId, token)
      .then((sections) => {
        if (!active) return
        const section = sections.find((item) => item.section_code === code)
        setSectionId(section?.section_id ?? null)
        if (!section) setError('Секция для этой страницы не найдена на сервере.')
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить секцию.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [themeId, sectionCode, token])

  return (
    <div className="page tab-guide-page">
      <header className="desc-screen__header tab-guide-page__header">
        <button className="desc-screen__back" type="button" onClick={() => navigate(returnPath)}>
          <span className="desc-screen__back-chevron" aria-hidden>‹</span>
          Назад
        </button>
        <h1 className="desc-screen__title">О ресурсе</h1>
      </header>
      {loading ? <main className="section-info__content"><p>Загрузка…</p></main> : null}
      {error ? <p className="section-info__error" role="alert">{error}</p> : null}
      {!loading ? <SectionInfoContent key={sectionId ?? sectionCode} sectionId={sectionId} placeholder="Об этой вкладке" /> : null}
    </div>
  )
}
