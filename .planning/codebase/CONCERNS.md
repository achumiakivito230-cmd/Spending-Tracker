# Codebase Concerns

**Analysis Date:** 2026-03-26

## Data Synchronization Issues

**Offline state divergence:**
- Issue: `allTxData` array is loaded once on app boot and kept in memory. Edits/deletes are applied locally, but no real-time sync with backend if other devices modify data.
- Files: `index.html` (lines 2670–2683, 2829–2845, 2784–2797)
- Impact: User may see stale data if they edit expenses on another device. History screen shows local mutations but doesn't reflect server changes without manual refresh.
- Fix approach: Implement periodic polling (`setInterval` every 30–60s) to check if `allTxData` differs from server state, or add Supabase real-time subscriptions using `db.from('expenses').on('*', ...)`.

**No conflict resolution on concurrent edits:**
- Issue: If edit modal is open when another user (same account on another tab) saves, the local `editTx` object may be stale. Save will overwrite with outdated values.
- Files: `index.html` (lines 2829–2845)
- Impact: Data loss on concurrent edits from same user across multiple tabs/devices.
- Fix approach: Before saving, fetch fresh transaction data and compare timestamps to detect conflicts. Implement last-write-wins or ask user to refresh.

## Error Handling Gaps

**Silent failures on database operations:**
- Issue: Multiple async database calls check `if (error)` but errors are only shown as toasts, not logged. Failed inserts, updates, deletes don't report why they failed.
- Files: `index.html` (lines 2635–2636, 2532–2534, 2789–2790, 2836–2838)
- Impact: Users see generic "Could not add label" message but don't know if it's permission denied, network down, or quota exceeded. Harder to debug.
- Fix approach: Log errors to console with full error object. Consider sending critical errors to Sentry or similar error tracking service.

**Missing error feedback for async operations:**
- Issue: `Promise.all([loadLabels(), loadMonthTotals()])` at lines 1362, 1669 doesn't have catch/error handling. If either rejects, app silently fails to load data.
- Files: `index.html` (lines 1362, 1669)
- Impact: User sees blank app state with no indication data load failed. No fallback or retry logic.
- Fix approach: Add `.catch()` to handle rejection, show toast, and optionally retry with exponential backoff.

## Security & Validation Issues

**Missing input validation on critical fields:**
- Issue: Label names accept any input (line 2630: `name.trim()` only). No length limits on text fields despite maxLength=32 on input elements (lines 2526, 2589). No sanitization of label names used in innerHTML/template strings.
- Files: `index.html` (lines 2628–2645, 2521–2547, 2587–2602)
- Impact: Potential for XSS if label name contains HTML/scripts (e.g., `<img src=x onerror="alert('xss')">`). Browser shows sanitized in some contexts but stored unsanitized in DB.
- Fix approach: Always sanitize user input before inserting into DOM. Use `textContent` instead of `innerHTML` for dynamic content, or use DOMPurify library. Validate lengths server-side.

**XSS risk in expense label rendering:**
- Issue: Transaction history renders label names directly into DOM via `innerHTML` at line 2750: `<div class="tx-name">${tx.label_name||'Unlabeled'}</div>`. If a label contains HTML, it executes.
- Files: `index.html` (line 2750)
- Impact: Stored XSS attack vector if attacker can inject malicious label names into database.
- Fix approach: Replace all dynamic `innerHTML` with `textContent` for user data. Use template literals only for safe structural HTML.

**Admin panel email hardcoded:**
- Issue: Admin access controlled by `currentUser.email === ADMIN_EMAIL` at line 1679, where `ADMIN_EMAIL = 'achumiakivito230@gmail.com'` (line 1202).
- Files: `index.html` (line 1202, 1679, 2022)
- Impact: Email is visible in source code. Admin features (feedback viewing, user stats) are bypassed if attacker knows this email or compromises that account.
- Fix approach: Move ADMIN_EMAIL to secure environment variable. Implement server-side role check on Supabase custom claims or JWT, not client-side comparison.

**Biometric credential storage in localStorage:**
- Issue: WebAuthn credential IDs are stored as Base64-encoded strings in localStorage (lines 1505–1507, 1518–1520).
- Files: `index.html` (lines 1505–1507, 1518–1520)
- Impact: If localStorage is compromised, attacker obtains credential IDs. While IDs alone can't authenticate, combined with other exploits they could enable spoofing. Not encrypted.
- Fix approach: Encrypt credential IDs with a device-specific key before storing. Better: don't store credential IDs at all—let browser manage via `navigator.credentials` only.

