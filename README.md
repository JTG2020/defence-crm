# Requirement Desk

Defence contract CRM. Front of the funnel: **Leads** captured from a call, WhatsApp, referral,
GeM, a portal or a direct enquiry, moved through stages and followed up. Behind them, the tender
machinery: requirements with line-item coverage, OEM sourcing, quotes, orders, PDI, delivery,
payments, commission, documents and follow-ups. Next.js App Router (TypeScript strict) on Supabase
(Postgres, Auth, RLS). Planning and evidence live in `docs/`; start with `docs/PLAN.md`.

## Local development

```bash
npm install
npm test          # 46 vitest tests
npm run typecheck
npm run lint
npm run sql:check # parse-check every SQL file with the Postgres grammar
npm run dev   # http://localhost:3000
```

Environment (`.env`, never committed):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# optional, server-side only, used by the /data probe to read past RLS:
# SUPABASE_SECRET_KEY=sb_secret_...
```

The app reads these server-side only (middleware, Server Components, Server Actions). They are not
`NEXT_PUBLIC_`, so nothing is exposed to the browser. Do not put a secret key in a `NEXT_PUBLIC_`
variable.

## Database setup (once, in the Supabase SQL editor)

1. Apply the schema: run the whole of `supabase/apply_all.sql` (migrations `0001`-`0016`, in order).
2. Seed demo data: run `supabase/demo/003` through `supabase/demo/013` in order. Do **not** run
   `demo/001` or `demo/002` on a fresh schema - they create a throwaway `requirements` table that
   `0001` already defines.
3. Apply `migrations/0006` before creating users (its trigger writes the `profiles` row that RLS
   reads for the role).
4. Authentication -> Users -> Add user (email + password, tick "Auto Confirm User").
5. Authentication -> Sign In / Providers -> Email: turn **off** "Allow new users to sign up"
   (invite-only).

## Deploy to Vercel

The app is a standard Next.js project; nothing runs at build time against the database (pages are
`force-dynamic`), so the build does not need the database to be reachable.

### Option A - Git integration (recommended)

1. Push the repository to GitHub/GitLab/Bitbucket. **Make it private first** - `docs/` contains the
   client's planning documents.
2. Vercel: **Add New -> Project -> Import** the repository.
3. Framework preset: **Next.js** (auto-detected). Leave Build Command `npm run build`, Install
   Command `npm install`, Output default.
4. **Environment Variables** - add for Production (and Preview):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. **Deploy.**
6. Add a custom domain under Project -> Settings -> Domains if required.

### Option B - Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add SUPABASE_URL production
vercel env add SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_URL preview
vercel env add SUPABASE_PUBLISHABLE_KEY preview
vercel --prod
```

### After deploying: point Supabase at the URL

Supabase Dashboard -> Authentication -> **URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: add `https://<your-app>.vercel.app/**` (and the preview URLs, e.g.
  `https://*-<team>.vercel.app/**`, if you use them).

Email/password sign-in does not redirect, but password-reset and any emailed links use the Site URL,
so it must be correct.

### Verify the deployment

1. `GET /` redirects to `/login` when signed out (middleware gate):
   `curl -sI https://<your-app>.vercel.app/ | head -1` -> a `307`.
2. Sign in with the Supabase user; **Today** loads with the seeded rows.
3. Open **/data** - it should read "Connected - N rows" (this page reads as the signed-in session,
   so it is the honest test of auth + RLS).

## Preview mode - no sign-in (default)

Sign-in is **off by default** so the deployed demo is usable without credentials: `proxy.ts` only
requires a session when `AUTH_REQUIRED=true`. Because the proxy's env is inlined at build time, set
`AUTH_REQUIRED` in Vercel **and redeploy** to take effect.

To let an anonymous visitor read and write the data, run the anon policies:

In the Supabase SQL editor, run ONE of:
   - `supabase/demo/011_preview_anon_read.sql` - **read-only** preview (SELECT only).
   - `supabase/demo/012_preview_anon_write.sql` - **read + insert + update** (includes read). Use
     this when judges need to create and edit records.

**WARNING:** either block exposes the rows to **anyone with the URL**, and `012` lets anyone who has
it **change** the data. Use it only on a private or Deployment-Protected deployment, on demo data,
and remove it when the demo is over. Neither block creates a DELETE policy, so rows cannot be
removed. `audit_log` and `profiles` stay closed.

**Restoring demo data:** the seeds are idempotent - re-run `supabase/demo/003` through `010` to top
the data back up after judges have edited it.

**To restore invite-only sign-in:** remove `AUTH_DISABLED` in Vercel and redeploy, and run the
reverse statements at the bottom of the block you applied (they drop the `anon_read` / `anon_insert`
/ `anon_update` policies and revoke the grants).

## Scheduling the reminder job (pending)

The follow-up generator (`public.generate_followup_tasks()`) runs only when you press **Run reminders
now** on the Follow-ups screen. To run it daily, either enable `pg_cron` in Supabase or add a Vercel
Cron entry that calls the same function. This is deferred and tracked as **P1** in `docs/PLAN.md`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Redirect loop to `/login` | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` missing for that environment, or cookies blocked |
| Page shows "Configuration missing: SUPABASE_URL" | the env var is not set for the environment you deployed |
| Sign-in works but screens are empty | the user has no `profiles` row (apply `0006` then insert the profile) or the role's RLS hides the rows |
| Build fails on Node version | set the Vercel Node version to 20.x or 22.x (Next 16 needs Node 20+) |
| SQL error `column ... already exists` | `apply_all.sql` was run twice; use `supabase/reset.sql` then re-run once |

## Repository layout

- `app/` - routes; `app/(app)/` is the authenticated shell, `app/login` is outside it.
- `components/` - UI primitives and shared pieces; `lib/data/` - the database repository and server actions.
- `lib/supabase/` - server client, auth actions, config, and the data-check probe.
- `supabase/` - all SQL: `migrations/`, `demo/`, `apply_all.sql`, `reset.sql`.
- `docs/` - PRD, plan, assumptions, data map, UI spec, test plan, worklog, report.
- `.kilo/skill/ui-completeness/` - the reusable UI-completeness skill used to build the screens.
