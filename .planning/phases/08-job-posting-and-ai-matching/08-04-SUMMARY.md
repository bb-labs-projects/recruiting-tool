---
phase: 08-job-posting-and-ai-matching
plan: 04
status: done
---

## What was done

Created admin job management pages and admin-specific server actions for the recruiting platform.

### Task 1: Admin Job List Page

- **src/app/admin/jobs/columns.tsx** -- TanStack Table column definitions with Title (sortable, linked), Employer, Status (color-coded badges), Matching status (color-coded badges), Matches count (sortable), and Created date (sortable).
- **src/app/admin/jobs/data-table.tsx** -- Reusable DataTable component with sorting, global search (title + employer), status filter dropdown, and pagination. Follows the exact pattern from admin/candidates/.
- **src/app/admin/jobs/page.tsx** -- Server component listing all jobs via `getJobsForAdmin()` with summary cards (Total, Draft, Open, Closed/Archived) and a "Create Job" button linking to `/admin/jobs/new`.
- **src/app/admin/layout.tsx** -- Added "Jobs" link to the admin sidebar nav, positioned after "Employers".

### Task 2: Admin Job Detail, New Job, and Server Actions

- **src/app/admin/jobs/new/page.tsx** -- Server component that loads all approved employers and renders the employer selection form.
- **src/app/admin/jobs/new/admin-job-create-form.tsx** -- Client component with employer dropdown and reuses `<JobForm>` with `createJobForEmployerAction`. Passes `redirectTo="/admin/jobs"` so the redirect goes to the admin detail page instead of the employer page.
- **src/app/admin/jobs/[id]/page.tsx** -- Server component showing full job details, employer info, status controls, matching trigger, notification trigger with unnotified count, and match results.
- **src/app/admin/jobs/[id]/notification-trigger.tsx** -- Client component for "Send Notifications" button showing pending count. Calls `triggerNotificationsAction`.
- **src/app/admin/jobs/[id]/status-controls.tsx** -- Client component with status transition buttons (Publish, Close, Archive). Calls `updateJobStatusAction`.
- **src/actions/jobs.ts** -- Extended with three admin-specific actions:
  - `createJobForEmployerAction` -- Admin creates job on behalf of employer (validates admin role and approved employer profile)
  - `triggerNotificationsAction` -- Admin manually re-sends notifications via `notifyMatchResults` from the notify module (reuses Plan 02's notification pipeline)
  - `updateJobStatusAction` -- Admin changes job status (validates admin role)
- **src/components/jobs/job-form.tsx** -- Added optional `redirectTo` prop so admin pages can redirect to `/admin/jobs/` instead of `/employer/jobs/`.

### Key design decisions

- Reused the existing `MatchingTrigger` component from the employer detail page for running AI matching from the admin view.
- `triggerNotificationsAction` reuses `notifyMatchResults` from `src/lib/matching/notify.ts` rather than duplicating notification logic. The `notifyMatchResults` function internally checks `notifiedAt IS NULL` to prevent duplicate notifications.
- All admin actions verify `user.role === 'admin'` before proceeding.
- Admin layout sidebar was updated with a single line addition.
