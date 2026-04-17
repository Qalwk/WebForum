export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const DEFAULT_API_TOKEN =
  import.meta.env.VITE_API_BEARER_TOKEN ?? import.meta.env.VITE_API_TOKEN ?? ''
