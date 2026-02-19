# Domain Pitfalls

**Domain:** IP Lawyer Recruiting Platform (CV parsing, AI matching, anonymization, payment gating)
**Researched:** 2026-02-19
**Overall confidence:** MEDIUM (based on training knowledge of recruiting platforms, LLM parsing patterns, Stripe integration, and GDPR; WebSearch unavailable for verification)

---

## Critical Pitfalls

Mistakes that cause rewrites, data breaches, or fundamental product failure.

---

### Pitfall 1: CV Parsing Produces Silently Wrong Structured Data

**What goes wrong:** Claude API parses a PDF CV and returns plausible-looking but incorrect structured data. The name is right, the email is right, but the specialization is wrong (e.g., "patent prosecution" extracted when the lawyer actually does "patent litigation"), years of experience are miscalculated, or bar admissions are hallucinated. Because the output looks reasonable, nobody catches the errors until an employer pays to unlock a profile and finds it does not match reality.

**Why it happens:**
- IP law CVs use dense, domain-specific terminology where terms differ subtly ("patent prosecution" vs. "patent litigation" vs. "patent portfolio management")
- PDF extraction itself is lossy -- multi-column layouts, tables, headers/footers, and decorative formatting cause text extraction to scramble the reading order before Claude even sees it
- Claude hallucinates plausible-sounding bar admissions or technology domains when the CV is ambiguous
- Dates and durations are notoriously hard to extract accurately from free-text work histories ("2015-present" requires knowing "present" means the parse date)
- Batch processing 95 CVs creates a false sense of completion -- "they all parsed" does not mean "they all parsed correctly"

**Consequences:**
- Employers pay per-profile and get wrong data -- immediate trust destruction, potential refund demands
- Bad structured data poisons AI matching downstream (garbage in, garbage out)
- Admin spends more time correcting AI output than manual entry would have taken

**Prevention:**
1. **Confidence scores per field:** Have the Claude parsing prompt return a confidence level (HIGH/MEDIUM/LOW) for each extracted field. Flag LOW-confidence fields for admin review.
2. **Mandatory admin review queue:** Never auto-publish a parsed profile. All parsed profiles enter a "pending review" state. Admin sees the original PDF side-by-side with extracted data and confirms or corrects.
3. **Structured prompt with explicit field definitions:** Define exactly what each specialization means in the system prompt. Provide a controlled vocabulary for IP specializations rather than letting Claude free-text them.
4. **PDF text extraction validation:** Before sending to Claude, extract raw text from the PDF using a library (pdf-parse or similar) and verify you are getting coherent text. If the text extraction is garbled (multi-column overlap), flag the CV for manual processing.
5. **Parse-then-verify pattern:** After initial parse, run a second Claude call that receives both the original text AND the structured output, asking it to verify accuracy and flag discrepancies.

**Detection (warning signs):**
- Unusually high consistency across profiles (Claude defaulting to common values when uncertain)
- All 95 CVs parse "successfully" with zero errors -- this means errors are silent
- Specializations cluster unnaturally (e.g., 80% show "patent prosecution" when the pool should be diverse)
- Duplicate or near-duplicate entries where the same candidate appears with slightly different data

**Phase mapping:** Foundation phase (CV parsing). This is the single most important thing to get right. Build the review queue and confidence scoring from day one, not as a later enhancement.

---

### Pitfall 2: Anonymization Leaks Identity Through Contextual Data

**What goes wrong:** The system correctly hides the candidate's name and contact details from free-tier employers, but the remaining "anonymized" profile contains enough contextual information to identify the person. An employer sees: "12 years IP litigation experience at [Major IP Boutique], registered patent attorney, Stanford JD, specializes in semiconductor patent disputes" -- and immediately knows who this is because the IP law community is small.

**Why it happens:**
- IP law is a niche field. Senior practitioners at specific firms are identifiable by their work history alone.
- The combination of firm name + specialization + graduation year + location is often uniquely identifying even without a name
- Work history (firms worked at, positions held) is the most valuable data for employers AND the most identifying data
- "Notable clients/matters" is essentially a fingerprint in a specialized legal field

**Consequences:**
- Employers identify candidates without paying, destroying the monetization model
- Candidates discover they are identifiable and lose trust in the platform
- Potential legal liability if candidates consented to anonymized listing and are identifiable anyway

