import { useLocation, useNavigate } from 'react-router-dom'

function fallbackPath(pathname: string) {
  const descriptionEdit = pathname.match(/^(\/themes\/[^/]+)\/description\/edit$/)
  if (descriptionEdit) return `${descriptionEdit[1]}/description`
  if (pathname === '/themes/manage') return '/'
  const themeSubpage = pathname.match(/^(\/themes\/[^/]+)\/.+$/)
  if (themeSubpage) return themeSubpage[1]
  return '/'
}

export function BrowserBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackPath(location.pathname))
  }

  return (
    <button className="browser-back" type="button" onClick={goBack} aria-label="Назад" title="Назад">
      ‹
    </button>
  )
}
