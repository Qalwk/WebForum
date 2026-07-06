import { HttpError } from '../../../shared/api/http-client'

type AuthContext = 'login' | 'register'

function pickString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return null
}

function parsePydanticDetail(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail
  }

  if (!Array.isArray(detail) || detail.length === 0) {
    return null
  }

  const parts: string[] = []
  for (const item of detail) {
    if (typeof item !== 'object' || !item || !('msg' in item)) {
      continue
    }
    const msg = String((item as { msg: unknown }).msg)
    const loc = 'loc' in item ? (item as { loc: unknown }).loc : null
    const field =
      Array.isArray(loc) && loc.length > 0 ? String(loc[loc.length - 1]) : null

    if (field === 'email' && /valid email/i.test(msg)) {
      parts.push('Проверьте email: нужна «@» и домен (например name@mail.ru).')
      continue
    }
    if (field === 'password' && /at least/i.test(msg)) {
      parts.push('Пароль не короче 8 символов.')
      continue
    }
    if (field === 'first_name') {
      parts.push('Укажите имя (от 1 до 32 символов).')
      continue
    }
    parts.push(msg)
  }

  return parts.length > 0 ? parts.join(' ') : null
}

function parseApplicationError(payload: Record<string, unknown>, context: AuthContext): string | null {
  if (payload.error === 'email_already_exists') {
    return 'Этот email уже зарегистрирован. Войдите или укажите другой email.'
  }

  if (payload.error === 'auth_failed') {
    return context === 'login'
      ? 'Неверный email или пароль. Проверьте данные или зарегистрируйтесь, если аккаунта ещё нет.'
      : 'Не удалось зарегистрироваться. Возможно, этот email уже занят.'
  }

  const message = pickString(payload.message)
  if (message) {
    if (/invalid email or password/i.test(message)) {
      return 'Неверный email или пароль. Проверьте данные или зарегистрируйтесь, если аккаунта ещё нет.'
    }
    if (/already registered|already exists/i.test(message)) {
      return 'Этот email уже зарегистрирован. Попробуйте войти или укажите другой email.'
    }
  }

  const details = payload.details
  if (typeof details === 'object' && details && 'reason' in details) {
    const reason = pickString((details as { reason: unknown }).reason)
    if (reason && /invalid email or password/i.test(reason)) {
      return 'Неверный email или пароль. Проверьте данные или зарегистрируйтесь, если аккаунта ещё нет.'
    }
  }

  return null
}

export function parseAuthErrorPayload(
  payload: unknown,
  status: number,
  context: AuthContext,
): string {
  if (typeof payload === 'object' && payload) {
    const record = payload as Record<string, unknown>

    const appMsg = parseApplicationError(record, context)
    if (appMsg) {
      return appMsg
    }

    const pydantic = parsePydanticDetail(record.detail)
    if (pydantic) {
      return pydantic
    }
  }

  if (status === 409) {
    return 'Этот email уже зарегистрирован. Войдите или укажите другой email.'
  }

  if (status === 422) {
    return context === 'login'
      ? 'Проверьте формат email и заполните пароль.'
      : 'Проверьте имя, email и пароль (не короче 8 символов).'
  }

  if (status === 400) {
    return context === 'login'
      ? 'Неверный email или пароль.'
      : 'Не удалось зарегистрироваться. Проверьте данные.'
  }

  if (status >= 500) {
    return 'Сервер временно недоступен. Попробуйте через минуту.'
  }

  return context === 'login'
    ? 'Не удалось войти. Проверьте интернет и попробуйте снова.'
    : 'Не удалось зарегистрироваться. Попробуйте позже.'
}

export function getAuthErrorMessage(error: unknown, context: AuthContext): string {
  if (error instanceof HttpError) {
    return parseAuthErrorPayload(error.details, error.status, context)
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return parseAuthErrorPayload(null, 0, context)
}

/** Сообщения до запроса на сервер (форма входа). */
export function validateLoginForm(email: string, password: string): string | null {
  const mail = email.trim()
  if (!mail) {
    return 'Введите email'
  }
  if (!password) {
    return 'Введите пароль'
  }
  if (!isEmailLike(mail)) {
    return 'В email должна быть «@» и текст с обеих сторон (например user@mail.ru).'
  }
  return null
}

export function isEmailLike(value: string) {
  const v = value.trim()
  const at = v.indexOf('@')
  return at > 0 && at < v.length - 1
}
