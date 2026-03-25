# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Single-Page Application (SPA) with stacked screen system

**Key Characteristics:**
- Monolithic HTML file (`index.html`) containing all HTML, CSS, and JavaScript
- Navigation via `transform`-based screen transitions (absolute positioning with `off-right`/`off-left` classes)
- Client-side state management with in-memory arrays and `localStorage` for persistence
- Supabase backend for auth, database, and file storage
- PWA-capable with service worker support and app manifest

## Layers

**Presentation Layer:**
- Location: `index.html` lines 799–1060 (HTML structure)
- Contains: 8 screen components (`#s-auth`, `#s-numpad`, `#s-label`, `#s-history`, `#s-chart`, `#s-budget`, `#s-feedback`, `#s-admin`, `#s-lock`, `#s-manage-labels`)
- Tab bar navigation (`#tab-bar`) for switching between numpad, history, chart, budget tabs
- Modal overlays for PIN setup and budget configuration
- Depends on: State management layer for current values
- Used by: Navigation functions for visibility toggling

**State Management Layer:**
- Location: `index.html` lines 1177–1251
- Contains: Global variables tracking app state
  - `allTxData` — cached array of all transactions
  - `labels` — cached array of label objects
  - `currentUser` — authenticated user object
  - `cachedSession` — Supabase session
  - `screen` — current screen name ('auth', 'numpad', 'history', 'chart', 'budget', 'feedback', 'admin', 'lock', 'manage-labels')
  - `currency` — selected currency code
  - Settings: `activeFilter`, `activeChartType`, `activeChartPeriod`
- Depends on: localStorage for initial values
- Used by: All render and navigation functions

**Data Access Layer:**
- Location: `index.html` lines 1609–2836, 2670–2850
- Contains: Async functions for Supabase operations
  - Auth: `doAuth()`, `doSignOut()`, `registerBiometric()`, `verifyBiometric()`
  - Transactions: `loadHistory()`, `loadMonthTotals()`, `saveExpense()`, `saveEdit()`
  - Labels: `loadLabels()`, `addLabel()`, `renderManageLabels()`
  - Admin: `loadAdminFeedback()`, `loadAdminUsers()`, `loadFeatureBoard()`, `loadAnnouncements()`
- Tables accessed: `expenses`, `labels`, `feedback`, `feature_requests`, `announcements`
- Depends on: Supabase instance (`db`)
- Used by: Presentation layer for data binding

**Business Logic Layer:**
- Location: `index.html` lines 1579–2974
- Contains: Core calculations and formatting
  - `fmtNum()` — number formatting with locale-aware comma separators
  - `monthStart()` — first day of current month in ISO format
  - `sym()` — currency symbol lookup
  - `renderChart()`, `renderHistory()`, `renderChips()` — aggregations and filters
  - `applyAccent()` — CSS variable application for brand color
- Depends on: Supabase data via `allTxData` and `labels`
- Used by: Presentation layer for computed views

**Utility Layer:**
- Location: `index.html` lines 1318–1587
- Contains: Helper functions
  - Security: `pinHash()`, `verifyPIN()`, `setupPIN()`, `clearPIN()`
  - UI: `toast()`, `animateShapes()`, `updateTabBar()`, `switchTab()`
  - Keys: `pinKey()`, `bioKey()`, `bioCredKey()`, `accentKey()`, `budgetKey()`, `labelCacheKey()`
- Depends on: None (pure utility)
- Used by: All layers

## Data Flow

**User Authentication Flow:**

1. App boots (`lines 3169–3222`) and checks for existing session via `db.auth.getSession()`
2. If session exists and biometric enabled → attempt `verifyBiometric()`
3. If biometric succeeds → `unlockToNumpad()` runs (inside `verifyBiometric()`)
4. If biometric fails or no session → show `#s-lock` for PIN entry via `showLockScreen()`
5. PIN verified → `unlockToNumpad()` → transitions to `#s-numpad`
6. If no PIN/no biometric → show "Continue as [email]" button on `#s-auth`
7. After email sign-in → `onSignedIn()` → slides to `#s-numpad`
8. First sign-in with no PIN → `showPinSetupSheet()` fires after 800ms (line 1432)

**Transaction Entry & Saving Flow:**

1. User enters amount on `#s-numpad` (displayed in real-time)
2. User selects label via `slideToLabel()` → `#s-label` displays cached `labels` from `loadLabels()`
3. User confirms → `slideBack()` returns to numpad
4. User taps "Save" → `saveExpense()` inserts to `expenses` table (line 2650)
5. Expense inserted with `user_id`, `amount`, `label_name`, `label_id`, `created_at`
6. UI clears numpad value; `loadHistory()` refreshed on next history view

**Data Fetching & Caching:**

1. On screen transitions, if data needed isn't cached, fetch from Supabase
2. `loadHistory()` (line 2670) — fetches all expenses for user, caches in `allTxData`
3. `loadLabels()` (line 2404) — fetches labels, caches in `labels` array AND `localStorage` (`spend_labels_${userId}`)
4. `loadMonthTotals()` (line 2412) — fetches month's expenses for aggregation
5. Subsequent renders use in-memory `allTxData` and `labels` until page reload
6. Edits immediately update both database and in-memory cache (e.g., line 2554 after delete)

**Chart & History Visualization Flow:**

1. User tabs to history → `slideToHistory()` → renders `#s-history`
2. `renderHistory(allTxData, activeFilter)` (line 2705) filters by label and renders list
3. User tabs to chart → `slideToChart()` → renders `#s-chart`
4. `renderChart()` (line 2850) calls `renderDonutChart()`, `renderBarChart()`, or `renderLineChart()` based on `activeChartType`
5. All visualizations aggregate `allTxData` on demand (no separate cache)

