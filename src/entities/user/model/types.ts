/** Фрагмент OpenAPI UserResponse — для GET /users/me */
export type CurrentUserResponse = {
  id: string
  first_name: string
  last_name?: string | null
  username?: string | null
  avatar_path?: string | null
}
