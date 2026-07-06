import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginByEmail } from '../../../entities/session/api/auth-api'
import {
  getAuthErrorMessage,
  validateLoginForm,
} from '../../../entities/session/lib/parse-auth-error'
import { useSession } from '../../../entities/session/model/session-context'
import {
  AuthRegisterPrompt,
  AuthScreenLayout,
} from './auth-screen-layout'
import { EmailField } from './email-field'
import { PasswordField } from './password-field'

export function SigninPage() {
  const navigate = useNavigate()
  const { setToken, isTelegram } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showRegisterHint, setShowRegisterHint] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setShowRegisterHint(false)

    const validationError = validateLoginForm(email, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    try {
      const res = await loginByEmail({
        email: email.trim(),
        password,
      })
      setToken(res.access_token)
      navigate('/', { replace: true })
    } catch (err) {
      const message = getAuthErrorMessage(err, 'login')
      setError(message)
      if (
        message.includes('Неверный email или пароль') ||
        message.includes('зарегистрируйтесь')
      ) {
        setShowRegisterHint(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreenLayout
      title="Вход"
      backTo={isTelegram ? '/' : undefined}
      footer={
        <div className="auth-card__links">
          <Link className="auth-card__link" to="/auth/forgot-password">
            Забыли пароль?
          </Link>
          {isTelegram ? (
            <Link className="auth-card__link" to="/">
              Вернуться в Mini App
            </Link>
          ) : (
            <p className="auth-card__hint">
              <a
                className="auth-card__link"
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Войти через телеграм
              </a>
            </p>
          )}
          <Link className="auth-card__link" to="/auth/reset-password">
            Сбросить пароль
          </Link>
        </div>
      }
    >
      <AuthRegisterPrompt />

      <form className="auth-form" noValidate onSubmit={(e) => void handleSubmit(e)}>
        <div className="auth-field">
          <label className="auth-field__label visually-hidden" htmlFor="signin-email">
            Email
          </label>
          <EmailField
            id="signin-email"
            value={email}
            onChange={(value) => {
              setEmail(value)
              if (error) {
                setError('')
                setShowRegisterHint(false)
              }
            }}
          />
        </div>

        <PasswordField
          id="signin-password"
          label="Пароль"
          value={password}
          placeholder="Пароль"
          autoComplete="current-password"
          onChange={(value) => {
            setPassword(value)
            if (error) {
              setError('')
              setShowRegisterHint(false)
            }
          }}
        />

        {error ? (
          <div className="auth-form__error-block" role="alert">
            <p className="auth-form__error">{error}</p>
            {showRegisterHint ? (
              <p className="auth-form__hint">
                Нет аккаунта?{' '}
                <Link className="auth-card__link" to="/signup">
                  Зарегистрироваться
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <button className="auth-form__submit" type="submit" disabled={busy}>
          {busy ? '…' : 'ВХОД'}
        </button>
      </form>
    </AuthScreenLayout>
  )
}
