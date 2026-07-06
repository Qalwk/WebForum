import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type AuthScreenLayoutProps = {
  title: string
  children: ReactNode
  footer?: ReactNode
  backTo?: string
  onBack?: () => void
}

export function AuthScreenLayout({
  title,
  children,
  footer,
  backTo,
  onBack,
}: AuthScreenLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="page page--auth">
      <div className="auth-card">
        <button
          type="button"
          className="auth-card__back"
          onClick={() => {
            if (onBack) {
              onBack()
              return
            }
            if (backTo) {
              navigate(backTo)
              return
            }
            if (window.history.length > 1) {
              navigate(-1)
            }
          }}
        >
          <span className="auth-card__back-chevron" aria-hidden>
            ‹
          </span>
          Назад
        </button>

        <h1 className="auth-card__title">{title}</h1>

        {children}

        {footer ? <div className="auth-card__footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export function AuthRegisterPrompt() {
  return (
    <p className="auth-card__prompt">
      Новый пользователь?{' '}
      <Link className="auth-card__link" to="/signup">
        Зарегистрироваться
      </Link>
    </p>
  )
}

export function AuthSigninPrompt() {
  return (
    <p className="auth-card__prompt">
      Уже есть аккаунт?{' '}
      <Link className="auth-card__link" to="/signin">
        Войти
      </Link>
    </p>
  )
}
