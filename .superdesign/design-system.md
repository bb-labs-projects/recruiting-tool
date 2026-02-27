# Cromwell Chase - Design System v2

## Product Context

AI-powered recruiting platform for IP lawyers. Three roles: Admin (operational tool, high density), Employer (browse/unlock candidates, scannable), Candidate (upload CV, edit profile, simple).

## The One Bold Decision

**The signature**: A confident dark navy header/sidebar system with a single brand color - **Cromwell Chase Teal** (oklch 0.72 0.10 195) - used ONLY for the primary CTA and active states. Everything else is grayscale. This creates instant recognition: "the navy UI with the teal buttons." Teal = precision, trust, legal authority. Not purple-blue-generic-SaaS.

---

## Typography

**ONE typeface family: Geist** (by Vercel) for everything.
- Geist Sans for headings and body
- Geist Mono for data, scores, counts, metadata, timestamps

Why Geist: It has personality (slightly narrow, technical feel) without being trendy. The mono variant gives data screens real character and functional alignment.

### Type Scale
| Role | Font | Size | Weight | Tracking | Usage |
|------|------|------|--------|----------|-------|
| Display | Geist Sans | 32px | 600 | -0.03em | ONE per page. The anchor. |
| H2 | Geist Sans | 18px | 600 | -0.01em | Section headings |
| Body | Geist Sans | 14px | 400 | 0 | Default text |
| Overline | Geist Mono | 11px | 500 | 0.08em, uppercase | Section labels, category headers |
| Data | Geist Mono | 14px | 500 | 0 | Scores, counts, percentages, tabular |
| Metric | Geist Mono | 28px | 600 | -0.02em | Dashboard numbers |
| Caption | Geist Sans | 12px | 400 | 0 | Muted secondary text |

---

## Color - Minimal and Semantic

### Core Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(0.98 0 0)` | Page background. Flat. No gradients. No dots. |
| `--foreground` | `oklch(0.12 0 0)` | Near-black text |
| `--surface` | `oklch(1 0 0)` | Card/panel backgrounds (white) |
| `--surface-muted` | `oklch(0.96 0 0)` | Alternate row bg, section bg, secondary surface |
| `--border` | `oklch(0.90 0 0)` | Borders. 1px. That's it. |
| `--muted` | `oklch(0.55 0 0)` | Secondary text, placeholders |
| `--brand` | `oklch(0.72 0.10 195)` | THE color. Cromwell Chase teal. CTAs only. |
| `--brand-hover` | `oklch(0.66 0.10 195)` | Hover on brand |
| `--dark` | `oklch(0.22 0.04 250)` | Header, admin sidebar, navy surfaces |
| `--dark-surface` | `oklch(0.28 0.04 250)` | Slightly lighter navy for hover in dark areas |

### Status Colors (tuned to brand, not framework defaults)
| Status | Color | Note |
|--------|-------|------|
| Active/Matched | `oklch(0.55 0.14 155)` | Darker teal-green, not emerald |
| Pending/Partial | `oklch(0.70 0.14 85)` | Warm amber, distinct from brand teal |
| Rejected/Unmet | `oklch(0.55 0.16 20)` | Muted red, not screaming rose |
| New/Info | `oklch(0.55 0.10 250)` | Cool blue-gray |

### Color Rules
- Brand teal appears ONLY on: primary CTA buttons, active nav indicator, selected states
- Everything else is grayscale (black, white, grays)
- Status colors appear ONLY on status indicators (small dots, text color) - never as card backgrounds
- No gradient fills on anything. Flat colors only.

---

## Layout Philosophy

### Not Everything Is A Card
| Content Type | Container Treatment |
|--------------|-------------------|
| Stat metrics | Borderless. Just the number + label with spacing. Maybe a thin top border as divider. |
| Data tables | No card wrapper. Table sits directly on page bg. Header row has bottom border. |
| Profile cards (browse) | Card with 1px border. The ONLY element that gets a card. |
| Filter sidebar | Background color difference (surface-muted), no border, no shadow |
| Form sections | Just spacing and overline labels. No wrapper. |
| Upload zones | Dashed border on the zone itself. No outer card. |

### Shadows
- ONE shadow definition: `0 1px 3px oklch(0 0 0 / 0.06)` - used ONLY on the browse profile cards
- Everything else: flat. Borders or spacing for separation.
- No hover-lift shadows. Hover changes background color or border color.

### Spacing
- Break the mechanical grid. Tighter inside groups (8px, 12px), generous between sections (40px, 48px).
- Admin pages: tighter spacing, higher density
- Browse/candidate pages: more breathing room