**State Persistence:**

- User preferences: `localStorage` keys per user (keyed by `userId`)
  - `spend_currency` — selected currency
  - `spend_accent_${userId}` — brand color hex
  - `spend_pin_${userId}` — SHA-256 hash of PIN
  - `spend_bio_enabled_${userId}` — biometric registration flag
  - `spend_labels_${userId}` — cached labels JSON
- Transaction data: All in Supabase `expenses` table; no localStorage backup

## Key Abstractions

**Screen System:**
- Purpose: Navigate between app sections without page reload
- Examples: `#s-auth`, `#s-numpad`, `#s-history`, `#s-chart`, `#s-budget`, `#s-feedback`, `#s-admin`, `#s-lock`, `#s-manage-labels`
- Pattern: HTML screens with `position: absolute; inset: 0`. Active screen has no transform; inactive screens use `.off-right` (translateX 100%) or `.off-left` (translateX -100%). CSS transition duration: 0.36s cubic-bezier(0.4,0,0.2,1)
- Navigation: `switchTab()` (line 1785) for tab bar, `slideToHistory()` / `slideToChart()` / `slideToBudget()` / `slideToLabel()` for screen transitions

**Floating Shapes Animation:**
- Purpose: Visual background elements with entrance and continuous floating animation
- Location: `#shapes-layer` (z-index 1) contains `.shape` elements
- Pattern: Each shape animates in with `shapeIn` (1.2s) then floats with `shapeFloat` (12s). Call `animateShapes()` (line 1752) on every screen transition to retrigger entrance animation
- CSS: Uses CSS custom properties `--r0` (initial rotation) and `--rot` (final rotation) set via inline styles

**Modal System:**
- Purpose: Display overlays for PIN setup and budget configuration
- Locations: `#pin-setup-sheet-overlay` (line 918–932), `#budget-numpad-modal` (line 1099–1122), `#edit-modal` (line 2791–2822)
- Pattern: `.open` class toggles visibility and transform. Click outside to close (delegated on line 3155–3157)

**Tab Bar:**
- Purpose: Primary navigation between numpad, history, chart, and budget sections
- Location: `#tab-bar` (line 1044–1055)
- Pattern: Buttons with data-tab attributes. `switchTab(target)` updates `.active` class and routes to appropriate screen
- Behavior: Hidden on lock/auth screens via `.hidden` class

**Number Formatting Abstraction:**
- Purpose: Locale-aware currency display
- Location: `fmtNum()` (line 1210), `sym()` (line 1209)
- Pattern: Uses `Intl.NumberFormat` with `en-IN` locale for INR (gives comma style: 1,00,000), `en-US` for others. All currency display calls `sym()` for symbol lookup

**CSS Variable System:**
- Purpose: Brand color theming without modifying DOM
- Variables: `--lime` (primary brand, default #C8FF00), `--red` (#FF3B3B), `--bg` (#09090C), `--bg2` (#111116), `--bg3` (#1C1C23), `--text`, `--muted`, `--border`, `--border2`
- Applied via: `applyAccent(hex)` (line 1289) calls `document.documentElement.style.setProperty('--lime', hex)`
- Persisted to: `localStorage` as `spend_accent_${userId}`

## Entry Points

**Application Boot:**
- Location: `index.html` lines 3169–3222 (async IIFE at script end)
- Triggers: Page load
- Responsibilities:
  1. Initialize Supabase client
  2. Apply saved currency symbol to DOM
  3. Pre-fill email field from last login
  4. Check for existing session via `db.auth.getSession()`
  5. Route to biometric verification, PIN lock, or auth screen based on session state
  6. Set up auth state change listener
  7. Load and display active announcements

**Primary Navigation:**
- Location: `switchTab()` (line 1785), `slideToHistory()`, `slideToChart()`, `slideToBudget()`, `slideToLabel()`, `slideBack()`
- Pattern: Update `screen` variable, toggle `.off-right` / `.off-left` classes, call `animateShapes()`, update tab bar active state
- Triggered by: Tab bar clicks, screen internal buttons

**User Authentication:**
- Location: `doAuth()` (line 1609), `onSignedIn()` (line 1649)
- Entry: Auth form submission or "Continue as" button
- Responsibilities: Validate credentials, call Supabase auth, cache session, load initial data, route to next screen

## Error Handling

**Strategy:** Try-catch with silent fallbacks and user-facing toast notifications

**Patterns:**
- Supabase operations wrapped in try-catch (e.g., `loadHistory()` line 2670–2683)
- Network errors logged silently; UI shows "Not signed in" or "Could not [action]" via `toast()`
- Biometric failures cascade to PIN entry (line 3193–3196)
- Missing data treated as empty state (e.g., "No labels yet — add one below ↓" line 2422)
- Auth state changes trigger full reload if session lost while on non-auth screen (line 3214)

## Cross-Cutting Concerns

**Logging:**
- No dedicated logging framework. Debug via browser console.
- Errors swallowed in try-catch blocks (line 3221 has `catch(_){}`)

**Validation:**
- Client-side only. Input fields have length checks (e.g., PIN digit length, label name uniqueness checked line 2631)
- Supabase enforces data integrity via schema constraints

**Authentication:**
- Supabase email+password auth with optional PIN and WebAuthn biometric
- Session stored in Supabase auth state; PIN hash and biometric credential ID in `localStorage`
- Admin access gated by `ADMIN_EMAIL` check (line 1202, 2022)

**Authorization:**
- Row-level security via `currentUser.id` in all Supabase queries (e.g., `eq('user_id', currentUser.id)`)
- Admin panel only accessible to hardcoded admin email

---

*Architecture analysis: 2026-03-26*
