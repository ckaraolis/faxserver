# Cyprus Company Fax Web App

Internal web app to **send and receive faxes** using your existing Cyprus (+357) company numbers via [Telnyx Programmable Fax](https://developers.telnyx.com/docs/programmable-fax/quickstart).

## Features

- Sign in with email/password
- Inbox for received faxes
- Outbox for sent faxes with status tracking
- Send PDF from a company From number
- Settings page listing configured company numbers

## Stack

- Next.js on **Vercel**
- Postgres on **Supabase**
- PDF files on **Vercel Blob**
- Fax transport via **Telnyx**

## Supabase database setup

In Supabase → **Project Settings → Database → Connection string**:

1. Copy the **Transaction** pooler URI (port `6543`) → `DATABASE_URL`  
   Append `?pgbouncer=true` if it is not already present.
2. Copy the **Session** or **Direct** URI (port `5432`) → `DIRECT_URL`

Then locally:

```bash
npm install
# fill .env with DATABASE_URL, DIRECT_URL, Telnyx, etc.
npm run db:push
npm run db:seed
```

## Deploy to Vercel

1. Push this repo to GitHub (or deploy from CLI).
2. In Vercel → **Add New Project** → import the repo.
3. Add environment variables (same as `.env`):
   - `DATABASE_URL`, `DIRECT_URL`
   - `AUTH_SECRET`, `AUTH_URL`, `APP_BASE_URL` (set both URLs to `https://your-app.vercel.app` after first deploy, then redeploy)
   - `TELNYX_API_KEY`, `TELNYX_FAX_CONNECTION_ID`, `TELNYX_PUBLIC_KEY`
   - `FAX_NUMBERS`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
4. Enable **Storage → Blob** on the Vercel project (creates `BLOB_READ_WRITE_TOKEN`).
5. Deploy.
6. Run seed once against production DB (locally with production `DATABASE_URL` / `DIRECT_URL`):

   ```bash
   npm run db:seed
   ```

### Telnyx webhook URL (after deploy)

Use this in your Programmable Fax Application:

```text
https://YOUR-APP.vercel.app/api/webhooks/telnyx
```

Also set `APP_BASE_URL` and `AUTH_URL` to `https://YOUR-APP.vercel.app`.

### Cyprus number porting (Telnyx)

In Telnyx Mission Control → Numbers → Port Numbers, submit a Cyprus port with LOA, latest invoice, company registration, ID of legal rep, and proof of address.

Docs: [Cyprus Number Porting](https://support.telnyx.com/en/articles/3267566-cyprus-number-porting)

Then:

1. Create a **Programmable Fax Application** (webhook URL above)
2. Create an **Outbound Voice Profile** and link it to the Fax Application
3. Assign each ported number to the Fax Application

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase pooler URI (6543, pgbouncer) |
| `DIRECT_URL` | Supabase direct/session URI (5432) |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_URL` / `APP_BASE_URL` | Public app URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `TELNYX_API_KEY` | Telnyx API key |
| `TELNYX_FAX_CONNECTION_ID` | Programmable Fax Application ID |
| `TELNYX_PUBLIC_KEY` | Optional webhook signature verification |
| `FAX_NUMBERS` | `+357...\|Label,+357...\|Label` |
| `SEED_ADMIN_*` | First admin user for `npm run db:seed` |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema to Supabase |
| `npm run db:seed` | Seed admin user + company numbers |

## Architecture notes

- Outbound PDFs are stored in Vercel Blob (or local `storage/faxes/` in dev) and exposed to Telnyx at `/api/media/[id]`
- Inbound faxes arrive via `/api/webhooks/telnyx`; PDFs are downloaded from Telnyx `media_url` before expiry
- Only active `FaxNumber` rows may be used as the From number when sending
