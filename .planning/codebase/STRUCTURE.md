# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
/c/Users/achum/App Creation/
├── index.html              # Single-file SPA containing all HTML, CSS, JavaScript
├── package.json            # Node.js dependencies (Puppeteer for screenshots)
├── package-lock.json       # Dependency lockfile
├── manifest.json           # PWA app manifest
├── serve.mjs               # Local dev server (serves root at localhost:3000)
├── screenshot.mjs          # Screenshot utility (via Puppeteer)
├── vercel.json             # Vercel deployment config
├── CLAUDE.md               # Project-specific development guidance
├── favicon-32.png          # App icon (32×32)
├── icon-180.png            # Apple touch icon (180×180)
├── icon-192.png            # PWA icon (192×192)
├── icon-512.png            # PWA icon (512×512)
├── gen-icon.mjs            # Icon generation utility
├── icon-template.html      # Icon template source
├── .planning/              # GSD planning directory
│   └── codebase/           # Codebase analysis documents
├── .claude/                # Claude settings (local)
├── .vercel/                # Vercel project metadata
├── .git/                   # Git repository
├── node_modules/           # Installed dependencies
└── temporary screenshots/   # Screenshot output directory (created by screenshot.mjs)
```

## Directory Purposes

**Project Root:**
- Purpose: Single-file application with minimal supporting files
- Contains: Monolithic `index.html`, configuration, icons, build/deployment tooling
- Key files: `index.html` (165 KB, ~3,226 lines), `package.json`, `vercel.json`

**.planning/codebase/:**
- Purpose: GSD architecture documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Key files: Generated analysis documents for other GSD commands

**.claude/:**
- Purpose: Claude Code settings storage
- Contains: settings.json with project configuration

**.vercel/:**
- Purpose: Vercel CLI project metadata
- Contains: project.json with deployment info

**node_modules/:**
- Purpose: Runtime dependencies
- Contains: Puppeteer and transitive deps
- Generated: Yes (from package-lock.json)
- Committed: No

**temporary screenshots/:**
- Purpose: Output directory for automated screenshots
- Contains: screenshot-N.png files (auto-incremented)
- Generated: Yes (by screenshot.mjs)
- Committed: No

## Key File Locations

**Entry Points:**
- `index.html`: Main application file. Boot logic at lines 3169–3222 (async IIFE). Serves as both SPA entry and static HTML.

**Configuration:**
- `package.json`: Dependencies and scripts (type: module)
- `manifest.json`: PWA metadata (app name, icons, display mode)
- `vercel.json`: Deployment configuration
- `CLAUDE.md`: Development instructions (local server commands, architecture notes)

**Core Logic:**
- `index.html` lines 799–1060: HTML structure (8 screens, tab bar, modals)
- `index.html` lines 1177–1251: Global state variables
- `index.html` lines 1260–1597: Constants and utility functions
- `index.html` lines 1609–1785: Auth and navigation functions
- `index.html` lines 2202–2836: Expense, label, budget logic
- `index.html` lines 2850–2974: Chart rendering functions
- `index.html` lines 3040–3165: Event listener attachment

**Styling:**
- `index.html` lines 20–798: Inline CSS (via `<style>`)
- Fonts: DM Mono (weights 300,400,500) and Bricolage Grotesque (weights 400–800) from Google Fonts
- Tailwind CDN: `https://cdn.tailwindcss.com`

**Testing:**
- No test files. Manual testing via dev server and screenshots.

**Icons & Assets:**
- `favicon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`: App icons at various sizes
- `icon-template.html`: Source template for icon generation
- `gen-icon.mjs`: Script to generate icons from template

**Utility Scripts:**
- `serve.mjs`: Express server that serves project root at `http://localhost:3000`
- `screenshot.mjs`: Puppeteer wrapper to capture localhost screenshots with auto-increment naming

## Naming Conventions

**Files:**
- HTML: Single `index.html`
- Config: kebab-case (`package.json`, `vercel.json`, `manifest.json`)
- Icons: `icon-{size}.png` or `favicon-{size}.png`
- Scripts: camelCase (`.mjs` files: `serve.mjs`, `screenshot.mjs`, `gen-icon.mjs`)
- Directories: kebab-case (`.planning`, `.vercel`, `.claude`, `node_modules`)

**HTML Elements (IDs):**
- Screens: `#s-{screen}` (e.g., `#s-auth`, `#s-numpad`, `#s-history`, `#s-chart`, `#s-budget`, `#s-feedback`, `#s-admin`, `#s-lock`, `#s-manage-labels`)
- Tab bar: `#tab-bar`, `.tab-btn[data-tab]`
- Buttons: `#btn-{action}` (e.g., `#btn-save`, `#btn-profile`, `#btn-back-label`)
- Modals: `#{name}-modal` or `#{name}-sheet-overlay`
- Forms: `#{prefix}-{field}` (e.g., `#auth-email`, `#auth-password`)
- Lists/grids: `#{prefix}-list` or `#{prefix}-grid` (e.g., `#chips-grid`)
- Containers: `#{purpose}` (e.g., `#shapes-layer`, `#app`)

**CSS Classes:**
- State: `.active`, `.open`, `.hidden`, `.off-right`, `.off-left`
- Elements: `.icon-btn`, `.tab-btn`, `.auth-field`, `.screen`, `.shape`
- Layout: `.chips-grid`, `.modal`, `.popover`
- Utility: `.has-tabbar`, `.tapped`

