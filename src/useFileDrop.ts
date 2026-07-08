import { useState } from 'react'

// Shared drag-and-drop helper for file uploads. Returns a `dragging` flag (for
// highlighting the drop target) and `dropProps` to spread onto any element you
// want to accept a dropped file. Only the first dropped file is used.
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false)
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true) },
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setDragging(true) },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setDragging(false) },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files?.[0]
      if (f) onFile(f)
    },
  }
  return { dragging, dropProps }
}