**Prevention:**
1. **Tiered data disclosure model:** Define exactly which fields are visible at each tier:
   - **Free tier:** Specialization categories (broad, e.g., "Patent Prosecution"), years of experience (as a range, e.g., "10-15 years"), education level (degree type only, not institution), location (region only, e.g., "Northeast US"), technology domains (broad categories)
   - **Paid tier:** Everything -- name, contact, specific firms, specific education, specific matters
2. **Generalize identifying fields:** Instead of "Baker McKenzie, 2015-2023", show "AmLaw 100 firm, 8 years." Instead of "Stanford JD 2010", show "Top 14 JD."
3. **k-anonymity principle:** Every anonymized profile should be indistinguishable from at least k other profiles on the platform based on visible attributes. With 95 candidates, aim for k=3 minimum.
4. **Firm name suppression is non-negotiable:** Never show specific firm names in anonymized view. This is the single biggest identification vector in legal recruiting.
5. **Admin-configurable anonymization rules:** Let the admin adjust what is visible/hidden per tier, since they understand the IP law market and know what is identifying.

**Detection (warning signs):**
- Employers consistently unlock only the exact profiles they need (suggests they already know who the candidates are)
- Low unlock-to-search ratio (employers searching a lot but buying very little)
- Candidate complaints about being contacted without an unlock

**Phase mapping:** Core platform phase (profile display). Anonymization logic must be designed with the database schema -- it is not a UI filter you add later. The database queries for free-tier users should never even SELECT identifying columns.

---

### Pitfall 3: Payment Gating Bypass via API or Client-Side Data Exposure

**What goes wrong:** The anonymization is enforced in the UI (React component hides the name), but the API response includes full candidate data. A technically savvy employer opens browser DevTools, inspects the network tab, and sees the full profile JSON including name, email, and phone. Or they call the API directly and bypass the frontend entirely.

**Why it happens:**
- Developers build the frontend first and add "anonymization" by conditionally rendering fields in React, without restricting the API response
- Next.js server components blur the line between server and client -- data fetched in a server component might still be serialized into the page props
- GraphQL over-fetching: if using GraphQL, the resolver returns all fields and the client just does not display some
- Caching layers (CDN, browser cache, React Query cache) may store full profiles and serve them from cache even after the UI "hides" them

**Consequences:**
- Complete monetization bypass -- employers never need to pay
- Once discovered, this exploit spreads quickly in the small IP law employer community
- Potential data breach notification requirement if candidate PII is exposed without consent

**Prevention:**
1. **Server-side anonymization, always:** Create two distinct API endpoints or two distinct database views:
   - `GET /api/candidates/:id/public` -- returns only anonymized fields, no PII columns in the SQL query
   - `GET /api/candidates/:id/full` -- requires payment verification, returns everything
2. **Never send PII to unpaid clients, period:** The anonymization boundary must be at the database query level. Use SQL views or query scoping that physically cannot return name/email/phone for unpaid requests.
3. **Middleware authorization check on full profile endpoint:** Before returning any full profile, verify in middleware that `candidate_unlocks` table has a record for this employer+candidate pair with `payment_status = 'completed'`.
4. **Next.js-specific: Use Server Actions or API routes, not client-side fetching for profile data:** This keeps the data boundary on the server. Never pass full profile data as page props to client components.
5. **Audit endpoint responses:** During development, regularly inspect the actual JSON payloads returned by the API to verify no PII leaks. Add automated tests that assert the anonymized endpoint never returns name/email/phone fields.

**Detection (warning signs):**
- API response payloads larger than expected for anonymized views
- Network tab inspection during development reveals full data
- Any use of `select *` in profile queries (should always be explicit column selection)

**Phase mapping:** Foundation phase (database schema and API design). The two-tier data access pattern must be baked into the architecture from the start. Retrofitting server-side anonymization onto client-side filtering is a rewrite.

---

### Pitfall 4: GDPR and Candidate Consent Violations

**What goes wrong:** The platform collects candidate CVs (either uploaded by the agency or self-registered) and makes profiles available to employers, but lacks proper legal basis and consent mechanisms. A candidate demands their data be deleted (GDPR Article 17 "right to erasure") and the system cannot comply because their data is scattered across parsed profiles, match results, PDF storage, and employer unlock records.

