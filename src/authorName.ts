// Resolve a display username for a post/comment author.
// Prefers the stored authorUsername (Discord); falls back to the legacy
// authorEmail-derived name for records created before the Discord migration.
export function authorName(a: { authorUsername?: string; authorEmail?: string }): string {
  return a.authorUsername || a.authorEmail?.replace('@freepost.local', '') || ''
}
