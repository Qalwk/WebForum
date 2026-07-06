type EmailFieldProps = {
  id: string
  value: string
  placeholder?: string
  autoComplete?: string
  onChange: (value: string) => void
}

/**
 * Почта как обычный text — без type="email" и inputMode="email".
 * Иначе Safari/Chrome режут «нестандартные» адреса (например user-@mail.com)
 * и мешают вставке.
 */
export function EmailField({
  id,
  value,
  placeholder = 'Email',
  autoComplete = 'email',
  onChange,
}: EmailFieldProps) {
  return (
    <input
      id={id}
      name={id}
      className="auth-field__input auth-field__input--email"
      type="text"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      autoComplete={autoComplete}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value)
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain')
        if (text) {
          onChange(text)
        }
      }}
    />
  )
}

