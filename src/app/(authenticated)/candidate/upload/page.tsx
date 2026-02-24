'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollForCompletion = useCallback(
    (cvUploadId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/candidate/cv/status')
          if (!res.ok) return
          const uploads: CvUpload[] = await res.json()
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
    []
  )

  // Fetch existing upload state on mount
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch('/api/candidate/cv/status')
        if (!res.ok) {
          setView('dropzone')
          return
        }
        const uploads: CvUpload[] = await res.json()
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
  }, [pollForCompletion])

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
      } else if (parseResult.error) {
        setErrorMessage(parseResult.error)
        setCurrentUpload((prev) =>
          prev ? { ...prev, status: 'failed', errorMessage: parseResult.error } : prev
        )
        setView('existing')
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
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Upload CV</h1>
        <p className="text-muted-foreground">
          Upload your CV in PDF format. Our system will automatically extract
          your qualifications and experience.
        </p>
      </div>

      <Card>
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
                  onClick={() => triggerParse(currentUpload.id)}
                >
                  {currentUpload.status === 'failed' ? 'Retry Analysis' : 'Analyze CV'}
                </Button>
                <Button variant="outline" onClick={showDropzone}>
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
              <CheckCircle className="mb-3 size-10 text-green-500" />
              <p className="mb-4 text-sm font-medium">
                Your profile has been created!
              </p>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/candidate/profile')}>
                  View Profile
                </Button>
                <Button variant="outline" onClick={showDropzone}>
                  Upload New CV
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
