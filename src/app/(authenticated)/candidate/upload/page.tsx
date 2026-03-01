'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

type CvUpload = {
  id: string
  filename: string
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed'
  errorMessage: string | null
  profileId: string | null
  createdAt: string
  parsedAt: string | null
}

type PageView = 'loading' | 'dropzone' | 'existing' | 'uploading' | 'parsing' | 'complete'

function statusDot(status: CvUpload['status']) {
  switch (status) {
    case 'uploaded':
      return 'bg-[oklch(0.70_0.12_75)]'
    case 'parsing':
      return 'bg-[oklch(0.70_0.12_75)]'
    case 'parsed':
      return 'bg-[oklch(0.55_0.14_155)]'
    case 'failed':
      return 'bg-[oklch(0.55_0.16_20)]'
  }
}

function statusText(status: CvUpload['status']) {
  switch (status) {
    case 'uploaded':
      return 'Uploaded'
    case 'parsing':
      return 'Parsing...'
    case 'parsed':
      return 'Parsed'
    case 'failed':
      return 'Failed'
  }
}

export default function CandidateUploadPage() {
  const router = useRouter()
  const [view, setView] = useState<PageView>('loading')
  const [currentUpload, setCurrentUpload] = useState<CvUpload | null>(null)
  const [allUploads, setAllUploads] = useState<CvUpload[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CvUpload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshUploads = useCallback(async (): Promise<CvUpload[]> => {
    const res = await fetch('/api/candidate/cv/status')
    if (!res.ok) return []
    const uploads: CvUpload[] = await res.json()
    setAllUploads(uploads)
    return uploads
  }, [])

  const pollForCompletion = useCallback(
    (cvUploadId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const uploads = await refreshUploads()
          const target = uploads.find((u) => u.id === cvUploadId)
          if (!target) return

          if (target.status === 'parsed') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setCurrentUpload(target)
            setView('complete')
          } else if (target.status === 'failed') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setCurrentUpload(target)
            setErrorMessage(target.errorMessage || 'CV parsing failed')
            setView('existing')
          }
        } catch {
          // Continue polling
        }
      }, 3000)
    },
    [refreshUploads]
  )

  // Fetch existing upload state on mount
  useEffect(() => {
    async function checkExisting() {
      try {
        const uploads = await refreshUploads()
        if (uploads.length === 0) {
          setView('dropzone')
          return
        }

        const latest = uploads[0]
        setCurrentUpload(latest)

        if (latest.status === 'parsed') {
          setView('complete')
        } else if (latest.status === 'parsing') {
          setView('parsing')
          pollForCompletion(latest.id)
        } else {
          // 'uploaded' or 'failed'
          if (latest.status === 'failed') {
            setErrorMessage(latest.errorMessage || 'CV parsing failed')
          }
          setView('existing')
        }
      } catch {
        setView('dropzone')
      }
    }
    checkExisting()
  }, [pollForCompletion, refreshUploads])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  function validateFile(file: File): string | null {
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf' && ext !== 'docx') {
      return 'Only PDF and DOCX files are accepted'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds 10MB limit'
    }
    return null
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      // Step 1: Get signed upload URL
      setView('uploading')
      setErrorMessage(null)

      const signedRes = await fetch('/api/candidate/cv/upload', {
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

      // Step 3: Create DB record via PUT (also cleans up old uploads)
      const putRes = await fetch('/api/candidate/cv/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, path }),
      })

      if (!putRes.ok) {
        throw new Error('Failed to create upload record')
      }

      const record: CvUpload = await putRes.json()
      setCurrentUpload(record)
      await refreshUploads()

      // Step 4: Trigger parse
      await triggerParse(record.id)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed'
      )
      setView('dropzone')
    }
  }

  async function triggerParse(cvUploadId: string) {
    try {
      setView('parsing')
      setErrorMessage(null)

      const parseRes = await fetch('/api/candidate/cv/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvUploadId }),
      })

      const parseResult = await parseRes.json()

      if (!parseRes.ok) {
        throw new Error(parseResult.error || 'Failed to trigger parsing')
      }

      if (parseResult.success) {
        setCurrentUpload((prev) =>
          prev ? { ...prev, status: 'parsed', profileId: parseResult.profileId } : prev
        )
        setView('complete')
        await refreshUploads()
      } else if (parseResult.error) {
        setErrorMessage(parseResult.error)
        setCurrentUpload((prev) =>
          prev ? { ...prev, status: 'failed', errorMessage: parseResult.error } : prev
        )
        setView('existing')
        await refreshUploads()
      } else {
        // Parse is async, poll for completion
        pollForCompletion(cvUploadId)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Parsing failed'
      )
      setCurrentUpload((prev) =>
        prev ? { ...prev, status: 'failed' } : prev
      )
      setView('existing')
      await refreshUploads()
    }
  }

  async function handleDelete(uploadId: string) {
    setDeletingId(uploadId)
    try {
      const res = await fetch(`/api/candidate/cv/${uploadId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to delete upload')
        return
      }

      // If we deleted the current top-level upload, reset the view
      if (currentUpload?.id === uploadId) {
        setCurrentUpload(null)
        setErrorMessage(null)
      }

      const uploads = await refreshUploads()

      // Update the top-level view based on remaining uploads
      if (currentUpload?.id === uploadId) {
        if (uploads.length === 0) {
          setView('dropzone')
        } else {
          const latest = uploads[0]
          setCurrentUpload(latest)
          if (latest.status === 'parsed') {
            setView('complete')
          } else if (latest.status === 'parsing') {
            setView('parsing')
            pollForCompletion(latest.id)
          } else {
            if (latest.status === 'failed') {
              setErrorMessage(latest.errorMessage || 'CV parsing failed')
            }
            setView('existing')
          }
        }
      }
    } catch {
      setErrorMessage('Failed to delete upload')
    } finally {
      setDeletingId(null)
      setDeleteTarget(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function showDropzone() {
    setView('dropzone')
    setErrorMessage(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const dropzoneUI = (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-lg py-12 px-6 text-center transition-colors ${
          dragOver
            ? 'border-foreground/30 bg-secondary/50'
            : 'border-border hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="size-6 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Drop PDF or DOCX here, or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      {errorMessage && (
        <p className="mt-3 text-center text-sm text-red-600">{errorMessage}</p>
      )}
    </>
  )

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-sans">Upload CV</h1>
        <p className="text-sm text-muted-foreground">
          Upload your CV in PDF or DOCX format.
        </p>
      </div>

      {view === 'loading' && (
        <div className="flex items-center gap-2 py-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      )}

      {view === 'dropzone' && dropzoneUI}

      {view === 'existing' && currentUpload && (
        <div className="py-6">
          <div className="flex items-center gap-3 mb-3">
            {currentUpload.status === 'failed' ? (
              <XCircle className="size-5 text-[oklch(0.55_0.16_20)]" />
            ) : (
              <FileText className="size-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{currentUpload.filename}</span>
          </div>

          {errorMessage && (
            <p className="mb-4 text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              className="text-sm text-brand hover:underline"
              onClick={() => triggerParse(currentUpload.id)}
            >
              {currentUpload.status === 'failed' ? 'Retry analysis' : 'Analyze CV'}
            </button>
            <button
              className="text-sm text-brand hover:underline"
              onClick={showDropzone}
            >
              Upload different CV
            </button>
          </div>
        </div>
      )}

      {view === 'uploading' && (
        <div className="flex items-center gap-2 py-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Uploading your CV...</span>
        </div>
      )}

      {view === 'parsing' && (
        <div className="flex items-center gap-2 py-10">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Analyzing your CV...</span>
        </div>
      )}

      {view === 'complete' && (
        <div className="py-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="size-5 text-[oklch(0.55_0.14_155)]" />
            <span className="text-sm font-medium">Profile created</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/candidate/profile"
              className="text-sm text-brand hover:underline"
            >
              View Profile &gt;
            </Link>
            <button
              className="text-sm text-brand hover:underline"
              onClick={showDropzone}
            >
              Upload new CV
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Upload</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.filename}</span>?
              {deleteTarget?.status === 'parsed' && (
                <> This will also delete the associated profile and all parsed data.</>
              )}
              {' '}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setDeleteTarget(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-md"
              disabled={!!deletingId}
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {deletingId ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload History */}
      {allUploads.length > 0 && view !== 'loading' && (
        <div className="mt-8">
          <h2 className="text-sm font-medium mb-3">Your Uploads</h2>
          <div>
            {allUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">
                      {upload.filename}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(upload.status)}`} />
                    <span className="text-xs text-muted-foreground">
                      {statusText(upload.status)}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDate(upload.createdAt)}
                    </span>
                    {upload.status === 'failed' && upload.errorMessage && (
                      <span className="ml-2 text-xs text-red-600">
                        {upload.errorMessage}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {(upload.status === 'uploaded' || upload.status === 'failed') && (
                    <button
                      className="text-xs text-brand hover:underline"
                      onClick={() => {
                        setCurrentUpload(upload)
                        if (upload.status === 'failed') {
                          setErrorMessage(upload.errorMessage || 'CV parsing failed')
                        }
                        triggerParse(upload.id)
                      }}
                    >
                      Analyze
                    </button>
                  )}

                  {upload.status === 'parsed' && (
                    <button
                      className="text-xs text-brand hover:underline"
                      onClick={() => router.push('/candidate/profile')}
                    >
                      View Profile
                    </button>
                  )}

                  <button
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={upload.status === 'parsing' || deletingId === upload.id}
                    onClick={() => setDeleteTarget(upload)}
                    title={upload.status === 'parsing' ? 'Cannot delete while analyzing' : 'Delete upload'}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