---

## Navigation - Intentional Per Role

### Admin: Dark navy persistent sidebar
- Full-height navy sidebar (oklch 0.22 0.04 250), 240px
- Nav items: Geist Sans 13px, 500 weight. Icon (16px) + label.
- Active: brand teal left border (3px), text becomes white, bg subtly lighter
- Inactive: muted text (oklch 0.55 0 0), hover: text lightens
- No pill shapes. Just text with the teal left accent.

### Employer: Minimal top bar
- Navy header bar (oklch 0.22 0.04 250) full-width
- Left: "Cromwell Chase" wordmark in Geist Sans 600, white
- Center: nav links inline (Browse, Jobs, Saved, Purchases) in Geist Sans 13px, muted white
- Active link: white text + tiny teal dot below (not a pill, not a fill - just a 4px dot)
- Right: user email in muted + avatar initials circle (dark bg, white text, no gradient)

### Candidate: Same top bar structure, different links
- Dashboard, Profile, Upload CV
- Same treatment as employer

### Mobile: slide-out drawer, keep scrollbars visible

---

## Interaction Design

### Animation Rules
- **ONE animation per page maximum** that's decorative
- Everything else is instant or 150ms transition (bg-color, border-color, opacity)
- No: card-rise entrances, stagger delays, floating icons, pulse glows, shimmer sweeps, parallax
- Yes: 150ms hover bg change, 200ms tab underline slide, checkbox fill, page fade (opacity only, 200ms)

### Hover States (reveal information, not elevate)
| Element | Hover Behavior |
|---------|---------------|
| Profile card | Border darkens from oklch(0.90) to oklch(0.80). BG stays same. Show action bar at bottom. |
| Table row | Background shifts to surface-muted. Show inline action links. |
| Stat metric | Nothing. It's static data. |
| Nav item | Text lightens (in dark sidebar) or darkens (in light area). |
| Button (primary) | Background darkens. That's it. |

---

## Page Energy - Each Page Feels Different

### Login: Branded and confident
- Split layout: left half is navy (oklch 0.22 0.04 250) with brand wordmark large + one-line value prop in white. Right half is the form on white. Not a centered card template.

### Employer Browse: Scannable and fast
- Dense. Table-view option alongside card grid. Filters as a horizontal bar of dropdowns (not a sidebar). Results count prominent. Cards are compact, info-dense. Think: searching for apartments on Zillow, not browsing a gallery.

### Admin Dashboard: Dense and operational
- No hero stat cards. Instead: compact metric row at top (inline numbers, not cards). Below: full-width data table as the main element. Sidebar filters/actions. Think: Retool, not marketing dashboard.

### Candidate Profile: Simple and personal
- Clean single-column layout. Sections separated by overline labels and thin borders. Inline edit fields. Minimal chrome. Think: a clean form, not a dashboard.

### Job Matching: Data-forward
- List view (not cards). Each match is a row with: score as a bold colored number (not a ring), candidate info, key tags, action buttons. Expandable row for detail. Think: spreadsheet with good typography.

---

## Match Scores - Functional, Not Decorative

- Kill the SVG score rings. Use: bold Geist Mono number, colored by threshold (green >80, amber >60, red <60)
- Dimension breakdowns: only show on expanded/detail view, not on every card
- Requirement tags: keep, but show max 3 on the card, rest on expand
- Strengths/gaps: detail view only

---

## Empty, Loading, Error States

- **Loading**: Skeleton lines (no shimmer animation - static gray blocks that swap to content). Instant feel.
- **Empty**: Overline label "NO CANDIDATES YET", one line of helpful text, one CTA. No illustration, no floating icon.
- **Error**: Red-tinted overline "SOMETHING WENT WRONG", error text, retry button. Direct.

---

## Copy Principles

- Buttons say what happens: "Unlock Full Profile" not "View Profile". "Find Matches" not "Run Matching".
- Labels are terse: "Candidates" not "Total Candidates". "Revenue" not "Total Revenue from Profile Unlocks".
- Empty states give direction: "Upload your first CV to get started" not "No data available".

---

## What This Design System Does NOT Have

- Dot grid backgrounds
- Gradient borders or fills
- Card-lift hover animations
- Animated SVG score rings
- Stagger entrance animations
- Shimmer/sweep effects
- Purple/blue brand color
- DiceBear or gradient avatars
- Bento grid layouts
- Rounded-2xl anything (max border-radius: 8px for cards, 6px for buttons)