**PIN stored as SHA-256 hash only:**
- Issue: PIN hash at line 1332 uses single SHA-256 with no salt. Standard SHA-256 with 4-digit PIN is brute-forceable (10,000 possibilities).
- Files: `index.html` (lines 1318–1332)
- Impact: If localStorage is stolen, attacker can crack PIN offline in seconds.
- Fix approach: Use PBKDF2 or Argon2 with random salt. Store salt separately or derive from device ID. Consider requiring biometric as additional factor.

## State Management Fragility

**Global mutable state without encapsulation:**
- Issue: `allTxData`, `labels`, `picked`, `currentUser`, etc. are global variables (lines 1246–1264) modified directly from many functions. No validation on assignments.
- Files: `index.html` (lines 1246–1264, throughout file)
- Impact: Hard to trace state mutations. Easy to introduce bugs when modifying state. No way to roll back partial updates. Example: `allTxData[idx]={...allTxData[idx],...}` at line 2840 may fail silently if `idx < 0`.
- Fix approach: Create a minimal state management wrapper with getters/setters and change listeners. Consider using a state machine library (e.g., XState) for screen transitions.

**Race condition in label cache updates:**
- Issue: `loadLabels()` at line 2404 fetches from DB, but if two calls happen simultaneously, both may write different data to `localStorage`, and final state is undefined.
- Files: `index.html` (lines 2404–2410)
- Impact: Cached label list may become inconsistent with in-memory `labels` array, causing rendering mismatches.
- Fix approach: Add a loading flag or debounce repeated calls. Ensure atomic localStorage writes.

**`currentUser` nullability inconsistency:**
- Issue: Many functions assume `currentUser` is set after sign-in, but no guard prevents null access. Example line 2634: `if (currentUser) payload.user_id = currentUser.id;` — correctly checks, but many others don't.
- Files: `index.html` (lines 1287, 1313–1315, 1336, 1644–1645, 2634, throughout)
- Impact: Code is defensively written in some places and not others, making it fragile. If sign-out happens during async operation, code may crash.
- Fix approach: Always guard `currentUser` before use. Better: validate that user is signed in before showing any screen that requires it.

## UI/UX Bugs

**Floating menu listeners not cleaned up:**
- Issue: Budget input and label action menus at lines 2488–2490, 2516–2518, 2544–2546 add click-outside listeners but rely on single anonymous `function outside(e)` to remove itself. If multiple menus are opened rapidly, listeners may stack.
- Files: `index.html` (lines 2464–2491, 2493–2519, 2521–2547)
- Impact: Multiple stacked listeners cause slowdowns and unexpected behavior when closing menus. Click-outside detection may not work correctly.
- Fix approach: Use a single delegated click handler with a queue of open menus. Cleanup on menu close.

**Edit modal label selection desync:**
- Issue: Edit modal shows label chips based on `labels` array (line 2807), but if a label is deleted while modal is open, chip still appears but clicking it references a deleted label. Saving updates `allTxData` with invalid `label_id`.
- Files: `index.html` (lines 2802–2819, 2829–2845)
- Impact: Orphaned label references in database. When rendering history, `label_name` may exist but `label_id` points nowhere.
- Fix approach: Validate `editLabel.id` against current `labels` before saving. Show warning if label was deleted. Auto-close modal if selected label is deleted.

**Screen navigation state inconsistency:**
- Issue: Screen transitions use class toggles (`.off-left`, `.off-right`) but no central state validation. `screen` variable and DOM state can diverge if multiple transitions happen rapidly.
- Files: `index.html` (lines 1658–1663, 1804–1832, throughout navigation)
- Impact: Tapping nav buttons quickly can stack multiple transitions, leaving visual glitches or input captures on wrong screen.
- Fix approach: Prevent transitions while one is in progress. Use CSS `animation-end` event to confirm navigation before allowing next transition.

## Performance Concerns

