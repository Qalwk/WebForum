export type AuthTokensResponse = {
  access_token: string
  refresh_token: string | null
}

export type LoginByEmailRequest = {
  email: string
  password: string
}

export type RegisterByEmailRequest = {
  first_name: string
  email: string
  password: string
}
