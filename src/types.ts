export interface Post {
  id: string
  title: string
  description: string
  imageUrl: string
  storagePath: string
  authorId: string
  authorEmail?: string
  authorUsername?: string
  createdAt: number
  isVideo?: boolean
  likeCount?: number
  commentCount?: number
  likedBy: string[]
  dislikedBy: string[]
  pinned?: boolean
}
