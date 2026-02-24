'use client'

import { useEffect, useState } from 'react'

/**
 * PDF viewer that uses signed URLs for private Supabase Storage buckets.
 * Fetches a signed URL from the admin API, then renders the PDF in an iframe.
 */
export function PdfViewer({
  storagePath,
  publicUrl,
}: {
  storagePath?: string | null
  publicUrl?: string | null
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!storagePath && !publicUrl) return

    const params = new URLSearchParams()
    if (storagePath) params.set('path', storagePath)
    else if (publicUrl) params.set('url', publicUrl)

    fetch(`/api/admin/cv/signed-url?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.signedUrl) {
          setSrc(data.signedUrl)
        } else {
          setError(data.error || 'Failed to load PDF')
        }
      })
      .catch(() => setError('Failed to load PDF'))
  }, [storagePath, publicUrl])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-8">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Could not load PDF</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading PDF...</p>
      </div>
    )
  }

  return (
    <iframe
      src={src}
      className="h-full w-full border-0"
      title="Original CV"
    />
  )
}
