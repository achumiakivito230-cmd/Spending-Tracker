# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Database & Backend:**
- Supabase - Complete backend platform for data persistence, authentication, and file storage
  - SDK/Client: `@supabase/supabase-js@2` loaded via CDN
  - URL: `https://exzyruzxfshexpdlkaeq.supabase.co`
  - Anon Key (public): Hardcoded in `index.html` line 1181

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Tables: `expenses`, `labels`, `feedback`, `feature_requests`, `announcements`
  - Connection: Supabase client initialized at line 1184 of `index.html`
  - Row Level Security (RLS) policies configured per table
  - Queries filter by `currentUser.id` for multi-tenant isolation

**Core Tables:**
- `expenses` - Transaction records with fields: `id`, `user_id`, `amount`, `label_id`, `label_name`, `created_at`
- `labels` - Spending categories with fields: `id`, `user_id`, `name`, `budget`, `created_at`
- `feedback` - User feedback with fields: `id`, `user_id`, `user_email`, `rating`, `message`, `voice_url`, `features_requested`, `created_at`
- `feature_requests` - Feature tracking with fields: `id`, `title`, `description`, `status`, `created_at`
- `announcements` - Admin messages with fields: `id`, `message`, `is_active`, `created_at`

**File Storage:**
- Supabase Storage bucket `Voice Feedback` (private)
  - Used for: User voice feedback audio files in WebM format
  - Upload/download via `db.storage.from('Voice Feedback').upload()` and `.createSignedUrl()`

**Client-Side Storage:**
- Browser localStorage - Caching and user preferences
  - Keys (all per-user, keyed by `userId`):
    - `spend_currency` - Selected currency code (INR/USD)
    - `spend_labels_${userId}` - Cached label JSON array
    - `spend_budgets_${userId}` - Budget limits object
    - `spend_pin_${userId}` - SHA-256 hashed 4-digit PIN
    - `spend_bio_enabled_${userId}` - WebAuthn biometric flag
    - `spend_bio_cred_${userId}` - Base64 WebAuthn credential ID
    - `spend_accent_${userId}` - Accent color hex value
    - `spend_last_email` - Last used email for quick sign-in

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (Postgres-backed)
  - Implementation: Email/password authentication via `db.auth.signUp()` and `db.auth.signInWithPassword()`
  - Session management: `db.auth.getSession()` on boot
  - Password confirmation: User receives email confirmation link on signup
  - Requires SMTP configured in Supabase project

**Biometric Authentication:**
- WebAuthn (Web Authentication API) via Web Crypto
  - Platform authenticator only (face/fingerprint)
  - Registration via `navigator.credentials.create()` at line 1500
  - Authentication via `navigator.credentials.get()` at line 1521
  - Challenge generation: `crypto.getRandomValues()` (32-byte)
  - Credential storage: Base64-encoded credential ID in localStorage

**PIN Authentication:**
- Client-side hashing with SHA-256 via `crypto.subtle.digest('SHA-256')`
- Hash stored in localStorage as hex string
- Used as fallback when biometric unavailable

## Monitoring & Observability

**Error Tracking:**
- None detected - No external error tracking service

**Logs:**
- None - Console errors only
- Admin panel at line 2019+ provides minimal feedback on table operations

**Analytics:**
- None detected - No tracking service integrated

## CI/CD & Deployment

**Hosting:**
- Vercel - Production deployment target
  - Deploy command: `npx vercel --prod`
  - Project URL: `https://spend-tracker-iota.vercel.app`
  - Vercel configuration: `vercel.json` (empty, using defaults)

**Build Process:**
- None - Single HTML file, no build step required
- Direct static file serving
- Screenshot generation uses Puppeteer for local development only

## Environment Configuration

**Required Env Vars:**
- None in .env file - All config hardcoded:
  - `SUPABASE_URL` - Hardcoded at line 1180
  - `SUPABASE_KEY` - Hardcoded at line 1181 (anon public key)
  - `ADMIN_EMAIL` - Hardcoded at line 1202 for admin panel access

**Secrets Location:**
- Supabase anon key: Embedded in `index.html` line 1181
- WARNING: Public key is safe to expose (anon-level permissions only)
- Supabase project secrets: Managed in Supabase Dashboard

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Email confirmations from Supabase Auth (signup confirmation)
- Optional: Admin can configure Supabase Storage signed URL expiry (3600s default at line 2067)

## Data Synchronization

**Real-time Subscriptions:**
- None - No realtime subscriptions configured
- All data loaded once per session via:
  - `loadLabels()` - Fetches label list on signin
  - `loadMonthTotals()` - Fetches expense totals for current month
  - `loadHistory()` - Fetches last 200 expenses ordered by creation date

**Caching Strategy:**
- In-memory: `allTxData` array, `labels` array
- localStorage: Label list, budgets, user preferences
- Manual refresh on data mutations (insert/update/delete)

## API Query Patterns

**Read Operations:**
- `db.from('table').select('*').order('created_at', {ascending:false}).limit(200)` - History fetch
- `db.from('table').select('label_name,amount').gte('created_at', monthStart())` - Monthly totals
- `db.from('feedback').select('*').order('created_at', {ascending:false})` - Admin feedback list

**Write Operations:**
- `db.from('table').insert(payload).select().single()` - Create with return
- `db.from('table').update({...}).eq('id', id)` - Update by ID
- `db.from('table').delete().eq('id', id)` - Delete by ID

**Row Level Security:**
- All user queries filtered by `currentUser.id` at application layer
- Admin operations check `ADMIN_EMAIL` against current user email

---

*Integration audit: 2026-03-26*
