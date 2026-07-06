import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerByEmail } from '../../../entities/session/api/auth-api'
import { useSession } from '../../../entities/session/model/session-context'
import { AuthSigninPrompt, AuthScreenLayout } from './auth-screen-layout'
import { EmailField } from './email-field'
import { getAuthErrorMessage, isEmailLike } from '../../../entities/session/lib/parse-auth-error'
import { PasswordField } from './password-field'

const MIN_PASSWORD_LEN = 8

export function SignupPage() {
  const navigate = useNavigate()
  const { setToken } = useSession()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [error, setError] = useState('')
  const [showSigninHint, setShowSigninHint] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setShowSigninHint(false)

    const name = firstName.trim()
    const mail = email.trim()
    if (!name) {
      setError('Введите имя')
      return
    }
    if (!mail) {
      setError('Введите email')
      return
    }
    if (!isEmailLike(mail)) {
      setError('В email должна быть одна «@» и текст с обеих сторон')
      return
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Пароль не короче ${MIN_PASSWORD_LEN} символов`)
      return
    }
    if (password !== passwordRepeat) {
      setError('Пароли не совпадают')
      return
    }

    setBusy(true)
    try {
      const res = await registerByEmail({
        first_name: name,
        email: mail,
        password,
      })
      setToken(res.access_token)
      navigate('/', { replace: true })
    } catch (err) {
      const message = getAuthErrorMessage(err, 'register')
      setError(message)
      if (
        message.includes('уже зарегистрирован') ||
        message.includes('already registered')
      ) {
        setShowSigninHint(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreenLayout title="Регистрация" backTo="/signin">
      <AuthSigninPrompt />

      <form className="auth-form" noValidate onSubmit={(e) => void handleSubmit(e)}>
        <div className="auth-field">
          <label className="auth-field__label visually-hidden" htmlFor="signup-name">
            Имя
          </label>
          <input
            id="signup-name"
            className="auth-field__input"
            type="text"
            value={firstName}
            placeholder="Имя"
            autoComplete="given-name"
            maxLength={32}
            onChange={(e) => {
              setFirstName(e.target.value)
            }}
          />
        </div>

        <div className="auth-field">
          <label className="auth-field__label visually-hidden" htmlFor="signup-email">
            Email
          </label>
          <EmailField
            id="signup-email"
            value={email}
            onChange={setEmail}
          />
        </div>

        <PasswordField
          id="signup-password"
          label="Пароль"
          value={password}
          placeholder="Пароль"
          autoComplete="new-password"
          onChange={setPassword}
        />

        <PasswordField
          id="signup-password-repeat"
          label="Повтор пароля"
          value={passwordRepeat}
          placeholder="Повторите пароль"
          autoComplete="new-password"
          onChange={setPasswordRepeat}
        />

        {error ? (
          <div className="auth-form__error-block" role="alert">
            <p className="auth-form__error">{error}</p>
            {showSigninHint ? (
              <p className="auth-form__hint">
                Уже есть аккаунт?{' '}
                <Link className="auth-card__link" to="/signin">
                  Войти
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <button className="auth-form__submit" type="submit" disabled={busy}>
          {busy ? '…' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
        </button>
      </form>
    </AuthScreenLayout>
  )
}
