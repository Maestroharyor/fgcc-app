<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## 1 · Next.js 16 quick-reference

| Concept | v16 reality | Local doc |
|---|---|---|
| Auth gate | `src/proxy.ts` (not `middleware.ts`); exported `proxy()`; Node.js runtime only | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` |
| `cookies()`, `headers()` | **async** — always `await cookies()` | `04-functions/cookies.md` |
| `params`, `searchParams` | **Promises** — `await props.params` | upgrade guide |
| Turbopack | default — no `--turbopack` flag | upgrade guide |
| `getServerSideProps` / `getStaticProps` | removed | — |
| Route types | `bunx next typegen` generates `PageProps<'/route'>` helpers | `cli/next.md` |

Synchronous access to any of the above will throw at runtime, not at build time.

---

## 2 · Stack

- **Bun 1.x** — runtime + package manager (`bun add`, `bun run …`). Lockfile is `bun.lock`.
- **Next.js 16.2.6** App Router with React 19.2 and **React Compiler** enabled (`reactCompiler: true` in `next.config.ts` plus `babel-plugin-react-compiler` devDep).
- **TypeScript 5**, strict mode. Path alias `@/* → src/*`.
- **Biome 2.2** for lint + format (replaces ESLint + Prettier). One config: `biome.json`.
- **Tailwind v4** — CSS-variable theming via `@theme inline` in `src/app/globals.css`. No `tailwind.config.js`.
- **HeroUI v3** — provider in `src/components/providers/HeroUIProvider.tsx`. Components import from `@heroui/react`; the provider is from `@heroui/system`.
- **Supabase** — `@supabase/supabase-js` + `@supabase/ssr`. Five client factories under `src/lib/supabase/`.
- **Resend** + `@react-email/components` — transactional email. Always dispatch through `src/lib/email/send.ts`, never `resend.emails.send` directly.
- **Termii** (Nigerian SMS) via generic numeric route. Always go through `src/lib/sms/termii.ts`.
- **ExcelJS** for `.xlsx` exports — NOT `xlsx`/SheetJS (open CVEs + license change as of 2026).
- **jsPDF + jszip** for printable lists and certificates.
- **qrcode** for QR generation, on demand (not stored).
- **Vitest 4** for tests. **Co-located** `*.test.ts` next to source. No component tests.

---

## 3 · Project structure

```
src/
  proxy.ts                 # auth gate (NOT middleware.ts)
  app/
    layout.tsx             # fonts + HeroUIProvider
    globals.css            # Tailwind v4 @theme tokens + form-input
    page.tsx               # / church coming-soon with SkillUp 1.0 teaser
    auth/callback/route.ts # Supabase magic-link callback
    (marketing)/
      layout.tsx           # site chrome
      skillup/
        page.tsx           # /skillup hub
        tracks/page.tsx
        schedule/page.tsx
        facilitators/page.tsx
        faq/page.tsx
        register/
          page.tsx
          actions.ts       # 'use server' registerSelf / registerOthers
          success/page.tsx
        feedback/
          page.tsx
          actions.ts
    (admin-public)/admin/login/page.tsx   # NO auth gate
    (admin)/admin/                        # gated by requireRole in layout
      layout.tsx
      dashboard/page.tsx
      registrations/{page.tsx,[id]/page.tsx}
      tracks/page.tsx
      checkin/page.tsx
      feedback/page.tsx
      sms/page.tsx                        # superadmin
      certificates/page.tsx               # superadmin
    api/
      register/check/route.ts
      feedback/route.ts
      admin/{stats,export,checkin,sms/broadcast,certificates/{generate,send,download}}/route.ts
      cron/reminders/route.ts             # Vercel Cron, Bearer CRON_SECRET
  components/
    ui/                    # CountdownTimer, TrackCard, FAQItem, …
    forms/                 # RegistrationForm, FeedbackForm, LoginForm
    admin/                 # AdminSidebar, RegistrationsTable, …
    providers/HeroUIProvider.tsx
  content/
    tracks.ts              # the 20 tracks (codes, glyphs, WhatsApp links)
    {faqs,schedule,facilitators}.ts
  emails/                  # React Email templates
  lib/
    supabase/{server,route,browser,proxy,admin}.ts
    auth/require-role.ts
    db/{tracks,registrations,waitlist,feedback,types}.ts
    email/{client,send}.ts
    sms/termii.ts
    qr/generate.ts
    pdf/{certificate,printable-list}.ts
    excel/export.ts
    csv/export.ts
    ref-code/generate.ts
    validation/schemas.ts
    utils/{cn,date,env}.ts
  test/
    mocks/{supabase,resend,termii}.ts
    fixtures/tracks.ts
supabase/migrations/        # 000_init, 001_rls, 002_seed_tracks
vitest.config.ts
vitest.setup.ts
vercel.json                 # cron schedules
```

Route groups:
- `(marketing)` — chrome + public pages.
- `(admin-public)` — `/admin/login` only (no auth gate, sibling group).
- `(admin)` — every other `/admin/*` page; layout calls `requireRole` first.

---

## 4 · Environment

Read + validated in `src/lib/utils/env.ts` (Zod). Keys:

```
NEXT_PUBLIC_SUPABASE_URL          # required for real DB
NEXT_PUBLIC_SUPABASE_ANON_KEY     # required for real DB
SUPABASE_SERVICE_ROLE_KEY         # server-only; used by cron + admin invitations
RESEND_API_KEY                    # if missing, send.ts no-ops cleanly
RESEND_FROM                       # default provided
ADMIN_NOTIFICATION_EMAILS         # comma-separated; empty = no admin alerts
TERMII_API_KEY                    # if missing, sms.ts no-ops cleanly
TERMII_SENDER_ID                  # default "SKILLUP"
CRON_SECRET                       # protects /api/cron/reminders
NEXT_PUBLIC_SITE_URL              # absolute origin used in emails
NEXT_PUBLIC_EVENT_START_ISO       # countdown target
```

The runtime is forgiving: missing keys produce empty-result fallbacks rather than crashes, so the dev server boots even with `.env.local` not configured. **Prod absolutely needs Supabase + Resend + CRON_SECRET set.**

---

## 5 · Database & RLS

Three migrations live under `supabase/migrations/`. Apply via Supabase SQL editor or `supabase db push`. Order: `000_init.sql` → `001_rls.sql` → `002_seed_tracks.sql`.

- Extensions: `pgcrypto`, `citext`.
- Tables: `tracks`, `registrations`, `batches`, `waitlist`, `feedback`, `user_roles`, `zone_churches`.
- View: `v_track_capacity` joins `tracks` with live `count(*)` from `registrations` — public-readable for the stats widget.
- Trigger: `generate_reference_number()` on `registrations` INSERT — creates per-track sequences lazily and emits `SKU-{TRACK_CODE}-{NNN}`.
- Helper fn: `public.has_role(text)` used inside every RLS policy.

RLS is **ON for every table**. Anon can INSERT into `registrations`, `waitlist`, `feedback`. Admin reads; superadmin deletes / mutates `user_roles`.

---

## 6 · Conventions

- **Server Actions** live in `actions.ts` alongside their page. File-level `"use server"`. Always re-validate input with Zod from `src/lib/validation/schemas.ts` — never trust the client parse. Returns `{ ok, error?, message?, … }` shape; `redirect()` only on terminal navigations.
- **Route handlers** that mutate or read protected data call `await requireRole('admin'|'superadmin')` first. UI hiding is UX only — never a security boundary.
- **DB access** goes through `src/lib/db/*` helpers. Don't sprinkle raw Supabase calls in pages or actions; the helpers all swallow errors gracefully and return empty arrays / nulls.
- **Emails**: import React Email templates from `src/emails/`, dispatch through `sendXxxEmail` in `src/lib/email/send.ts`. If RESEND_API_KEY is missing, every helper returns `{ ok: false, error: 'resend-not-configured' }` — never throws.
- **SMS**: `src/lib/sms/termii.ts`. Phone numbers normalised via `normaliseNigerianPhone()` (`08…` → `+234…`). Same graceful-no-op pattern as email.
- **Static content** (FAQs, tracks, schedule, facilitators) lives in `src/content/*.ts`. The DB has a `tracks` table but its rows mirror the static catalogue — never the source of truth for marketing copy or WhatsApp links.
- **Reference codes** are generated by the DB trigger. The `src/lib/ref-code/generate.ts` helpers are for parsing + preview only.

---

## 7 · Testing

Test runner: **Vitest 4**. Layout: **co-located** `*.test.ts` next to source. Scope: pure utilities, validation schemas, DB helpers, server actions, route handlers, the proxy. **No component tests.**

Run:
```
bun run test         # vitest run
bun run test:watch   # vitest watch
bun run test:cov     # vitest run --coverage (v8 reporter)
```

Mocking patterns (in `vitest.setup.ts` + per-file `vi.hoisted` / `vi.mock`):

- `next/cache` — `revalidatePath` etc. are global no-op fns.
- `next/navigation` — `redirect(path)` throws `RedirectError(path)`; `notFound()` throws `NotFoundError`; `forbidden()` throws `ForbiddenError`. Assert via `expect(fn()).rejects.toThrow(RedirectError)` or `.toMatchObject({ destination })`.
- `next/headers` — `cookies()` resolves to an in-memory `getAll` / `get` / `set` / `delete` jar.
- `@supabase/ssr` — programmable mock at `src/test/mocks/supabase.ts`. Configure per-table results via `from: { tracks: { data, error, count } | ((chain) => MockResult) }`. Use `chain.filters.some(f => f.method === 'insert')` to differentiate INSERT vs SELECT in the same describe.
- `resend` — pass a fake class for the `new Resend(key)` constructor, or mock `@/lib/email/client`.
- Termii — mock `global.fetch` to return a fake `Response`.

Fixtures: `src/test/fixtures/tracks.ts` (`fixtureTrack`, `fixtureCapacityRow`, `fixtureFullCapacityRow`, `fixtureRegistration`).

---

## 8 · Common tasks

### Add a new admin page

1. Put it under `src/app/(admin)/admin/<slug>/page.tsx` so the gate inherits.
2. Call `await requireRole('admin')` (or `'superadmin'`) at the top.
3. Add a nav entry in `src/components/admin/AdminSidebar.tsx`.
4. Tests only for non-React logic (most page components have none directly).

### Add a new server action

1. Create `actions.ts` next to its page with file-level `"use server"`.
2. Re-validate the payload with Zod from `schemas.ts`.
3. Use DB helpers (don't write raw Supabase queries inline).
4. Call email/SMS dispatchers from `src/lib/email/send.ts` / `src/lib/sms/termii.ts`; wrap in `Promise.allSettled` so a comms hiccup never blocks the user.
5. End with `revalidatePath(...)` then `redirect(...)` for terminal navigations.
6. Write `actions.test.ts` covering: validation failure, happy path, each error branch.

### Add a new email template

1. Create `src/emails/MyEmail.tsx` using `@react-email/components` and the shared `_Layout` wrapper for consistent header/footer.
2. Add a `sendMyEmail(to, props)` dispatcher in `src/lib/email/send.ts`.
3. Add a test case in `src/lib/email/send.test.ts` (parameterised `.each` block).

### Add a new track

1. Edit `src/content/tracks.ts` — append to `TRACKS` with a unique 3-letter code.
2. Edit `supabase/migrations/20260512_002_seed_tracks.sql` to mirror the row (`ON CONFLICT (code) DO UPDATE` makes it safe to re-apply).
3. Optionally add a glyph in `src/components/ui/GlyphIcon.tsx`.

### Run the reminder cron locally

```
curl -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/cron/reminders?kind=3day"
```

Idempotent — already-stamped rows are skipped.

---

## 9 · What NOT to do

- ❌ Don't reintroduce `xlsx` / SheetJS — it has open CVEs and a paid-only license as of 2026. Use ExcelJS.
- ❌ Don't add Prisma or another ORM. Direct Supabase JS client is sufficient.
- ❌ Don't add `middleware.ts`. The gate is `src/proxy.ts`. The matcher excludes static + image assets only.
- ❌ Don't read `cookies()`, `headers()`, `params`, or `searchParams` synchronously — `await` them.
- ❌ Don't call `resend.emails.send` or `fetch('termii…')` directly from a page/action — go through the dispatcher.
- ❌ Don't write WhatsApp/Telegram group links into the DB. They live in `src/content/tracks.ts` so PR review can verify them.
- ❌ Don't put security checks only in the UI. Always also call `requireRole` inside the server action / route handler that does the mutation.
- ❌ Don't write component tests. Tests target pure logic only — pages render in dev and CI smoke checks; component snapshotting adds friction without catching real bugs.
- ❌ Don't use Next.js `<Link>` for hash-only anchor navigation. The App Router's Link sometimes double-stacks the hash (`/skillup#tracks#tracks`) on re-click. Use plain `<a href="/skillup#tracks">` — `scroll-behavior: smooth` on `html, body` and `scroll-margin-top` in `globals.css` handle the UX.
