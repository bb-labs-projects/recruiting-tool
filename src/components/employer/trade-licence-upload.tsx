'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Check } from 'lucide-react'

interface TradeLicenceUploadProps {
  existingFilename?: string | null
}

export function TradeLicenceUpload({ existingFilename }: TradeLicenceUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<string | null>(existingFilename ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/employer/trade-licence/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setUploadedFile(file.name)
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Trade Licence <span className="text-muted-foreground">(optional)</span></Label>
      {uploadedFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 text-teal-600" />
          <FileText className="size-4" />
          <span>{uploadedFile}</span>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUpload}
          disabled={uploading}
        >
          <Upload className="size-4 mr-1" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        PDF, JPG, or PNG up to 10MB. This helps verify your company.
      </p>
    </div>
  )
}
