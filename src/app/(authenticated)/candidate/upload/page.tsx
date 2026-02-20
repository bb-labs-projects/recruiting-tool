'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'complete' | 'error'

export default function CandidateUploadPage() {
  const router = useRouter()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasExistingProfile, setHasExistingProfile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check for existing uploads on mount
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch('/api/candidate/cv/status')
        if (res.ok) {
          const uploads = await res.json()
          if (uploads.some((u: { status: string }) => u.status === 'parsed')) {
            setHasExistingProfile(true)
          }
        }
      } catch {
        // Silently fail
      }
    }
    checkExisting()
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

  const pollForCompletion = useCallback(
    (cvUploadId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/candidate/cv/status')
          if (!res.ok) return
          const uploads = await res.json()
          const target = uploads.find(
            (u: { id: string }) => u.id === cvUploadId
          )
          if (!target) return

          if (target.status === 'parsed') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('complete')
            // Auto-redirect after short delay
            setTimeout(() => router.push('/candidate/profile'), 1500)
          } else if (target.status === 'failed') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setErrorMessage(target.errorMessage || 'CV parsing failed')
            setStatus('error')
          }
        } catch {
          // Continue polling
        }
      }, 3000)
    },
    [router]
  )

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setStatus('error')
      return
    }

    try {
      // Step 1: Upload to blob storage
      setStatus('uploading')
      setErrorMessage(null)

      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/candidate/cv/upload',
      })

      // Step 2: Create DB record via PUT
      const putRes = await fetch('/api/candidate/cv/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, blobUrl: blob.url }),
      })

      if (!putRes.ok) {
        throw new Error('Failed to create upload record')
      }

      const record = await putRes.json()

      // Step 3: Trigger parse
      setStatus('parsing')
      const parseRes = await fetch('/api/candidate/cv/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvUploadId: record.id }),
      })

      if (!parseRes.ok) {
        throw new Error('Failed to trigger parsing')
      }

      const parseResult = await parseRes.json()

      if (parseResult.success) {
        setStatus('complete')
        setTimeout(() => router.push('/candidate/profile'), 1500)
      } else if (parseResult.error) {
        setErrorMessage(parseResult.error)
        setStatus('error')
      } else {
        // Parse is async, poll for completion
        pollForCompletion(record.id)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed'
      )
      setStatus('error')
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

  function resetState() {
    setStatus('idle')
    setErrorMessage(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Upload CV</h1>
        <p className="text-muted-foreground">
          Upload your CV in PDF format. Our system will automatically extract
          your qualifications and experience.
        </p>
      </div>

      {/* Re-upload warning */}
      {hasExistingProfile && status === 'idle' && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            You already have a profile. Uploading a new CV will replace your
            existing profile and require re-approval.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'idle' && 'Upload Your CV'}
            {status === 'uploading' && 'Uploading...'}
            {status === 'parsing' && 'Analyzing Your CV...'}
            {status === 'complete' && 'Profile Created!'}
            {status === 'error' && 'Something Went Wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'idle' && (
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
          )}

          {status === 'uploading' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="mb-3 size-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading your CV...</p>
              <p className="text-xs text-muted-foreground">
                This should only take a moment
              </p>
            </div>
          )}

          {status === 'parsing' && (
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

          {status === 'complete' && (
            <div className="flex flex-col items-center py-10">
              <CheckCircle className="mb-3 size-10 text-green-500" />
              <p className="text-sm font-medium">
                Your profile has been created!
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to your profile...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-10">
              <XCircle className="mb-3 size-10 text-red-500" />
              <p className="mb-2 text-sm font-medium">
                {errorMessage || 'An error occurred'}
              </p>
              <Button variant="outline" size="sm" onClick={resetState}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