**Why it happens:**
- The agency uploads 95 CVs on behalf of candidates who may not have explicitly consented to being listed on a web platform
- Self-registered candidates consent implicitly by signing up, but the scope of consent is unclear (did they consent to AI processing? to anonymized profile display? to employers storing their unlocked profiles?)
- Candidate data propagates to multiple places: original PDF, parsed structured data, match scores, employer purchase records, any cached/indexed copies
- No clear data retention policy -- how long are profiles kept? What happens when a candidate finds a job?

**Consequences:**
- GDPR fines (up to 4% of annual turnover or 20M EUR, whichever is higher)
- Candidate complaints to data protection authorities
- Mandatory data breach notifications if PII is improperly accessed
- Reputational damage in a small, professional community

**Prevention:**
1. **Consent at upload for agency CVs:** Before the admin uploads CVs, require documented consent from each candidate. Provide a consent form template. Store consent records in the database with timestamps.
2. **Granular consent for self-registered candidates:** At registration, present clear consent for: (a) AI processing of CV, (b) anonymized profile visible to employers, (c) full profile visible upon payment. Allow candidates to withdraw consent.
3. **Data deletion capability from day one:** Build a `DELETE /api/candidates/:id/gdpr-erasure` endpoint that cascades deletion across: profiles table, parsed data, match scores, PDF storage, and any caches. Log the deletion itself (you can keep a record that deletion was performed, but not the data).
4. **Data retention policy:** Define and enforce: profiles inactive for X months are archived, then deleted. Employer unlock records are anonymized after Y months.
5. **Right to access:** Candidates must be able to download all data held about them (GDPR Article 15). Build a data export function early.
6. **Legal basis documentation:** Document whether you rely on consent, legitimate interest, or contractual necessity for each data processing activity. This is a legal decision, not a technical one, but the technical architecture must support whichever basis is chosen.

**Detection (warning signs):**
- No consent tracking table in the database schema
- No candidate-facing "manage my data" or "delete my account" functionality
- Agency-uploaded CVs with no consent documentation
- Inability to answer "where is all of candidate X's data?" quickly

**Phase mapping:** Foundation phase (database schema must include consent tracking) and early platform phase (candidate self-service data management). Do NOT defer GDPR compliance to a "later phase" -- it affects schema design, API design, and file storage architecture.

---

### Pitfall 5: Claude API Costs Spiral on Job Matching at Scale

**What goes wrong:** The AI matching feature calls Claude API for every candidate-job pair to generate a fit score. With 95 candidates and even 10 active jobs, that is 950 API calls per matching run. As the platform grows to 500 candidates and 50 jobs, that is 25,000 API calls per run. Each call includes the full candidate profile and full job description. Costs become unsustainable and response times become unacceptable.

**Why it happens:**
- Initial architecture treats Claude API as a real-time scoring engine rather than a batch/cached process
- No pre-filtering before AI matching -- every candidate is scored against every job, even clearly irrelevant ones
- Prompt design includes full profile text when structured attributes would suffice for initial filtering
- No caching of match scores -- re-running a match recomputes everything from scratch
- Token usage is not monitored, so costs creep up without visibility

**Consequences:**
- Monthly API costs grow quadratically with platform size (candidates x jobs)
- Matching becomes too slow for real-time use (minutes instead of seconds)
- Temptation to reduce quality (shorter prompts, fewer candidates per match) to manage costs

**Prevention:**
1. **Two-stage matching architecture:**
   - **Stage 1 (cheap, fast):** PostgreSQL query filters candidates by hard requirements (location, bar admissions, minimum years of experience, required specialization). This eliminates 70-90% of candidates with zero API cost.
   - **Stage 2 (Claude API, targeted):** Only score the filtered shortlist (typically 10-30 candidates) against the job using Claude for nuanced semantic matching.
2. **Cache match scores:** Store scores in a `match_scores` table with `candidate_id`, `job_id`, `score`, `reasoning`, `computed_at`. Only recompute when candidate profile or job listing changes.
3. **Batch processing, not real-time:** Run matching as a background job (triggered on new job creation or profile update), not on every page load.
4. **Monitor and budget:** Track API costs per feature (parsing vs. matching) with a simple logging table. Set alerts for cost thresholds.
5. **Structured data matching as fallback:** Build a non-AI scoring function using structured fields (specialization overlap, experience match, location match) that runs instantly. Use Claude API only for the top candidates or when the employer explicitly requests AI-powered ranking.

