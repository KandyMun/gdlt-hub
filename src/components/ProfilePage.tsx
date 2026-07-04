import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { invalidateProfile } from '../userProfiles'
import { getRole } from '../roles'
import ProfilePosts from './ProfilePosts'
import Spinner from './Spinner'

interface Profile {
  uid: string
  username: string
  about?: string
  photoURL?: string
  createdAt?: number
  roles?: string[]
}

const MAX_ABOUT = 500
const MAX_SIZE = 15 * 1024 * 1024
const MAX_DIM = 5000

// Same limits as posts: 15MB and 5000x5000. GIFs pass through (image/*).
function validateImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.size > MAX_SIZE) return resolve('size')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img.width > MAX_DIM || img.height > MAX_DIM ? 'dimensions' : null)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve('dimensions')
    }
    img.src = url
  })
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const { t, locale } = useI18n()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [about, setAbout] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [picError, setPicError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      const q = query(collection(db, 'users'), where('username', '==', (username ?? '').toLowerCase()))
      const snap = await getDocs(q)
      if (!active) return
      const d = snap.docs[0]
      if (d) {
        const data = d.data()
        setProfile({ uid: d.id, ...data } as Profile)
        setAbout(data.about ?? '')
      } else {
        setProfile(null)
      }
      setLoading(false)
    })().catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [username])

  const isOwner = !!user && !!profile && user.uid === profile.uid

  async function handlePickPicture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setPicError('')
    const problem = await validateImage(file)
    if (problem) {
      setPicError(problem === 'size' ? t.new_post_err_size : t.new_post_err_dimensions)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const oldPhotoURL = profile.photoURL
      const path = `avatars/${profile.uid}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)
      await updateDoc(doc(db, 'users', profile.uid), { photoURL })
      setProfile((p) => (p ? { ...p, photoURL } : p))
      invalidateProfile(profile.username)
      // Remove the previous avatar now that the new one is saved.
      if (oldPhotoURL && oldPhotoURL.includes('/o/')) {
        try { await deleteObject(ref(storage, oldPhotoURL)) } catch { /* already gone / ignore */ }
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSaveAbout() {
    if (!profile) return
    setSaving(true)
    setSaved(false)
    try {
      await updateDoc(doc(db, 'users', profile.uid), { about: about.trim() })
      setProfile((p) => (p ? { ...p, about: about.trim() } : p))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!profile) return <div className="text-neutral-500 text-center py-20">{t.profile_not_found}</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-neutral-900 rounded-2xl p-6 flex flex-col items-center text-center">
        <div className="relative">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.username}
              className="w-28 h-28 rounded-full object-cover ring-2 ring-neutral-700"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-neutral-800 ring-2 ring-neutral-700 flex items-center justify-center text-4xl text-neutral-500 font-semibold">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-full shadow transition-colors"
              >
                {uploading ? t.profile_uploading : '✎'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePickPicture}
                className="hidden"
              />
            </>
          )}
        </div>

        <h1 className="text-white text-2xl font-semibold mt-4">{profile.username}</h1>
        {profile.roles && profile.roles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {profile.roles.map((id) => {
              const r = getRole(id)
              if (!r) return null
              return (
                <span key={id} className={`text-xs px-2.5 py-0.5 rounded-full border ${r.badge}`}>
                  {r.label[locale]}
                </span>
              )
            })}
          </div>
        )}
        {profile.createdAt && (
          <p className="text-neutral-500 text-sm mt-1">
            {t.profile_joined(new Date(profile.createdAt).toISOString().slice(0, 10))}
          </p>
        )}
        {isOwner && <p className="text-neutral-600 text-xs mt-1">{t.profile_your_profile}</p>}
        {picError && <p className="text-red-400 text-sm mt-2">{picError}</p>}
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 mt-4">
        <h2 className="text-neutral-300 font-medium mb-3">{t.profile_about_title}</h2>
        {isOwner ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
              placeholder={t.profile_about_placeholder}
              rows={5}
              className="w-full bg-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 text-xs">{about.length}/{MAX_ABOUT}</span>
              <div className="flex items-center gap-3">
                {saved && <span className="text-emerald-400 text-xs">{t.profile_saved}</span>}
                <button
                  onClick={handleSaveAbout}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {saving ? t.profile_saving : t.profile_save}
                </button>
              </div>
            </div>
          </div>
        ) : profile.about ? (
          <p className="text-neutral-300 text-sm whitespace-pre-wrap">{profile.about}</p>
        ) : (
          <p className="text-neutral-600 text-sm italic">{t.profile_no_about}</p>
        )}
      </div>

      <ProfilePosts uid={profile.uid} />
    </div>
  )
}
