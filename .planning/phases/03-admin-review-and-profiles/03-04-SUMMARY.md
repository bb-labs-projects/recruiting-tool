---
phase: 03-admin-review-and-profiles
plan: 04
subsystem: admin-ui
tags: [profile-detail, inline-edit, resizable-panels, approve-reject, confidence-badges, server-actions]
depends_on:
  - "03-02"
  - "03-03"
provides:
  - "Profile detail page at /admin/candidates/[id] with full data display and inline editing"
  - "InlineEditField reusable click-to-edit component with confidence badge display"
  - "ProfileForm component with 6 organized sections (contact, specializations, education, work history, tech domains, bar admissions)"
  - "ProfileActions component with approve button and reject dialog with required notes"
  - "Side-by-side PDF + profile data layout using ResizablePanelGroup when CV exists"
affects:
  - "03-05: End-to-end verification will test full admin workflow through this page"
tech_stack:
  added: []
  patterns:
    - "Click-to-edit inline editing with useTransition for optimistic UI and server action calls"
    - "Action wrapper functions that bind server actions with context (profileId, fieldName, sibling values)"
    - "ResizablePanelGroup for side-by-side PDF viewer + data editing layout"
    - "Server component data fetching with full relational query, client components for interactivity"
key_files:
  created:
    - "src/components/admin/inline-edit-field.tsx"
    - "src/components/admin/profile-form.tsx"
    - "src/app/admin/candidates/[id]/page.tsx"
    - "src/app/admin/candidates/[id]/profile-actions.tsx"
  modified: []
decisions:
  - "[03-04-D1] Used useTransition instead of useActionState for approve/reject actions to avoid complex type narrowing issues with useActionState overloads"
  - "[03-04-D2] Used orientation prop instead of direction for ResizablePanelGroup (react-resizable-panels v3 API)"
metrics:
  duration: "~5 minutes"
  completed: "2026-02-20"
---

# Phase 3 Plan 4: Profile Detail with Inline Editing Summary

Profile detail page at /admin/candidates/[id] with click-to-edit inline editing for all fields, resizable side-by-side PDF viewer layout, organized sections with confidence badges, and approve/reject workflow with required rejection notes dialog.

## What Was Done

### Task 1: Create InlineEditField component and ProfileForm sections component
- Created `src/components/admin/inline-edit-field.tsx`:
  - Click-to-edit field with display mode (value + ConfidenceBadge + hover pencil icon) and edit mode (auto-focused Input)
  - Enter saves, Escape cancels, blur saves
  - useTransition for pending state with disabled input and "Saving..." indicator
  - Error display from server action response
  - Handles empty values with "(empty)" placeholder in muted italic text
  - Receives generic action prop for reuse across field types
- Created `src/components/admin/profile-form.tsx`:
  - Exports ProfileForm component and ProfileFormData type
  - 6 organized sections in Card components with clear headings:
    1. Contact Information: name, email, phone as InlineEditField
    2. Specializations: read-only Badge + ConfidenceBadge display
    3. Education: per-entry inline editing for institution, degree, field, year
    4. Work History: per-entry inline editing for employer, title, startDate, endDate, description; sorted by startDate descending
    5. Technical Domains: read-only Badge + ConfidenceBadge display
    6. Bar Admissions: per-entry inline editing for jurisdiction, year, status
  - Action wrapper functions that bind server actions with profileId, fieldName, and sibling field values for child table updates
  - Empty state messages for sections with no data
  - Separator between multiple entries within a section
- **Commit:** `1037ca5`

### Task 2: Create profile detail page with approve/reject actions and PDF side-by-side view
- Created `src/app/admin/candidates/[id]/profile-actions.tsx`:
  - Client component with approve button (green, calls approveProfile) and reject button (red, opens Dialog)
  - useTransition for pending states on both actions
  - Reject dialog: required Textarea for rejection notes, Cancel + Confirm buttons
  - Pre-populates existing rejectionNotes if profile was previously rejected
  - Buttons hidden when already in that state (no approve when active, no reject when rejected)
- Created `src/app/admin/candidates/[id]/page.tsx` as server component:
  - Fetches full profile via db.query.profiles.findFirst() with all relations (education, workHistory, barAdmissions, profileSpecializations + specialization, profileTechnicalDomains + technicalDomain, cvUploads)
  - Next.js 16 async params typing with Promise<{ id: string }>
  - Flattens junction table data for specializations and technicalDomains
  - Side-by-side layout with ResizablePanelGroup when CV with blobUrl exists (45/55 split, draggable)
  - Full-width layout (max-w-4xl) when no CV PDF available
  - Header with back link, profile name, StatusBadge, ProfileActions
  - Rejection notes banner for rejected profiles
  - notFound() on invalid profile ID
- **Commit:** `cb6de32`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` passes | PASS |
| `npm run build` succeeds | PASS |
| /admin/candidates/[id] route exists | PASS |
| Page fetches full profile with all nested relations | PASS |
| Resizable side-by-side layout when CV exists | PASS |
| Full-width layout when no CV exists | PASS |
| Approve button triggers approveProfile server action | PASS |
| Reject button opens Dialog with textarea | PASS |
| ProfileForm renders all 6 sections | PASS |
| InlineEditField exports with display/edit/save/cancel modes | PASS |
| All editable fields wired to server actions | PASS |
| Specializations and tech domains read-only with badges | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ResizablePanelGroup prop name**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Plan used `direction="horizontal"` but react-resizable-panels v3 uses `orientation` prop
- **Fix:** Changed to `orientation="horizontal"`
- **Files modified:** src/app/admin/candidates/[id]/page.tsx

**2. [Rule 1 - Bug] Fixed useActionState type incompatibility**
- **Found during:** Task 2 TypeScript verification
- **Issue:** useActionState overload types required exact initial state match with action return type; `{}` did not satisfy the union
- **Fix:** Replaced useActionState with useTransition + direct server action calls for cleaner typing
- **Files modified:** src/app/admin/candidates/[id]/profile-actions.tsx

## Next Phase Readiness

### What's ready for Plan 03-05:
- Full admin workflow functional: list -> detail -> edit -> approve/reject
- All profile fields editable with inline editing and confidence upgrade
- Side-by-side PDF comparison available when CV exists
- Status transitions (approve/reject) working with required notes
