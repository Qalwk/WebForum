import { Link, useLocation } from 'react-router-dom'

type TabAboutLinkProps = {
  themeId: string
  sectionCode: string
  className?: string
}

export function TabAboutLink({ themeId, sectionCode, className = '' }: TabAboutLinkProps) {
  const location = useLocation()
  return (
    <Link
      className={className || 'desc-screen__tab-link'}
      to={`/themes/${themeId}/about/${sectionCode}`}
      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
    >
      Подробнее об этой вкладке
    </Link>
  )
}