**Detection (warning signs):**
- Matching endpoint takes more than 5 seconds for a single job
- Claude API bill exceeds expectations in first month
- Matching code iterates over all candidates without filtering
- No `match_scores` or equivalent caching table in the schema

**Phase mapping:** Job matching phase. Design the two-stage architecture from the start. The PostgreSQL filtering stage should be built alongside the structured candidate data schema (foundation phase), and the Claude matching should layer on top.

---

## Moderate Pitfalls

Mistakes that cause significant delays, technical debt, or degraded user experience.

---

### Pitfall 6: PDF Text Extraction Fails Before Claude Even Sees It

**What goes wrong:** The system assumes PDFs contain extractable text, but many CVs are scanned images (image-based PDFs with no text layer), use custom fonts that do not map to Unicode correctly, or contain complex multi-column layouts that produce garbled text when extracted linearly. Claude receives garbage text and either hallucinates a plausible profile or returns an error.

**Why it happens:**
- Lawyers at prestigious firms often have beautifully designed CVs created by graphic designers -- heavy formatting, columns, tables, logos
- Some CVs are scanned from print (especially from older lawyers)
- PDF libraries (like pdf-parse/pdf.js in Node.js) have varying quality of text extraction
- Nobody tests with the actual 95 PDFs until the feature is "done"

**Prevention:**
1. **Test with actual CVs immediately:** Get 5-10 representative PDFs from the actual batch of 95 and test parsing in the first sprint. Do not build the entire pipeline against synthetic test PDFs.
2. **PDF type detection:** Check if the PDF contains text layers. If not (image-only PDF), route to OCR first (Tesseract or a cloud OCR service) before sending to Claude.
3. **Multi-modal Claude as fallback:** If text extraction produces low-quality results, send the PDF pages as images to Claude's vision capability. Claude can read text from images directly. This handles scanned and heavily formatted CVs.
4. **Text quality validation:** After extracting text from PDF, run basic quality checks: minimum character count, presence of expected patterns (email format, phone format, common words like "experience", "education"). If quality is low, flag for alternative processing.
5. **Store both raw text and parsed results:** Keep the extracted raw text alongside the structured output so admin can diagnose parsing issues.

**Phase mapping:** Foundation phase (CV parsing). Build PDF processing robustly from the start, including the image/OCR fallback path.

---

### Pitfall 7: Search Performance Degrades with Structured Legal Data

**What goes wrong:** Employers search for candidates by combining filters: specialization = "patent prosecution" AND technology domain = "biotech" AND years of experience > 10 AND location = "California" AND bar admissions includes "USPTO". With a naive schema (single candidates table with JSON columns) or missing indexes, these compound queries become slow. Full-text search on free-text fields (work history descriptions) is even worse.

**Why it happens:**
- Initial schema stores structured data but does not index the fields employers actually filter on
- Many-to-many relationships (candidate has multiple specializations, multiple bar admissions, multiple technology domains) require junction tables that are slow to join without proper indexing
- Full-text search on PostgreSQL requires `tsvector` columns and GIN indexes, which are not set up by default
- Faceted search (showing counts per filter value) requires additional query optimization

**Prevention:**
1. **Design schema for query patterns, not just storage:**
   - Separate junction tables for: `candidate_specializations`, `candidate_bar_admissions`, `candidate_technology_domains`
   - Index every column used in WHERE clauses
   - Use PostgreSQL `tsvector` for full-text search on work history and other free-text fields
2. **Composite indexes for common filter combinations:** Create composite indexes for the most common search patterns (e.g., specialization + experience range).
3. **Materialized views for search:** If query complexity grows, create a materialized search view that pre-joins candidate data with their specializations, admissions, and domains into a flat, searchable structure. Refresh on profile updates.
4. **Pagination from day one:** Never return all candidates at once. Implement cursor-based pagination for search results.
5. **Test with realistic data volume:** 95 candidates will not expose performance issues. Seed the database with 1,000+ fake profiles during development to catch query performance problems early.

**Phase mapping:** Foundation phase (database schema). Index design and junction tables must be in the initial migration, not added when search is "slow."

---

