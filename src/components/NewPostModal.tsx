import { useState, useRef, useEffect } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { storage, db } from '../firebase'
import { useAuth } from '../AuthContext'
import { useI18n } from '../i18n'

const COOLDOWN_MS = 1.5 * 60 * 1000

interface Props {
  onClose: () => void
  onPosted: () => void
}

const MAX_SIZE = 15 * 1024 * 1024

export default function NewPostModal({ onClose, onPosted }: Props) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const lastPost = snap.data()?.lastPostAt ?? 0
      const remaining = COOLDOWN_MS - (Date.now() - lastPost)
      if (remaining > 0) setCooldownLeft(Math.ceil(remaining / 1000))
    })
  }, [user])

  useEffect(() => {
    if (cooldownLeft <= 0) return
    const timer = setTimeout(() => setCooldownLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldownLeft])

  function processFile(f: File) {
    if (f.size > MAX_SIZE) {
      setError(t.new_post_err_size)
      return
    }
    const url = URL.createObjectURL(f)
    if (f.type.startsWith('video/')) {
      setError('')
      setFile(f)
      setPreview(url)
      setIsVideo(true)
      return
    }
    const img = new Image()
    img.onload = () => {
      if (img.width > 5000 || img.height > 5000) {
        setError(t.new_post_err_dimensions)
        URL.revokeObjectURL(url)
        return
      }
      setError('')
      setFile(f)
      setPreview(url)
      setIsVideo(false)
    }
    img.src = url
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !user) return
    if (cooldownLeft > 0) return
    setError('')
    setLoading(true)
    try {
      const storagePath = `posts/${user.uid}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, file)
      const imageUrl = await getDownloadURL(storageRef)
      await addDoc(collection(db, 'posts'), {
        title,
        description,
        imageUrl,
        storagePath,
        isVideo,
        commentCount: 0,
        likeCount: 0,
        authorId: user.uid,
        authorEmail: user.email ?? '',
        createdAt: Date.now(),
      })
      await updateDoc(doc(db, 'users', user.uid), { lastPostAt: Date.now() })
      onPosted()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.new_post_err_upload)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">{t.new_post_title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl cursor-pointer flex items-center justify-center h-48 overflow-hidden transition-colors ${dragging ? 'border-violet-400 bg-violet-950/30' : 'border-neutral-700 hover:border-violet-500'}`}
          >
            {preview ? (
              isVideo ? (
                <video src={preview} className="h-full w-full object-cover rounded-xl" muted />
              ) : (
                <img src={preview} alt="preview" className="h-full w-full object-cover rounded-xl" />
              )
            ) : (
              <span className="text-neutral-500 text-sm">{t.new_post_drop_hint}</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          <input
            type="text"
            placeholder={t.new_post_title_placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <textarea
            placeholder={t.new_post_desc_placeholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !file || !title || cooldownLeft > 0}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? t.new_post_uploading : cooldownLeft > 0 ? t.new_post_cooldown(cooldownLeft) : t.new_post_submit}
          </button>
        </form>
      </div>
    </div>
  )
}
