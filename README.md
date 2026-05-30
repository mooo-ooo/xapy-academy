# Kiyotaka Academy

A multilingual trading-education platform — public Academy (landing, modules,
articles, search, glossary), an admin panel (users, content, translations,
localization, settings), a CTV side-by-side translation workflow, and a
full SEO + GEO (AI-search) surface.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components, Turbopack) |
| Language | TypeScript (strict) |
| Database | MySQL 8 + Prisma ORM |
| Auth | Auth.js v5 (Credentials + optional Google OAuth), JWT sessions |
| UI i18n | `next-intl` (`localePrefix: 'always'`), DB-backed dynamic locales |
| Content | MDX stored in MySQL, rendered server-side; one row per locale |
| Styling | Tailwind CSS + in-tree shadcn-style primitives, `next-themes` (dark default) |
| Editor | Tiptap → Markdown/MDX |

## Prerequisites

- Node.js 20.9+ (22 recommended)
- pnpm 10 (`corepack enable` then `corepack prepare pnpm@10 --activate`)
- MySQL 8 running locally (Laragon, Docker, or a managed instance)

For the Docker path you only need Docker + Docker Compose.

## Quick start (development)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure env
cp .env.example .env
#    Edit .env: set DATABASE_URL, AUTH_SECRET (openssl rand -base64 32),
#    and SITE_URL (http://localhost:3000 in dev).

# 3. Create the database (once), then apply migrations
#    CREATE DATABASE academy_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
pnpm db:migrate          # prisma migrate dev — creates tables + generates client

# 4. Seed the first admin (prints a one-time password — save it)
pnpm db:seed
pnpm db:seed:demo        # optional: 1 demo article (EN+VI) + trending tags