### Pitfall 8: Stripe Payment Gating Race Conditions and Edge Cases

**What goes wrong:** An employer clicks "Unlock Profile," the Stripe payment succeeds, but the webhook notification arrives after the user has already navigated away. Or the payment fails but the profile is temporarily shown (optimistic UI). Or the employer pays, sees the profile, and then disputes the charge -- and the profile access is not revoked.

**Why it happens:**
- Stripe webhooks are asynchronous and can be delayed by seconds or even minutes
- Developers implement optimistic unlocking (show profile immediately on client-side payment confirmation) without waiting for server-side webhook verification
- No idempotency handling -- double-clicking "Unlock" creates duplicate charges
- Dispute/refund handling is not implemented, so paid-for access is never revoked

**Prevention:**
1. **Webhook-first unlock pattern:** Do NOT unlock the profile on client-side payment confirmation. Instead:
   - Client initiates Stripe Checkout or Payment Intent
   - Client receives `payment_intent.succeeded` -- show "Processing..." state
   - Server receives `payment_intent.succeeded` webhook -- creates record in `candidate_unlocks` table
   - Client polls or uses WebSocket to detect unlock completion
   - Only THEN show full profile
2. **Idempotency keys:** Pass idempotency keys with Stripe API calls. Check for existing unlock records before creating new charges.
3. **Dispute/refund handling:** Listen for `charge.disputed` and `charge.refunded` webhooks. On dispute, optionally revoke access (business decision) and flag the employer account.
4. **Unlock record schema:** Store unlock records with `payment_intent_id`, `payment_status`, `unlocked_at`, `revoked_at`. This provides a full audit trail.
5. **Test the unhappy paths:** Test payment failure, webhook timeout, duplicate payment, and refund scenarios before launch.

**Phase mapping:** Payment integration phase. The unlock record schema should be designed during the foundation phase (database schema), but the Stripe integration and edge case handling belongs in the payment phase.

---

### Pitfall 9: Magic Link Auth Becomes an Attack Vector for Account Takeover

**What goes wrong:** The magic link authentication system (per the 01-magic-link-auth.md spec) is implemented correctly for basic flow, but edge cases allow account takeover. Specifically: email enumeration reveals which employers have accounts, allowing targeted phishing. Or the magic link token is logged in plaintext in server logs, CDN access logs, or browser history.

**Why it happens:**
- Magic links put the full authentication token in the URL, which gets logged by middleware, CDN, and browser history
- The "always return success" pattern (to prevent enumeration) is not consistently applied across all endpoints
- Shared email inboxes in law firms mean magic links can be accessed by unauthorized staff
- Email forwarding rules can silently redirect magic links to unintended recipients

**Prevention:**
1. **Token-in-URL is a display token only:** The URL contains a short-lived display token. The actual verification requires a POST request with the token, not a GET. This prevents pre-fetch bots and logged URLs from consuming the token. (The spec already recommends this -- enforce it.)
2. **Scrub tokens from logs:** Configure middleware and logging to redact URL query parameters or path segments containing tokens.
3. **Short expiry is critical:** The 10-minute expiry in the spec is appropriate. Do not extend it for "convenience."
4. **IP binding as defense-in-depth:** The spec mentions optional IP validation. Implement it -- require that the IP requesting the magic link matches the IP that clicks it. Log mismatches as suspicious.
5. **Rate limit verification attempts:** The spec limits magic link requests, but also limit verification attempts (e.g., 10 failed verifications per IP per hour) to prevent brute-forcing tokens.

**Phase mapping:** Foundation phase (authentication). These mitigations should be in the initial auth implementation, not added later as "hardening."

---

### Pitfall 10: AI Matching Scores Are Opaque and Untestable

**What goes wrong:** Claude API returns a match score and a brief explanation, but there is no way to understand, debug, or improve the scoring. An employer complains that a clearly perfect candidate scored 60% while a mediocre match scored 85%. The team cannot explain why because the matching is a black box. Worse, changing the prompt slightly (to "fix" one case) breaks scoring for other cases.

**Why it happens:**
- The matching prompt is a single monolithic instruction that handles all scoring logic
- No ground truth dataset exists for testing match quality
- Score calibration is never validated -- does "85%" mean the same thing across different jobs?
- Claude's scoring varies with prompt wording, context window content, and even random seed

