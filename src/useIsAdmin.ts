import { useAuth } from './AuthContext'

export function useIsAdmin() {
  const { user } = useAuth()
  return user?.uid === import.meta.env.VITE_ADMIN_UID
}
