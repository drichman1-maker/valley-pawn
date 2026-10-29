# Pawn & resale inventory catalog

A public storefront for a pawn/resale shop's inventory, plus an owner portal for importing
inventory from Excel, managing photos, and restoring earlier versions. React + Vite + Tailwind
on the front end; Supabase (Postgres, Auth, Storage) as the shared database.

## What runs where

| Concern | Where it is enforced |
| --- | --- |
| Who can read which items | Postgres row-level security (`items_public_read`): the public sees `available` and `sold` only |
| Who is an owner | `public.owners` allowlist, checked by `is_owner()` in policies and functions. Signing in is not enough |
| Inventory writes | `publish_import()` / `rollback_inventory()`: one transaction each, owner-checked, re-validated |
| Direct owner edits | Column grants: owners may change only `status` and `featured` directly |
| Photo uploads | Storage policies: owners only, under `items/<item_id>/` |
| Import validation | `src/lib/import/*` in the browser (for the preview) **and** `validate_item_fields()` in SQL |

localStorage holds only the owner's last column mapping (a convenience). It never holds inventory.

## Setup

### 1. Run the demo (no backend)

```bash
cd valley-pawn && npm install
cd valley-pawn && npm run dev:demo
```

`npm run dev:demo` uses the **showcase** profile from `.env.demo`: a sample "Valley Pawn" store
(fictional 555 phone, sample address) with realistic sample listings, for client presentations.
Remove `VITE_DEMO_SHOWCASE=true` from `.env.demo` to get the minimal test fixtures instead.
Demo mode is labeled on every page, uses in-memory sample items with no photos, has no real
sign-in, and loses all changes on reload. It is only active when `VITE_DEMO_MODE=true` **and**
no Supabase variables are set. A configured site never falls back to demo data on errors.

### 2. Create the Supabase project

1. Create a project at supabase.com.
2. **Authentication > Providers > Email:** turn **off** "Allow new users to sign up".
   (Non-owners can't do anything anyway, but there's no reason to allow accounts.)
3. Apply the migrations, either with the Supabase CLI:
   ```bash
   cd valley-pawn && npx supabase link --project-ref YOUR-PROJECT-REF
   cd valley-pawn && npx supabase db push
   ```
   or by pasting `supabase/migrations/20261028000001_inventory.sql` and then
   `20261028000002_storage.sql` into **SQL Editor** and running them in that order.
4. Do **not** run `supabase/seed.sql` on production. It inserts example items for development.

### 3. Add the owner

1. **Authentication > Users > Add user**: enter the owner's email and a strong password.
2. In **SQL Editor**:
   ```sql
   insert into public.owners (user_id, note)
   select id, 'Shop owner' from auth.users where email = 'owner@example.com';
   ```
   Repeat for any additional staff who should publish inventory.
   Remove access with `delete from public.owners where user_id = '...';`.

### 4. Configure the site

```bash
cd valley-pawn && cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings > API). The anon key is
public by design; security comes from the policies above. **Never** put the service-role key in
any `VITE_` variable or anywhere in this repository.

Edit `src/config/shop.js` with the real name, address, phone and hours. Trust claims
("licensed", "phone holds", etc.) only show when added there with `approved: true`.

### 5. Build and deploy

```bash
cd valley-pawn && npm run build
```

#### Vercel (recommended)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New > Project**, import the repository. Framework, build command and output
   directory are picked up from `vercel.json` and the `vercel-build` script. No settings to change.
3. Deploy. **Without** Supabase variables this deploys the labeled *client preview* (sample
   "Valley Pawn" store and inventory, `VITE_DEMO_SHOWCASE`). **With** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` set under **Settings > Environment Variables**, the next deploy is the
   live site. Redeploy after changing variables.

Or from a terminal with the Vercel CLI:

```bash
cd valley-pawn && npx vercel --prod
```

#### Other hosts

Deploy `dist/` to any static host. Item links like `/item/00491` need a single-page-app
fallback to `index.html`: `public/_redirects` handles Netlify and Cloudflare Pages, and
`vercel.json` handles Vercel. Set the two `VITE_SUPABASE_*` variables in the host's build settings.

## Tests

```bash
cd valley-pawn && npm test
```

72 tests: spreadsheet parsing (real .xlsx workbooks generated in the test, quoted/multiline CSV,
TSV), validation and import planning, publish/rollback semantics, photo file checks, and
storefront/owner UI flows in jsdom (deep links, Back/Forward, filters in the URL, draft/archived
not-found, owner gating, the full import → preview → publish flow, stale-preview recovery).

```bash
cd valley-pawn && TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres npm run test:db
```

12 tests that apply the real migrations to PostgreSQL 15+ (with `tests/db/supabase-shim.sql`
standing in for Supabase's `auth`/`storage` schemas) and check: public denial of drafts and
archived items, anonymous and non-owner write denial, storage-policy denial, atomic publish,
all-or-nothing failure, stale-preview rejection, idempotent resubmission, complete-mode archive
binding, and rollback with a recovery point. The database user needs permission to create databases.

Regenerate the import templates in `public/` with:

```bash
cd valley-pawn && npm run template
```

## Project layout

```
src/lib/import/        file reading, headers, column mapping, row validation, import plan
src/lib/inventory/     shared vocabulary, strict value parsers, trusted-side validation
src/lib/backend/       Supabase adapter, demo adapter, in-memory publish/rollback (demo)
src/pages/             storefront pages
src/admin/             owner portal (lazy-loaded; ExcelJS loads only when an .xlsx is opened)
supabase/migrations/   schema, policies, publish/rollback functions, storage policies
tests/                 unit, ui (jsdom), db (PostgreSQL)
docs/OWNER_GUIDE.md    instructions for the shop owner
```

## Still mocked, unconfigured, or untested

- **Not run against a live Supabase project.** The SQL is tested on PostgreSQL 16 with a shim
  for `auth.uid()`, roles and storage tables. Supabase Auth sign-in and real Storage
  uploads/deletes have not been exercised end to end.
- **Photo resizing and upload** (`src/lib/photos/preparePhoto.js`) needs a real browser canvas
  and was not run in automated tests; only the file-type and size checks are tested.
- **Photos of hidden items are viewable by exact URL.** The bucket is public-read with random
  file names, so draft photos can't be listed or guessed, but a leaked link still works. A
  private bucket with signed URLs would close this at the cost of more complexity.
- **Restore covers item details and spreadsheet photo links, not uploaded photos.** A deleted
  uploaded photo cannot be restored (the confirmation dialog says so).
- **Restore points store a full inventory snapshot each time.** At thousands of items this grows
  steadily; prune old `inventory_revisions` rows periodically if storage becomes a concern.
- **Store details are placeholders** until `src/config/shop.js` is filled in.
- **No visual regression or real-device testing.** Layout was checked by screenshots in headless
  Chromium at phone and desktop widths only.
