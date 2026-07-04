import { createContext, useContext, useEffect, useState } from 'react'
import { type User, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

interface UserProfile {
  username: string
  photoURL?: string
  roles?: string[]
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists() && snap.data().banned) {
          await signOut(auth)
          setUser(null)
          setProfile(null)
        } else {
          setUser(u)
          setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