# 5. Run the dev server
pnpm dev
```

Open http://localhost:3000 — it redirects to `/en/academy`. Sign in at
`/en/login` with the seeded admin to reach `/en/admin`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | MySQL connection string |
| `AUTH_SECRET` | yes | 32+ byte random; `openssl rand -base64 32` |
| `SITE_URL` | yes (prod) | Canonical absolute origin for all SEO URLs (sitemap, robots, llms.txt, canonical/hreflang, JSON-LD, OG). Falls back to `http://localhost:3000` — **must** be your real https origin in production |
| `NEXT_PUBLIC_SITE_URL` | recommended | Same value, exposed to the browser |
| `AUTH_URL` | prod | Canonical app URL (e.g. `https://yourdomain.com`) |
| `AUTH_TRUST_HOST` | prod | `true` when behind a proxy / in a container |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Enables the Google sign-in button when both are set |
| `PUBLIC_LOCALE` | optional | Locale guests are forced onto (default `en`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` | optional | First admin identity for `pnpm db:seed` |
| `SMOKE_EMAIL` / `SMOKE_PASSWORD` | dev only | Used by the smoke tests to log in |

See `.env.example` for the annotated template.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build (needs `DATABASE_URL` reachable — it prerenders DB-backed routes) |
| `pnpm start` | Serve the production build (`next start`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | `prisma migrate dev` (create + apply a migration in dev) |
| `pnpm db:migrate:deploy` | `prisma migrate deploy` (apply pending migrations in prod) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Prisma Studio (DB GUI) |
| `pnpm db:seed` | Seed site settings + the first admin (+ base modules) |
| `pnpm db:seed:demo` | Seed a demo article + trending tags |

There is no `lint` script (ESLint is intentionally not configured); `pnpm
typecheck` + `pnpm build` are the gates.

## Production deployment

In every production environment set, at minimum: `DATABASE_URL`, `AUTH_SECRET`,
`SITE_URL` (your real https origin), `AUTH_URL`, `AUTH_TRUST_HOST=true`.
Getting `SITE_URL` wrong is the single most common SEO mistake — every
canonical, hreflang, sitemap and JSON-LD URL is built from it.

### Option A — Docker Compose (app + MySQL)

Brings up MySQL 8 and the app together. The app image applies pending
migrations on start, then runs `next start`.

```bash
cp .env.example .env
# In .env set: AUTH_SECRET, SITE_URL (https://yourdomain.com), AUTH_URL,
# AUTH_TRUST_HOST=true, MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD.
# (DATABASE_URL is set automatically by compose to point at the `db` service.)

docker compose up -d --build
```

Create the first admin on first boot by setting `SEED_ON_START=true` in `.env`
before the first `up` — the generated password is printed once in the app logs:

```bash
docker compose logs -f app
```

Uploaded images persist in the `uploads` volume; database data in `db_data`.
Put a TLS-terminating reverse proxy (nginx, Caddy, Traefik) in front of port
3000 for HTTPS.

### Option B — Manual Node (VPS with existing MySQL)

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:deploy          # apply migrations
pnpm build                      # DATABASE_URL must be reachable here
pnpm db:seed                    # first deploy only — prints the admin password
pnpm start                      # serves on PORT (default 3000)
```

Run `pnpm start` under a process manager (PM2, systemd) behind a reverse proxy
that terminates TLS and forwards to `127.0.0.1:3000`. Uploaded images live in
`public/uploads/` — back this directory up / mount it on persistent storage.

## SEO / GEO surface

Built-in and emitted automatically:

- `/[locale]/...` pages with per-page `generateMetadata`: canonical +
  `hreflang` alternates (incl. `x-default`) + OpenGraph + Twitter.
- One JSON-LD `@graph` per page with shared `@id`s — `Organization`,
  `WebSite`, `WebPage`, `Article` (co-typed `LearningResource`, with a real
  `Person` author + `dateModified` + `wordCount` + `timeRequired` +
  `keywords` + glossary `DefinedTerm` mentions), `BreadcrumbList`,
  `DefinedTermSet`, `ProfilePage`, `CollectionPage`/`ItemList`.
- `/sitemap.xml` — multilingual with `xhtml:link` + `x-default`.
- `/robots.txt` — welcomes current AI crawlers; allows the Markdown mirror.
- `/llms.txt` + a clean Markdown mirror of every article at
  `/api/articles/<locale>/<module>/<slug>` (linked from the article `<head>`).
- Generated OpenGraph images (site + per-article) with an embedded
  Vietnamese-capable font.
- E-E-A-T author profiles at `/[locale]/authors/[slug]` (set bio / job title /
  links / topics in the admin user editor; only authors with a published
  article get an indexable page).

## Admin & auth

- Roles: `ADMIN` (full), `CTV` (assigned translations), `USER` (reader).
- Admin panel at `/[locale]/admin` (guarded at layout + action level).
- Content i18n is separate from UI i18n: article/module/tag translations live
  in the DB; UI strings are editable at `/admin/localization/ui-strings`, and
  locales can be added at runtime (`/admin/localization/locales`) with no rebuild.
- Guests are forced onto `PUBLIC_LOCALE`; authenticated users read any enabled
  locale.

## Smoke tests

With a dev/prod server running on `:3000` and `SMOKE_PASSWORD` set to the
seeded admin password:

```bash
pnpm tsx tools/smoke-phase8.ts   # SEO/GEO surface (no login needed)
pnpm tsx tools/smoke-phase6.ts   # sitemap / robots / llms.txt / OG
SMOKE_PASSWORD="..." pnpm tsx tools/smoke-phase3.ts   # authed reading flows
```

## Troubleshooting

- **`pnpm build` fails with a Prisma connection error** — the build prerenders
  DB-backed routes, so `DATABASE_URL` must be reachable during the build (the
  build degrades gracefully if the DB is merely empty, but not if it's
  unreachable; the Docker image build tolerates a missing DB).
- **`prisma generate` EPERM on Windows** — a running `next dev` / `next start`
  holds the query-engine DLL. Stop it, then re-run `pnpm db:generate`.
- **OG images / canonical URLs point at `localhost`** — `SITE_URL` is unset in
  the running environment.
