export interface Post {
  id: string
  title: string
  description: string
  imageUrl: string
  storagePath: string
  authorId: string
  authorEmail: string
  createdAt: number
  isVideo?: boolean
  commentCount?: number
  likedBy: string[]
  dislikedBy: string[]
}
