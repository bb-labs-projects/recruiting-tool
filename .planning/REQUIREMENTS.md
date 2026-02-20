# Requirements -- IP Lawyer Recruiting Platform

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can request a magic link via email and log in without a password
- [x] **AUTH-02**: System routes user to candidate or employer experience based on role after login
- [x] **AUTH-03**: Admin can log in with super-user privileges to access the admin dashboard
- [ ] **AUTH-04**: New employer accounts require admin approval before they can browse profiles

### CV Parsing & Profiles

- [x] **PROF-01**: Admin can upload PDF CVs and system extracts structured data via Claude API (name, contact, specializations, education, tech background, work history)
- [x] **PROF-02**: System assigns confidence scores per extracted field so admin can prioritize review
- [x] **PROF-03**: Admin can review, correct, and approve parsed profiles via a review queue before they go live
- [ ] **PROF-04**: Candidates can self-register, create a profile, and upload their own CV for automatic parsing

### Marketplace

- [ ] **MARK-01**: Employers can browse anonymized candidate profiles (no name/contact details) -- enforced server-side
- [ ] **MARK-02**: Employers can search and filter candidates by IP specialization, experience, location, tech background, patent bar status
- [ ] **MARK-03**: Employers can pay per-profile via Stripe to unlock a candidate's full contact details and name
- [ ] **MARK-04**: Employers can save/favorite profiles for later viewing

### Job Matching

- [ ] **JOBS-01**: Employers and agency can create job listings with requirements (specialization, experience, location, etc.)
- [ ] **JOBS-02**: System uses Claude API to analyze job requirements and rank candidates by fit score
- [ ] **JOBS-03**: System notifies employers of matching candidates and candidates of matching jobs

### Admin Dashboard

- [x] **ADMN-01**: Admin can view, edit, and manage all candidate profiles and parsed data
- [ ] **ADMN-02**: Admin can approve, manage, and view activity of employer accounts
- [ ] **ADMN-03**: Admin can view analytics: profile views, unlock conversions, popular searches, revenue
- [x] **ADMN-04**: Admin can batch-upload multiple CVs at once (initial 95 + ongoing)

## v2 Requirements (Deferred)

- In-platform messaging between employers and candidates
- Subscription billing model
- Candidate availability status / active job-seeking toggle
- Advanced analytics (time-to-hire, funnel analysis)
- Mobile app

## Out of Scope

- Multi-tenant (multiple agencies) -- single agency only for v1
- ATS (applicant tracking system) features -- different product category
- Video interviews -- outside recruiting platform scope
- Automated email outreach campaigns -- potential v3
- In-platform messaging -- agency is the intermediary

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| AUTH-01 | Phase 1 | 01-03, 01-05 | Complete |
| AUTH-02 | Phase 1 | 01-04, 01-05 | Complete |
| AUTH-03 | Phase 1 | 01-02, 01-04 | Complete |
| AUTH-04 | Phase 4 | -- | Pending |
| PROF-01 | Phase 2 | 02-01, 02-02, 02-03 | Complete |
| PROF-02 | Phase 2 | 02-02, 02-04 | Complete |
| PROF-03 | Phase 3 | 03-03, 03-04 | Complete |
| PROF-04 | Phase 7 | -- | Pending |
| MARK-01 | Phase 4 | -- | Pending |
| MARK-02 | Phase 5 | -- | Pending |
| MARK-03 | Phase 6 | -- | Pending |
| MARK-04 | Phase 5 | -- | Pending |
| JOBS-01 | Phase 8 | -- | Pending |
| JOBS-02 | Phase 8 | -- | Pending |
| JOBS-03 | Phase 8 | -- | Pending |
| ADMN-01 | Phase 3 | 03-02, 03-04 | Complete |
| ADMN-02 | Phase 4 | -- | Pending |
| ADMN-03 | Phase 6 | -- | Pending |
| ADMN-04 | Phase 2 | 02-03, 02-04 | Complete |

---
*Last updated: 2026-02-20 after Phase 3 completion*