**Functions:**
- Navigation: `slideToX()`, `slideBack()`, `switchTab()`
- Data: `load{Entity}()`, `save{Entity}()`, `render{Entity}()`
- Auth: `doAuth()`, `doSignOut()`, `registerBiometric()`, `verifyBiometric()`
- UI: `show{Screen}()`, `close{Modal}()`, `toggle{Feature}()`
- Utility: `{noun}Key()` (for localStorage keys), `format{Noun}()`, `{verb}{Noun}()`

**Local Storage Keys (per user):**
- `spend_currency` — selected currency code
- `spend_accent_${userId}` — brand color hex
- `spend_pin_${userId}` — SHA-256 hash of PIN
- `spend_bio_enabled_${userId}` — biometric flag ('1' or absent)
- `spend_bio_cred_${userId}` — Base64 WebAuthn credential ID
- `spend_labels_${userId}` — JSON array of cached labels
- `spend_budgets_${userId}` — JSON object of budget limits
- `spend_last_email` — email from last successful login

**Supabase Tables:**
- `expenses` — transaction records (user_id, amount, label_id, label_name, created_at)
- `labels` — label definitions (user_id, name, color, budget, created_at)
- `feedback` — user feedback with optional voice recordings (user_id, user_email, message, voice_url, rating)
- `feature_requests` — feature board entries (title, description, status, created_at)
- `announcements` — in-app broadcast messages (message, is_active, created_at)

## Where to Add New Code

**New Feature:**
- Primary code: Add functions to `index.html` inside `<script>` tag (line 1177 onwards)
- HTML: Add screen div to `#app` container (before `</div>` at end of screens, around line 1030)
- Styling: Add CSS to `<style>` block (line 20 onwards)
- Navigation: Add navigation function (e.g., `slideTo{Feature}()`) following pattern at lines 1815–1871
- Event listeners: Attach in event delegation section (lines 3040–3165)

**New Screen:**
- HTML: Add `<div class="screen off-right" id="s-{name}">...</div>` in `#app` (before closing tag)
- Show/Navigate: Create `slideTo{Name}()` function matching lines 1815–1843 pattern
- Back navigation: Add back button event listener or call `slideBack()` which toggles `.off-right` class
- Tab bar: Add `.tab-btn[data-tab="{name}"]` if it's a main tab section, or attach to dedicated back button
- Render logic: Create `render{Name}()` function to populate dynamic content

**New Label/Chip:**
- HTML: Add `<div class="chip">` to appropriate grid in screen markup
- Styling: Follow `.chip` class pattern in `<style>` (around line 600+)
- Data: Cache in global array (e.g., `labels`) and update `localStorage` on change
- Rendering: Create or extend `render{Entity}()` function to dynamically insert chip elements

**New Modal/Overlay:**
- HTML: Add `<div id="{name}-modal" class="modal">` with content and buttons
- Styling: Add `.modal`, `.modal.open` classes to `<style>` (pattern around line 740+)
- Show: Create `show{Modal}()` function that adds `.open` class
- Close: Create `close{Modal}()` function that removes `.open` class and resets form
- Event listener: Attach to buttons in section 3040–3165, handle outside-click on modal itself

**Supabase Query:**
- Async function: Add `async function load{Entity}()` or `async function save{Entity}()` (pattern lines 2670–2836)
- Query: Use `db.from('{table}').select() / insert() / update() / delete()` with `.eq('user_id', currentUser.id)` filter
- Caching: On successful fetch, update in-memory array (e.g., `allTxData = data`)
- Persistence: Also update `localStorage` if caching offline values (e.g., labels)
- Error handling: Wrap in try-catch, call `toast('Could not {action}')` on error
- Re-render: Call appropriate `render{Entity}()` function after mutation

**Utility Function:**
- Location: Lines 1260–1597 (before auth/navigation section)
- Pattern: Pure functions with no side effects unless for DOM (e.g., `fmtNum()`, `monthStart()`, `pinHash()`)
- Naming: Use verb-noun pattern (`fmtNum()`, `sym()`, `accentKey()`) or noun-verb (`pinHash()`)

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (tracked in git)
- Files: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (.gitignore excludes)
- Contains: Puppeteer and transitive dependencies

**`temporary screenshots/`:**
- Purpose: Output directory for automated screenshots
- Generated: Yes (created by screenshot.mjs at runtime)
- Committed: No (.gitignore excludes)
- Cleanup: Safe to delete; will be recreated on next screenshot run

## Development Workflow

**Local Development:**
1. Start server: `node serve.mjs` (serves at `http://localhost:3000`)
2. Edit `index.html` — changes auto-reload in browser (no build step)
3. Screenshot: `node screenshot.mjs http://localhost:3000 [label]` → saves to `./temporary screenshots/screenshot-N-label.png`
4. View: Read screenshot with Read tool to inspect visually

**Deployment:**
1. Commit changes: `git add -A && git commit -m "..."`
2. Deploy: `npx vercel --prod` → pushes to https://spend-tracker-iota.vercel.app

**No Build Step:**
- All code runs directly; Tailwind loaded via CDN
- No compilation, bundling, or transpilation required
- Changes are live on save

---

*Structure analysis: 2026-03-26*
