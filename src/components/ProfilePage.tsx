import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'
import { invalidateProfile } from '../userProfiles'
import { useFileDrop } from '../useFileDrop'
import { getRole } from '../roles'
import type { CustomLink } from '../socials'
import ProfilePosts from './ProfilePosts'
import { SocialLinksRow, SocialLinksEditor } from './SocialLinks'
import AredlStats from './AredlStats'
import LtclStats from './LtclStats'
import GdStats from './GdStats'
import BadgePill from './BadgePill'
import { useBadges, type Badge } from '../badges'
import Spinner from './Spinner'

interface Profile {
  uid: string
  username: string
  displayName?: string
  about?: string
  photoURL?: string
  createdAt?: number
  roles?: string[]
  badges?: string[]
  socials?: Record<string, string>
  customLinks?: CustomLink[]
  gdUsername?: string
}

const MAX_ABOUT = 500
const MAX_NAME = 32
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
  const { badges: allBadges } = useBadges()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [about, setAbout] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
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
  // Owner-only editing controls are hidden while previewing as a visitor.
  const showOwnerControls = isOwner && !previewMode

  async function uploadPicture(file: File | undefined) {
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

  const { dragging: picDragging, dropProps: picDropProps } = useFileDrop(uploadPicture)

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

  // Save the chosen display name. Empty input resets it to the Discord username.
  async function handleSaveName() {
    if (!profile) return
    const next = name.trim().slice(0, MAX_NAME) || profile.username
    setSavingName(true)
    try {
      await updateDoc(doc(db, 'users', profile.uid), { displayName: next })
      setProfile((p) => (p ? { ...p, displayName: next } : p))
      invalidateProfile(profile.username)
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  function startEditName() {
    if (!profile) return
    setName(profile.displayName || profile.username)
    setEditingName(true)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!profile) return <div className="text-neutral-500 text-center py-20">{t.profile_not_found}</div>

  return (
    <div className="max-w-2xl mx-auto p-4">
      {isOwner && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-neutral-900 rounded-2xl px-4 py-2.5">
          <span className="text-neutral-400 text-sm">
            {previewMode ? t.profile_preview_banner : t.profile_preview_hint}
          </span>
          <button
            onClick={() => { setPreviewMode((v) => !v); setEditingName(false) }}
            className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shrink-0 ${
              previewMode
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            {previewMode ? t.profile_preview_exit : t.profile_preview}
          </button>
        </div>
      )}
      <div className="bg-neutral-900 rounded-2xl p-6 flex flex-col items-center text-center">
        <div className="relative" {...(showOwnerControls ? picDropProps : {})}>
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.username}
              className={`w-28 h-28 rounded-full object-cover ring-2 transition-colors ${showOwnerControls && picDragging ? 'ring-violet-400' : 'ring-neutral-700'}`}
            />
          ) : (
            <div className={`w-28 h-28 rounded-full bg-neutral-800 ring-2 transition-colors flex items-center justify-center text-4xl text-neutral-500 font-semibold ${showOwnerControls && picDragging ? 'ring-violet-400' : 'ring-neutral-700'}`}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
          {showOwnerControls && picDragging && (
            <div className="absolute inset-0 rounded-full bg-violet-950/50 border-2 border-dashed border-violet-400 flex items-center justify-center text-violet-200 text-xs pointer-events-none">
              {t.new_post_drop_hint}
            </div>
          )}
          {showOwnerControls && (
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
                onChange={(e) => { uploadPicture(e.target.files?.[0]) }}
                className="hidden"
              />
            </>
          )}
        </div>

        {editingName && showOwnerControls ? (
          <div className="flex flex-col items-center gap-2 mt-4 w-full max-w-xs">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              placeholder={profile.username}
              maxLength={MAX_NAME}
              autoFocus
              className="w-full text-center bg-neutral-800 text-white text-xl font-semibold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex items-center gap-3">
              <span className="text-neutral-600 text-xs">{name.trim().length}/{MAX_NAME}</span>
              <button
                onClick={() => setEditingName(false)}
                className="text-neutral-400 hover:text-neutral-200 text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {savingName ? t.profile_saving : t.profile_save}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4">
            <h1 className="text-white text-2xl font-semibold">{profile.displayName || profile.username}</h1>
            {/* Roles appear as small icons right by the name. */}
            {profile.roles?.map((id) => {
              const r = getRole(id)
              if (!r) return null
              return (
                <span key={id} title={r.label[locale]} aria-label={r.label[locale]} className="text-lg leading-none">
                  {r.icon}
                </span>
              )
            })}
            {showOwnerControls && (
              <button
                onClick={startEditName}
                title={t.profile_name_edit}
                aria-label={t.profile_name_edit}
                className="text-neutral-500 hover:text-violet-400 text-sm transition-colors"
              >
                ✎
              </button>
            )}
          </div>
        )}
        {(profile.displayName || profile.username) !== profile.username && (
          <p className="text-neutral-500 text-sm">@{profile.username}</p>
        )}
        {profile.badges && profile.badges.length > 0 && (() => {
          // Show plain badges and background-art badges on separate rows since
          // the two styles look different side by side.
          const owned = profile.badges
            .map((id) => allBadges.find((x) => x.id === id))
            .filter((b): b is Badge => !!b)
          const plainBadges = owned.filter((b) => !b.background)
          const bgBadges = owned.filter((b) => b.background)
          return (
            <div className="flex flex-col items-center gap-2 mt-2">
              {plainBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {plainBadges.map((b) => <BadgePill key={b.id} badge={b} />)}
                </div>
              )}
              {bgBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {bgBadges.map((b) => <BadgePill key={b.id} badge={b} />)}
                </div>
              )}
            </div>
          )
        })()}
        <SocialLinksRow socials={profile.socials} customLinks={profile.customLinks} />
        {profile.createdAt && (
          <p className="text-neutral-500 text-sm mt-3">
            {t.profile_joined(new Date(profile.createdAt).toISOString().slice(0, 10))}
          </p>
        )}
        {showOwnerControls && <p className="text-neutral-600 text-xs mt-1">{t.profile_your_profile}</p>}
        {picError && <p className="text-red-400 text-sm mt-2">{picError}</p>}
      </div>

      <div className="bg-neutral-900 rounded-2xl p-6 mt-4">
        <h2 className="text-neutral-300 font-medium mb-3">{t.profile_about_title}</h2>
        {showOwnerControls ? (
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

      <LtclStats username={profile.username} />

      <AredlStats username={profile.username} discordId={profile.uid} />

      <GdStats
        uid={profile.uid}
        discordUsername={profile.username}
        gdUsername={profile.gdUsername}
        isOwner={showOwnerControls}
        onSaved={(gdUsername) =>
          setProfile((p) => (p ? { ...p, gdUsername: gdUsername || undefined } : p))
        }
      />

      {showOwnerControls && (
        <div className="bg-neutral-900 rounded-2xl p-6 mt-4">
          <h2 className="text-neutral-300 font-medium mb-3">{t.profile_links_title}</h2>
          <SocialLinksEditor
            uid={profile.uid}
            username={profile.username}
            initialSocials={profile.socials}
            initialCustom={profile.customLinks}
            onSaved={(socials, customLinks) =>
              setProfile((p) => (p ? { ...p, socials, customLinks } : p))
            }
          />
        </div>
      )}

      <ProfilePosts uid={profile.uid} />
    </div>
  )
}
