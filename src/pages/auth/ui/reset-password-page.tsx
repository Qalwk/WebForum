import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthScreenLayout } from './auth-screen-layout'
import { PasswordField } from './password-field'

/** UI по макету; подтверждение кода — после появления API. */
export function ResetPasswordPage() {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!code.trim() || password.length < 6) {
      setMessage('Введите код и новый пароль (не короче 6 символов)')
      return
    }
    setMessage(
      'Сброс пароля на сервере ещё не подключён. Используйте вход через Telegram или дождитесь обновления API.',
    )
  }

  return (
    <AuthScreenLayout
      title="Сбросить пароль"
      backTo="/signin"
      footer={
        <Link className="auth-card__link" to="/signin">
          Вернуться ко входу
        </Link>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <input
            id="reset-code"
            className="auth-field__input"
            type="text"
            value={code}
            placeholder="Код из письма"
            onChange={(e) => {
              setCode(e.target.value)
            }}
          />
        </div>

        <PasswordField
          id="reset-password"
          label="Новый пароль"
          value={password}
          placeholder="Новый пароль"
          autoComplete="new-password"
          onChange={setPassword}
        />

        {message ? (
          <p className="auth-form__error" role="status">
            {message}
          </p>
        ) : null}

        <button className="auth-form__submit" type="submit">
          СОХРАНИТЬ ПАРОЛЬ
        </button>
      </form>
    </AuthScreenLayout>
  )
}
