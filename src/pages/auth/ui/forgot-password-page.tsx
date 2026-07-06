import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthScreenLayout } from './auth-screen-layout'
import { EmailField } from './email-field'

/** UI по макету; эндпоинт сброса пароля подключим, когда появится в OpenAPI. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const mail = email.trim()
    if (!mail) {
      setMessage('Введите email')
      return
    }
    setMessage(
      'Запрос на сброс пароля пока не подключён к API. Обратитесь к администратору или используйте «Сбросить пароль» после выката бэкенда.',
    )
  }

  return (
    <AuthScreenLayout
      title="Забыли пароль?"
      backTo="/signin"
      footer={
        <Link className="auth-card__link" to="/signin">
          Вернуться ко входу
        </Link>
      }
    >
      <p className="auth-card__prompt">
        Укажите email — мы отправим ссылку для восстановления, когда сервис будет
        доступен.
      </p>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-field">
          <EmailField id="forgot-email" value={email} onChange={setEmail} />
        </div>

        {message ? (
          <p className="auth-form__error" role="status">
            {message}
          </p>
        ) : null}

        <button className="auth-form__submit" type="submit">
          ОТПРАВИТЬ
        </button>
      </form>
    </AuthScreenLayout>
  )
}
