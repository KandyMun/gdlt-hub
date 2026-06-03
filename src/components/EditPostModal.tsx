import { useState } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'
import { type Post } from '../types'

interface Props {
  post: Post
  onClose: () => void
}

export default function EditPostModal({ post, onClose }: Props) {
  const [title, setTitle] = useState(post.title)
  const [description, setDescription] = useState(post.description)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await updateDoc(doc(db, 'posts', post.id), { title, description })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await deleteDoc(doc(db, 'posts', post.id))
      await deleteObject(ref(storage, post.storagePath))
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Edit post</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <img src={post.imageUrl} alt={post.title} className="w-full max-h-48 object-cover rounded-xl" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-neutral-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !title}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Delete post
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-neutral-400 text-sm flex-1">Are you sure?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-neutral-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
