import { useState } from 'react'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  autoComplete?: string
}

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  onChange,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-field">
      <label className="auth-field__label visually-hidden" htmlFor={id}>
        {label}
      </label>
      <div className="auth-field__row">
        <input
          id={id}
          className="auth-field__input"
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => {
            onChange(e.target.value)
          }}
        />
        <button
          type="button"
          className="auth-field__toggle"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          onClick={() => {
            setVisible((v) => !v)
          }}
        >
          <span aria-hidden>{visible ? '🙈' : '👁'}</span>
        </button>
      </div>
    </div>
  )
}
