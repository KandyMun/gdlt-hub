import { useState, useRef } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc } from 'firebase/firestore'
import { storage, db } from '../firebase'
import { useAuth } from '../AuthContext'

interface Props {
  onClose: () => void
  onPosted: () => void
}

export default function NewPostModal({ onClose, onPosted }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (f.size > 10 * 1024 * 1024) {
      setError('Image must be 10MB or smaller.')
      e.target.value = ''
      return
    }

    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      if (img.width > 5000 || img.height > 5000) {
        setError('Image must be 5000×5000 pixels or smaller.')
        URL.revokeObjectURL(url)
        e.target.value = ''
        return
      }
      setError('')
      setFile(f)
      setPreview(url)
    }
    img.src = url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !user) return
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
        authorId: user.uid,
        authorEmail: user.email,
        createdAt: Date.now(),
      })
      onPosted()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">New post</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-neutral-700 hover:border-violet-500 rounded-xl cursor-pointer flex items-center justify-center h-48 overflow-hidden transition-colors"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <span className="text-neutral-500 text-sm">Click to choose an image</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-neutral-500 resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !file || !title}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? 'Uploading…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  )
}
