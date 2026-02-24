'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are accepted'
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

  function statusBadge(status: CvUpload['status']) {
    switch (status) {
      case 'uploaded':
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Uploaded</Badge>
      case 'parsing':
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Parsing...</Badge>
      case 'parsed':
        return <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">Parsed</Badge>
      case 'failed':
        return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Failed</Badge>
    }
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
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="mb-3 size-10 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">
          Drag and drop your CV here
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          PDF only, max 10MB
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          Select file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">Upload CV</h1>
        <p className="text-muted-foreground">
          Upload your CV in PDF format. Our system will automatically extract
          your qualifications and experience.
        </p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>
            {view === 'loading' && 'Loading...'}
            {view === 'dropzone' && 'Upload Your CV'}
            {view === 'existing' && (currentUpload?.status === 'failed' ? 'Analysis Failed' : 'CV Uploaded')}
            {view === 'uploading' && 'Uploading...'}
            {view === 'parsing' && 'Analyzing Your CV...'}
            {view === 'complete' && 'Profile Created!'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view === 'loading' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="mb-3 size-10 animate-spin text-muted-foreground" />
            </div>
          )}

          {view === 'dropzone' && dropzoneUI}

          {view === 'existing' && currentUpload && (
            <div className="flex flex-col items-center py-6">
              {currentUpload.status === 'failed' ? (
                <XCircle className="mb-3 size-10 text-red-500" />
              ) : (
                <FileText className="mb-3 size-10 text-muted-foreground" />
              )}

              <p className="mb-1 text-sm font-medium">{currentUpload.filename}</p>

              {errorMessage && (
                <p className="mb-4 max-w-md text-center text-sm text-red-600">
                  {errorMessage}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  className="rounded-lg transition-all"
                  onClick={() => triggerParse(currentUpload.id)}
                >
                  {currentUpload.status === 'failed' ? 'Retry Analysis' : 'Analyze CV'}
                </Button>
                <Button variant="outline" className="rounded-lg transition-all" onClick={showDropzone}>
                  Upload Different CV
                </Button>
              </div>
            </div>
          )}

          {view === 'uploading' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="mb-3 size-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading your CV...</p>
              <p className="text-xs text-muted-foreground">
                This should only take a moment
              </p>
            </div>
          )}

          {view === 'parsing' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="mb-3 size-10 animate-spin text-primary" />
              <p className="text-sm font-medium">
                Analyzing your CV...
              </p>
              <p className="text-xs text-muted-foreground">
                Extracting your qualifications, experience, and specializations
              </p>
            </div>
          )}

          {view === 'complete' && (
            <div className="flex flex-col items-center py-10">
              <CheckCircle className="mb-3 size-10 text-teal-500" />
              <p className="mb-4 text-sm font-medium">
                Your profile has been created!
              </p>
              <div className="flex gap-3">
                <Button className="rounded-lg transition-all" onClick={() => router.push('/candidate/profile')}>
                  View Profile
                </Button>
                <Button variant="outline" className="rounded-lg transition-all" onClick={showDropzone}>
                  Upload New CV
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button variant="outline" className="rounded-lg transition-all" onClick={() => setDeleteTarget(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-lg transition-all"
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
        <Card className="mt-6 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Your Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {allUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {upload.filename}
                      </span>
                      {statusBadge(upload.status)}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5 pl-6">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(upload.createdAt)}
                      </span>
                      {upload.status === 'failed' && upload.errorMessage && (
                        <span className="text-xs text-red-600">
                          {upload.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {(upload.status === 'uploaded' || upload.status === 'failed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg transition-all"
                        onClick={() => {
                          setCurrentUpload(upload)
                          if (upload.status === 'failed') {
                            setErrorMessage(upload.errorMessage || 'CV parsing failed')
                          }
                          triggerParse(upload.id)
                        }}
                      >
                        Analyze
                      </Button>
                    )}

                    {upload.status === 'parsed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg transition-all"
                        onClick={() => router.push('/candidate/profile')}
                      >
                        View Profile
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={upload.status === 'parsing' || deletingId === upload.id}
                      onClick={() => setDeleteTarget(upload)}
                      title={upload.status === 'parsing' ? 'Cannot delete while analyzing' : 'Delete upload'}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