**Prevention:**
1. **Decomposed scoring with explicit rubric:** Instead of asking Claude for a single score, break matching into scored dimensions: specialization match (0-100), experience match (0-100), technology domain match (0-100), location match (0-100). Combine with explicit weights. This makes scoring debuggable and adjustable.
2. **Store the full reasoning:** Save Claude's complete match reasoning, not just the score. Admin should be able to see WHY a score was assigned.
3. **Golden test set:** Create 10-20 candidate-job pairs with expected match outcomes (high/medium/low). Run these as regression tests whenever the matching prompt changes.
4. **Score normalization:** Normalize scores within a job's candidate pool rather than using absolute scores. "Rank 3 of 15 matches" is more meaningful than "78% match."
5. **Admin override capability:** Let admin adjust scores or flag incorrect matches, creating training data for future prompt improvements.

**Phase mapping:** Job matching phase. The decomposed scoring rubric should be designed before implementation. The golden test set should be created during implementation.

---

## Minor Pitfalls

Mistakes that cause annoyance, rework, or suboptimal user experience.

---

### Pitfall 11: Batch CV Upload UX Creates Admin Frustration

**What goes wrong:** Admin uploads 95 PDFs at once. The system processes them sequentially, takes 30+ minutes, and provides no progress feedback. If the process fails on PDF #47, it is unclear which CVs succeeded and which need re-uploading. The admin uploads the full batch again, creating 46 duplicate profiles.

**Prevention:**
1. **Progress tracking:** Show per-file status (queued, processing, completed, failed) in real-time.
2. **Idempotent upload:** Detect duplicate CVs by file hash. Warn before creating duplicate profiles.
3. **Partial failure handling:** Each CV processes independently. Failures do not block subsequent CVs.
4. **Background processing with status page:** Upload triggers a background job. Admin can close the browser and check back later.

**Phase mapping:** CV parsing phase. Build the upload UX to handle the initial 95-PDF batch gracefully.

---

### Pitfall 12: Employer Search Expectations Mismatch

**What goes wrong:** Employers expect LinkedIn-style instant search with autocomplete, faceted filters, and "smart" suggestions. The platform delivers a basic form with text inputs and exact-match filtering. An employer searches for "patent prosecution biotech" and gets zero results because no candidate has that exact phrase, even though many have both specializations.

**Prevention:**
1. **Faceted search with counts:** Show filter options with candidate counts (e.g., "Patent Prosecution (34), Trademark (21)"). This guides employers to productive searches.
2. **OR-based multi-select for specializations:** Allow selecting multiple specializations and technology domains with OR logic (not AND by default).
3. **Fuzzy/partial matching:** Use PostgreSQL full-text search with stemming, not LIKE queries. "Biotech" should match "biotechnology."
4. **Empty state guidance:** When a search returns zero results, suggest relaxing specific filters rather than showing a blank page.

**Phase mapping:** Search and browse phase. Search UX patterns should be designed before implementation.

---

### Pitfall 13: Candidate Self-Registration Creates Data Quality Divergence

**What goes wrong:** Agency-uploaded CVs go through Claude parsing and admin review, producing high-quality structured data. Self-registered candidates fill out a form manually, entering inconsistent data (free-text specializations instead of controlled vocabulary, vague experience descriptions). Or they upload a CV that parses differently from the form they filled out, creating conflicting data.

**Prevention:**
1. **Controlled vocabulary for all structured fields:** Self-registration form uses dropdowns/multi-select for specializations, bar admissions, and technology domains -- the same controlled vocabulary used by the parser.
2. **CV upload as primary, form as secondary:** Encourage self-registered candidates to upload their CV, which goes through the same parsing pipeline. The form pre-fills from parsed data, and the candidate corrects/confirms.
3. **Same data model, same validation:** Whether data enters via parsing or form, it passes through the same validation layer before storage.

**Phase mapping:** Candidate self-registration phase. Design the controlled vocabulary during the CV parsing phase so it is ready for reuse.

---

### Pitfall 14: Anonymized Profile IDs Enable Tracking Across Sessions

**What goes wrong:** The platform uses predictable or sequential candidate IDs in URLs (e.g., `/candidates/42`). An employer notes the IDs of interesting anonymized profiles, shares them with colleagues at another firm, and they can view the same anonymized profiles. If the IDs are sequential, employers can enumerate all candidates by iterating through IDs. Worse, if the ID persists after unlock, an employer who unlocks on their personal account could share the specific profile URL with their entire firm.

