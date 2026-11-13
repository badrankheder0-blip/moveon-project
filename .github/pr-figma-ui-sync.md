## Sync the website with the M.io Figma file, and make its content editable

Brings the public site in line with the approved Figma frames, makes page photos
and the logo editable (and uploadable to S3) from the admin dashboard, and adds
tooling to keep the site in step with Figma.

This branch is built on `feat/smtp-mailer`, so merging it also merges that
branch's 8 commits (SMTP/Resend mailer, email front end, logo, server-rendered
sign-in, umlaut-free address search).

### Pages
- **Homepage** — frame 139:676: "move on · Go on" hero, services row, values
  (M·O·N), promise, experience photos, How It Works cards, coverage with a real
  map of Germany (Natural Earth, public domain), FAQ with topic chips.
- **Nav bar and footer** (site-wide) — the new quiet nav bar (GET APP, language
  menu) and the dark quiet footer, plus a row for How it works / For business /
  Partner / Guide.
- **Moving** — frame 106:10195. **Cleaning** — 136:319 with the 136:533
  programmes. **Clearance** — no frame; built on the cleaning layout supplied
  for it.
- **Calculator** — every step and result screen audited against its frame.
- **How it works** (3:8708) and **About** (3:8848) — pixel-level fixes.
- `tables.css` is scoped to `.table-wrap`: its bare `table`/`thead th`/`tbody td`
  rules were restyling public tables (comparison, rate table) as admin grids.

### Dashboard and content
- Page photos are content blocks of a new `image` kind: preview, reset to
  default, and upload.
- **Uploads to S3** (`POST /api/site/uploads`): the type is read from the file's
  bytes (JPEG/PNG/WebP/AVIF, no SVG), with an 8 MB cap and a rate limit. Uploads
  are off unless `S3_*` is set; see README → "Photo uploads".
- The **logo** setting is now actually rendered (header, footer, calculator,
  sign-in pages) and uploadable.
- **FAQ entries have a real `category`** (API filter, admin validation).
- A local image path whose file no longer ships falls back to the page's own
  photo, instead of rendering broken.
- Section names in the editor are translated (they showed raw keys).

### Figma tooling
`pnpm figma:check` diffs the Figma version recorded in `design/figma-sync.json`
against the live file; `pnpm figma:mark-synced` moves the marker.
**Note:** file reads for the current token are rate-limited until about 2 Oct.
The homepage (139:676) was built from screenshots of the frame and should be
re-checked with `figma:check` once reads work again.

### Deploying
1. `pnpm db:migrate`:
   - 0005: FAQ category
   - 0006: logo setting default
   - 0007/0008: homepage image rows
   - 0009: chat read state
2. `pnpm --filter @mon/db seed:home` adds the new copy and image rows. Existing
   values are kept.
3. To reset a page to the design's copy, run
   `seed:home --section=<name> --force --prune`. This overwrites dashboard edits
   in that section.
4. Optional: set the `S3_*` env vars to enable photo uploads.

### Testing
- `pnpm turbo run check-types`: 14/14
- `@mon/core` tests: 65/65
- `next build`: compiles
- Each page was run against a throwaway Postgres/Redis stack and screenshotted
  at 1440, with 390 and Arabic RTL checked on the homepage and moving pages.
- The upload, logo and image-fallback paths were tested end to end against an
  S3 mock.

### Dashboard completion
Every live sidebar link now leads to a working screen: 76 public pages (19 × 4
locales) and all dashboard links were checked, with no 404s and no console
errors.

**Staff**
- `/admin/auftraege` — Orders: list plus detail, with permission-gated actions.
  Also fixes the API's second-page 500.
- `/admin/logs` — the audit log: new read-only `/api/audit`.
- `/admin/nachrichten` — a staff inbox with takeover and reply.
- FAQ tab in the Website editor.

**Customers**
- `/dashboard/nachrichten` — Messages, with read state (migration 0009).
- `/dashboard/bewertungen` — Reviews: customers review completed jobs, and
  staff get a moderation tab.

**Site**
- `/kundenstimmen` shows published reviews, so moderation reaches visitors.
- The SEO settings drive page titles and descriptions.
- Contact settings feed the contact page.
- The site has a favicon (the red m.on mark).
- Admin tables fold into cards on phones again.

### Known gaps (not in this PR)
- **Order assignment:** no API or assignee column yet. It belongs with the
  planned Dispatch screen.
- **`seo.defaultDescription`:** it is a single German value, so only `/de`
  uses it. Making it apply to every locale needs a per-locale setting.
- **`/kundenstimmen`:** the rating summary ("4,8", "2.340") is still CMS copy.
  Reviewer names are not shown, because that would need a consent step.
- **Photos to replace (other companies' branding):**
  - About → values photo: "City Movers"
  - About → fleet photo: "UmzugPlus"
  - Homepage → experience team photo: "Express Movers"
- **Clearance "before" photo:** none exists, so the before/after pair on
  `/entsorgung` stays hidden until one is set from the dashboard.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
