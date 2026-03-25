# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Local dev server** (must be running before screenshots):
```
node serve.mjs
```
Serves the project root at `http://localhost:3000`. If already running, do not start a second instance — the existing one handles all requests.

**Screenshot** (always from localhost, never `file:///`):
```
node screenshot.mjs http://localhost:3000
node screenshot.mjs http://localhost:3000 label   # saves as screenshot-N-label.png
```
Screenshots auto-increment and save to `./temporary screenshots/`. After screenshotting, read the PNG with the Read tool to inspect it visually.

**Deploy**:
```
npx vercel --prod
```
Deploys to https://spend-tracker-iota.vercel.app

## Architecture

The entire app is a **single file: `index.html`**. No build step, no bundler, no framework. All HTML, CSS, and JS live inline.

### Screen System
Six screens (`#s-auth`, `#s-lock`, `#s-numpad`, `#s-label`, `#s-history`, `#s-chart`, `#s-budget`) are stacked via `position: absolute; inset: 0`. Active screen has no transform; inactive screens use `.off-right` (translateX 100%) or `.off-left` (translateX -100%). The `screen` variable tracks the current screen name. Navigation functions (`slideToHistory`, `slideToChart`, `slideToBudget`, `slideBack`) toggle these classes.

### Auth & Lock Flow
Boot sequence (async IIFE at bottom of `<script>`):
1. `db.auth.getSession()` — if no session → show `#s-auth` (default)
2. Session found + PIN set in localStorage → `showLockScreen()` → shows `#s-lock`
3. Session found + no PIN → shows "Continue as [email]" button on `#s-auth`
4. After unlock (PIN/biometric) or email sign-in → `onSignedIn()` → slides to `#s-numpad`
5. After first sign-in with no PIN configured → `showPinSetupSheet()` fires after 800ms delay

### Data Layer
- **Supabase** (`@supabase/supabase-js` via CDN) — `expenses` and `labels` tables
- `allTxData` — in-memory array of all transactions, loaded once per session via `loadHistory()`/`loadMonthTotals()`
- `labels` — array of label objects cached in memory and in `localStorage` (`spend_labels_${userId}`)
- All Supabase queries filter by `currentUser.id`

### localStorage Keys (all per-user, keyed by `userId`)
| Key | Purpose |
|-----|---------|
| `spend_currency` | Selected currency code (global, not per-user) |
| `spend_labels_${userId}` | Cached label list |
| `spend_budgets_${userId}` | Budget limits object `{ overall, labels: {} }` |
| `spend_pin_${userId}` | SHA-256 hash of 4-digit PIN |
| `spend_bio_enabled_${userId}` | `"1"` if WebAuthn biometric registered |
| `spend_bio_cred_${userId}` | Base64 WebAuthn credential ID |
| `spend_accent_${userId}` | Accent color hex (drives `--lime` CSS variable) |

### CSS Variable System
All accent/brand color uses `--lime` (default `#C8FF00`). `applyAccent(hex)` overrides this at runtime via `document.documentElement.style.setProperty('--lime', hex)`. Other key variables: `--bg`, `--bg2`, `--bg3`, `--red`, `--text`, `--muted`, `--border`, `--border2`.

### Floating Shapes
`#shapes-layer` (inside `#app`, z-index 1) contains `.shape` elements rendered behind all screens (z-index 2). `animateShapes()` re-triggers the entrance animation by forcing a reflow — call it on every screen transition.

### Modals
Two modal overlays (`#budget-numpad-modal`, `#pin-setup-sheet-overlay`) sit inside `#app` at z-index 300. They use `.open` class for visibility/transform transitions.

### Number Formatting
`fmtNum(n, decimals)` uses `Intl.NumberFormat` with `en-IN` locale when currency is INR (gives Indian comma style: 1,00,000), `en-US` otherwise.