**Large transaction list rendering without pagination:**
- Issue: `loadHistory()` at line 2677 fetches and renders up to 200 transactions all at once. No pagination, virtualization, or lazy loading.
- Files: `index.html` (lines 2670–2683, 2705–2782)
- Impact: Scrolling performance degrades with many transactions. 200 DOM nodes created instantly, each with pointer listeners. Battery drain on mobile.
- Fix approach: Implement infinite scroll with `limit(30)` and `offset()`, rendering new items as user scrolls. Consider virtual scrolling library.

**Chart rendering recalculates on every screen transition:**
- Issue: `renderChart()` at line 2850 rebuilds entire SVG/DOM even if data hasn't changed. Called from `slideToChart()` with no memoization.
- Files: `index.html` (lines 2850–2862, 1794–1810)
- Impact: Chart redraws cause jank when switching screens. Chart data filtering happens in memory each time.
- Fix approach: Cache rendered chart SVG. Only rebuild if `activeChartPeriod`, `activeChartType`, or data changes. Memoize calculations.

**No request debouncing on filtered updates:**
- Issue: Changing label filter or period calls `renderFilterChips()` and `renderHistory()` twice sequentially (lines 2698–2699, 2713, 2739). No debounce for rapid filter clicks.
- Files: `index.html` (lines 2685–2703, 2705–2782)
- Impact: Multiple rapid renders waste CPU. DOM thrashing if user clicks filter buttons quickly.
- Fix approach: Use `requestAnimationFrame` or debounce the render calls. Batch multiple state changes into single render cycle.

## Data Retention & Privacy

**No data retention policy enforcement:**
- Issue: App stores all expenses in Supabase indefinitely. No automatic cleanup of old transactions or audit logs.
- Files: `index.html` (Supabase database design, not code)
- Impact: User data accumulates forever. GDPR compliance risk—users can't easily request data deletion.
- Fix approach: Add server-side policies to auto-delete transactions older than X years (e.g., 7 years). Provide user-facing "delete all data" function.

**Voice feedback audio stored unencrypted:**
- Issue: Feedback submission at lines 1980–2018 uploads audio to Supabase Storage bucket "voice-feedback" (line 1991). Stored as-is, no encryption.
- Files: `index.html` (lines 1980–2018)
- Impact: Audio files are directly accessible if bucket permissions are misconfigured. May contain personal information (voice, background noise).
- Fix approach: Enable server-side encryption on storage bucket. Add access controls. Consider encrypting client-side before upload.

## Testing & Deployment

**No automated testing:**
- Issue: 3200-line monolithic HTML file has zero test coverage. Browser-only testing via manual screenshots.
- Files: `index.html` (entire file)
- Impact: Refactoring is risky. Edge cases (e.g., PIN entry with 4+ digits, concurrent label deletion) not validated before production.
- Fix approach: Extract functions into testable modules. Add unit tests for PIN hashing, amount formatting, date calculations. Add E2E tests for auth flow and expense CRUD.

**Environment configuration missing:**
- Issue: Supabase keys are hardcoded in CDN script imports (visible in HTML). No `.env` separation for different environments (dev/staging/prod).
- Files: `index.html` (lines 19, 1170–1177)
- Impact: Switching between local Supabase and production requires manual code changes. No staging environment available.
- Fix approach: Move API keys to build-time environment variables. Create separate `index.html` variants for each environment, or use build script to inject vars.

## Known Limitations

**Single file architecture limits scalability:**
- Issue: Entire app (HTML, CSS, JS) in one 3225-line file. No module system, bundler, or code splitting.
- Files: `index.html`
- Impact: Difficult to maintain. Long load time for new users. Cache-busting requires versioning entire file. No code reuse across projects.
- Fix approach: Not urgent if app stays small, but consider Vite or TypeScript + bundler if adding more features (e.g., multi-currency support, advanced charts).

**Browser dependency on WebAuthn/SubtleCrypto:**
- Issue: PIN hashing uses `crypto.subtle.digest()` (line 1320), WebAuthn APIs (lines 1493–1535). Older browsers or certain environments may not support.
- Files: `index.html` (lines 1318–1335, 1487–1535)
- Impact: App may fail silently on unsupported browsers. No polyfill or fallback.
- Fix approach: Add feature detection and graceful degradation. If crypto unavailable, use server-side PIN hashing via Supabase function.

---

*Concerns audit: 2026-03-26*
