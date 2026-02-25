'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react'

type CvUpload = {
  id: string
  filename: string
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed'
  errorMessage: string | null
  profileId: string | null
  createdAt: string
  parsedAt: string | null
}

type FileUploadState = {
  file: File
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export default function CvUploadPage() {
  const [uploads, setUploads] = useState<CvUpload[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileStates, setFileStates] = useState<FileUploadState[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cv/status')
      if (res.ok) {
        const data = await res.json()
        setUploads(data)
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  // Poll while any uploads are parsing
  useEffect(() => {
    const hasParsing = uploads.some((u) => u.status === 'parsing')

    if (hasParsing && !pollingRef.current) {
      pollingRef.current = setInterval(fetchUploads, 3000)
    } else if (!hasParsing && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
      setIsParsing(false)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [uploads, fetchUploads])

  function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const valid: File[] = []
    const errors: string[] = []

    for (const file of files) {
      const ext = file.name.toLowerCase().split('.').pop()
      if (ext !== 'pdf' && ext !== 'docx') {
        errors.push(`${file.name}: Not a PDF or DOCX file`)
      } else if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: Exceeds 10MB limit`)
      } else {
        valid.push(file)
      }
    }

    return { valid, errors }
  }

  async function handleFiles(files: File[]) {
    const { valid, errors } = validateFiles(files)

    const initialStates: FileUploadState[] = [
      ...errors.map(
        (err) =>
          ({
            file: new File([], err.split(':')[0]),
            status: 'error',
            error: err.split(':').slice(1).join(':').trim(),
          }) as FileUploadState
      ),
      ...valid.map(
        (file) => ({ file, status: 'uploading' }) as FileUploadState
      ),
    ]
    setFileStates(initialStates)

    if (valid.length === 0) return

    setIsUploading(true)

    for (const file of valid) {
      try {
        // Step 1: Get signed upload URL
        const signedRes = await fetch('/api/admin/cv/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        })
        if (!signedRes.ok) throw new Error('Failed to get upload URL')
        const { signedUrl, path } = await signedRes.json()

        // Step 2: Upload directly to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('Upload to storage failed')

        // Step 3: Create DB record
        await fetch('/api/admin/cv/upload', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, path }),
        })

        setFileStates((prev) =>
          prev.map((fs) =>
            fs.file.name === file.name && fs.status === 'uploading'
              ? { ...fs, status: 'done' }
              : fs
          )
        )
      } catch (err) {
        setFileStates((prev) =>
          prev.map((fs) =>
            fs.file.name === file.name && fs.status === 'uploading'
              ? {
                  ...fs,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : fs
          )
        )
      }
    }

    setIsUploading(false)
    await fetchUploads()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFiles(files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }

  async function handleParseAll() {
    const uploadedIds = uploads
      .filter((u) => u.status === 'uploaded')
      .map((u) => u.id)

    if (uploadedIds.length === 0) return

    setIsParsing(true)

    const BATCH_SIZE = 10
    for (let i = 0; i < uploadedIds.length; i += BATCH_SIZE) {
      const batch = uploadedIds.slice(i, i + BATCH_SIZE)
      await fetch('/api/admin/cv/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvUploadIds: batch }),
      })
    }

    await fetchUploads()
  }

  async function handleRetry(cvUploadId: string) {
    await fetch('/api/admin/cv/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvUploadId }),
    })

    setIsParsing(true)
    await fetchUploads()
  }

  async function handleDelete(cvUploadId: string) {
    if (!confirm('Delete this CV upload? This will remove the file and any linked profile.')) return

    setDeletingId(cvUploadId)
    try {
      const res = await fetch(`/api/admin/cv/${cvUploadId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
      await fetchUploads()
    } catch {
      alert('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const uploadedCount = uploads.filter((u) => u.status === 'uploaded').length
  const parsingCount = uploads.filter((u) => u.status === 'parsing').length
  const parsedCount = uploads.filter((u) => u.status === 'parsed').length
  const failedCount = uploads.filter((u) => u.status === 'failed').length
  const totalCount = uploads.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">CV Upload</h1>
        <p className="text-muted-foreground">
          Upload PDF or DOCX CVs, trigger parsing, and monitor progress
        </p>
      </div>

      {/* Upload Area */}
      <Card className="mb-6 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Upload CVs</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="mb-3 size-10 text-muted-foreground" />
            <p className="mb-1 text-sm font-medium">
              Drag and drop PDF or DOCX files here
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              PDF or DOCX, max 10MB per file
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Uploading...
                </>
              ) : (
                'Select files'
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Upload progress per file */}
          {fileStates.length > 0 && (
            <div className="mt-4 space-y-2">
              {fileStates.map((fs, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm"
                >
                  {fs.status === 'uploading' && (
                    <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" />
                  )}
                  {fs.status === 'done' && (
                    <CheckCircle className="size-4 shrink-0 text-green-500" />
                  )}
                  {fs.status === 'error' && (
                    <XCircle className="size-4 shrink-0 text-red-500" />
                  )}
                  <span className="truncate">{fs.file.name}</span>
                  {fs.error && (
                    <span className="text-xs text-red-500">{fs.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Actions */}
      <Card className="mb-6 rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-4 text-sm">
              <span>
                Total: <strong>{totalCount}</strong>
              </span>
              <span className="text-blue-600">
                Uploaded: <strong>{uploadedCount}</strong>
              </span>
              <span className="text-amber-600">
                Parsing: <strong>{parsingCount}</strong>
              </span>
              <span className="text-green-600">
                Parsed: <strong>{parsedCount}</strong>
              </span>
              {failedCount > 0 && (
                <span className="text-red-600">
                  Failed: <strong>{failedCount}</strong>
                </span>
              )}
            </div>

            {/* Progress bar when parsing */}
            {(isParsing || parsingCount > 0) && totalCount > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-xs text-muted-foreground">
                  Parsing: {parsedCount + failedCount}/{totalCount} complete
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{
                      width: `${((parsedCount + failedCount) / totalCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleParseAll}
            disabled={isParsing || uploadedCount === 0}
            className="rounded-lg transition-all"
          >
            {isParsing ? (
              <>
                <Loader2 className="animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <FileText />
                Parse All Uploaded ({uploadedCount})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Upload List */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>CV Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No CVs uploaded yet. Drop PDF or DOCX files above to get started.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Filename</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Uploaded</th>
                    <th className="pb-2 pr-4 font-medium">Parsed</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0 even:bg-muted/30 hover:bg-accent/40 transition-colors">
                      <td className="max-w-[200px] truncate py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          {u.filename}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          status={u.status}
                          errorMessage={u.errorMessage}
                        />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {u.parsedAt ? formatDate(u.parsedAt) : '--'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {u.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleRetry(u.id)}
                            >
                              <RotateCcw className="size-3" />
                              Retry
                            </Button>
                          )}
                          {u.status !== 'parsing' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              {deletingId === u.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3" />
                              )}
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({
  status,
  errorMessage,
}: {
  status: CvUpload['status']
  errorMessage: string | null
}) {
  const styles = {
    uploaded: 'bg-blue-50 text-blue-700 border border-blue-200',
    parsing: 'bg-amber-50 text-amber-700 border border-amber-200',
    parsed: 'bg-teal-50 text-teal-700 border border-teal-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
  }

  const icons = {
    uploaded: null,
    parsing: <Loader2 className="size-3 animate-spin" />,
    parsed: <CheckCircle className="size-3" />,
    failed: <XCircle className="size-3" />,
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {icons[status]}
        {status}
      </span>
      {status === 'failed' && errorMessage && (
        <span className="max-w-[200px] truncate text-xs text-red-500" title={errorMessage}>
          {errorMessage}
        </span>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