**Prevention:**
1. **UUIDs, not sequential IDs, in URLs:** Use UUIDs for all candidate-facing identifiers.
2. **Session-scoped anonymous identifiers:** Consider using session-scoped or employer-scoped profile identifiers that differ between employers. Employer A sees profile "abc-123" while Employer B sees the same candidate as "def-456." This prevents cross-employer profile sharing.
3. **Unlock tied to employer account, not URL:** Full profile access checks the logged-in employer's unlock records, not just the URL. A shared URL shows the anonymized version to non-paying users.
4. **Rate limit profile access:** Detect and throttle rapid sequential access patterns that suggest enumeration.

**Phase mapping:** Core platform phase (profile display and URL design). UUID usage must be in the initial schema.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Database Schema / Foundation | Payment bypass via client-side anonymization (#3) | Design two separate query paths for anonymized vs. full profiles at the schema level |
| Database Schema / Foundation | GDPR non-compliance (#4) | Include consent tracking, soft-delete, and data export capability in initial schema |
| Database Schema / Foundation | Search performance (#7) | Design junction tables and indexes for query patterns, not just storage |
| Authentication | Magic link security gaps (#9) | Implement all security measures from spec, add IP binding and log scrubbing |
| CV Parsing | Silent parsing errors (#1) | Build confidence scoring and admin review queue; test with real PDFs immediately |
| CV Parsing | PDF extraction failures (#6) | Build image/OCR fallback path; test with actual CV batch early |
| CV Parsing Batch Upload | Admin UX frustration (#11) | Progress tracking, idempotent uploads, partial failure handling |
| Profile Display / Browse | Anonymization data leaks (#2) | Generalize identifying fields; apply k-anonymity thinking to IP law context |
| Profile Display / Browse | Profile ID enumeration (#14) | UUIDs in URLs; unlock checks on every full profile request |
| Search | Employer search UX mismatch (#12) | Faceted search, OR logic, full-text search with stemming |
| Payment / Stripe | Race conditions and bypasses (#8) | Webhook-first unlock pattern; idempotency keys; refund handling |
| Job Matching | API cost spiral (#5) | Two-stage architecture: PostgreSQL pre-filter then Claude API for shortlist only |
| Job Matching | Opaque scoring (#10) | Decomposed rubric with stored reasoning; golden test set for regression |
| Candidate Self-Registration | Data quality divergence (#13) | Shared controlled vocabulary; CV-first data entry flow |

## Cross-Cutting Concerns

These pitfalls compound each other. Addressing them in isolation is insufficient:

- **Pitfall #1 (parsing accuracy) feeds Pitfall #5 (matching costs):** Bad parsed data means matching produces bad results, prompting more API calls to "fix" scoring or manual re-matching.
- **Pitfall #2 (anonymization leaks) undermines Pitfall #3 (payment gating):** If anonymized profiles are identifiable, payment gating is pointless regardless of API security.
- **Pitfall #4 (GDPR) affects every phase:** Data deletion must cascade through parsing results, match scores, unlock records, and file storage. This is only possible if every phase builds with deletion in mind.
- **Pitfall #7 (search performance) and Pitfall #12 (search UX) are two sides of the same coin:** Good UX requires fast queries, and fast queries require schema design for search patterns.

## Sources

- Training knowledge of recruiting platform architecture patterns (MEDIUM confidence)
- Training knowledge of Stripe webhook patterns and payment edge cases (HIGH confidence -- well-documented patterns)
- Training knowledge of GDPR requirements for recruiting/HR platforms (MEDIUM confidence -- legal specifics may have evolved)
- Training knowledge of LLM-based document parsing pitfalls (MEDIUM confidence -- based on known patterns with Claude API for structured extraction)
- Training knowledge of PostgreSQL search optimization patterns (HIGH confidence -- stable, well-documented)
- Project-specific context from PROJECT.md and 01-magic-link-auth.md specifications (HIGH confidence -- direct source)

**Note:** WebSearch was unavailable during this research session. All findings are based on training knowledge and project context. Recommend validating GDPR-specific requirements with a legal professional, and Claude API cost estimates with current Anthropic pricing documentation.
