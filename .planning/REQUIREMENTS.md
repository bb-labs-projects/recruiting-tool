# Requirements — IP Lawyer Recruiting Platform

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can request a magic link via email and log in without a password
- [ ] **AUTH-02**: System routes user to candidate or employer experience based on role after login
- [ ] **AUTH-03**: Admin can log in with super-user privileges to access the admin dashboard
- [ ] **AUTH-04**: New employer accounts require admin approval before they can browse profiles

### CV Parsing & Profiles

- [ ] **PROF-01**: Admin can upload PDF CVs and system extracts structured data via Claude API (name, contact, specializations, education, tech background, work history)
- [ ] **PROF-02**: System assigns confidence scores per extracted field so admin can prioritize review
- [ ] **PROF-03**: Admin can review, correct, and approve parsed profiles via a review queue before they go live
- [ ] **PROF-04**: Candidates can self-register, create a profile, and upload their own CV for automatic parsing

### Marketplace

- [ ] **MARK-01**: Employers can browse anonymized candidate profiles (no name/contact details) — enforced server-side
- [ ] **MARK-02**: Employers can search and filter candidates by IP specialization, experience, location, tech background, patent bar status
- [ ] **MARK-03**: Employers can pay per-profile via Stripe to unlock a candidate's full contact details and name
- [ ] **MARK-04**: Employers can save/favorite profiles for later viewing

### Job Matching

- [ ] **JOBS-01**: Employers and agency can create job listings with requirements (specialization, experience, location, etc.)
- [ ] **JOBS-02**: System uses Claude API to analyze job requirements and rank candidates by fit score
- [ ] **JOBS-03**: System notifies employers of matching candidates and candidates of matching jobs

### Admin Dashboard

- [ ] **ADMN-01**: Admin can view, edit, and manage all candidate profiles and parsed data
- [ ] **ADMN-02**: Admin can approve, manage, and view activity of employer accounts
- [ ] **ADMN-03**: Admin can view analytics: profile views, unlock conversions, popular searches, revenue
- [ ] **ADMN-04**: Admin can batch-upload multiple CVs at once (initial 95 + ongoing)

## v2 Requirements (Deferred)

- In-platform messaging between employers and candidates
- Subscription billing model
- Candidate availability status / active job-seeking toggle
- Advanced analytics (time-to-hire, funnel analysis)
- Mobile app

## Out of Scope

- Multi-tenant (multiple agencies) — single agency only for v1
- ATS (applicant tracking system) features — different product category
- Video interviews — outside recruiting platform scope
- Automated email outreach campaigns — potential v3
- In-platform messaging — agency is the intermediary

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| AUTH-01 | — | — | Pending |
| AUTH-02 | — | — | Pending |
| AUTH-03 | — | — | Pending |
| AUTH-04 | — | — | Pending |
| PROF-01 | — | — | Pending |
| PROF-02 | — | — | Pending |
| PROF-03 | — | — | Pending |
| PROF-04 | — | — | Pending |
| MARK-01 | — | — | Pending |
| MARK-02 | — | — | Pending |
| MARK-03 | — | — | Pending |
| MARK-04 | — | — | Pending |
| JOBS-01 | — | — | Pending |
| JOBS-02 | — | — | Pending |
| JOBS-03 | — | — | Pending |
| ADMN-01 | — | — | Pending |
| ADMN-02 | — | — | Pending |
| ADMN-03 | — | — | Pending |
| ADMN-04 | — | — | Pending |

---
*Last updated: 2026-02-19 after requirements definition*
