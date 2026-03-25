# Phase 2: Error Handling & Logging - Research

**Researched:** 2026-03-26
**Domain:** JavaScript error handling patterns, structured logging, user feedback UX
**Confidence:** HIGH

---

## Summary

Phase 2 targets four requirements: ERROR-01 (log DB errors with full context), ERROR-02 (specific user-facing messages), ERROR-03 (async load failures show feedback), ERROR-04 (enough context to diagnose production issues). The codebase already has a `toast()` function and scattered `if (error)` checks, but none of them log the error object — they swallow it silently. No structured logging abstraction exists.

The fix is entirely within `index.html`. No new libraries are needed. The work is: (1) add a lightweight `logError()` helper that `console.error`s the full error object with contextual metadata, (2) replace every silent `if (error) { toast('generic msg'); return; }` call with one that also calls `logError()`, (3) add `.catch()` to the two bare `Promise.all()` calls so load failures surface as toasts instead of blank screens, and (4) improve toast message specificity by parsing Supabase error codes.

**Primary recommendation:** Add a 10-line `logError(context, error)` helper, then do a targeted sweep of all Supabase call sites (approximately 12 locations) to ensure every error path calls it and emits a specific toast message.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ERROR-01 | Database operation failures log full error details (not silent) | `logError()` helper pattern — all Supabase error objects passed to `console.error` with operation context |
| ERROR-02 | User sees clear error message when database operations fail | Supabase error code parsing — map `error.code` / `error.message` to human-readable strings |
| ERROR-03 | Async data load failures show user feedback (not blank state) | `.catch()` added to bare `Promise.all([loadLabels(), loadMonthTotals()])` at lines 1363 and 1670 |
| ERROR-04 | All Supabase query errors include context for debugging | `logError(context, error)` signature — context includes operation name, function name, relevant IDs |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (vanilla JS) | — | Error handling | No-build single-file constraint; all patterns implemented inline |

### Supporting
| Pattern | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `console.error(context, error)` | Browser API | Structured error output | Always — gives DevTools stack traces and full object inspection |
| `toast(msg)` (existing) | Inline | User-facing feedback | All user-visible error messages; already wired to DOM |
| Supabase error object | JS client | Error detail source | `error.code`, `error.message`, `error.hint`, `error.details` fields |

**Installation:** None required. All patterns are vanilla JS within the existing `index.html`.

---

## Architecture Patterns

### Recommended Project Structure
No structural change. All additions stay within `index.html`'s `<script>` block.

```
index.html <script>
  ├── logError(context, error)    ← NEW: single helper near UTILS section (~line 1585)
  ├── errorToast(error, fallback) ← NEW: error-code-to-message mapper
  ├── loadLabels()                ← PATCH: add error destructuring + logError call
  ├── loadMonthTotals()           ← PATCH: add error destructuring + logError call
  ├── loadHistory()               ← PATCH: already has error check; add logError
  ├── saveExpense()               ← PATCH: add logError + specific message
  ├── saveEdit()                  ← PATCH: add logError + specific message
  ├── deleteExpense()             ← PATCH: add logError + specific message
  ├── deleteLabel()               ← PATCH: add logError + specific message
  ├── renameLabelPrompt()         ← PATCH: add logError + specific message
  ├── renderManageLabels inline   ← PATCH: add logError + specific message
  ├── onSignedIn() Promise.all    ← PATCH: add .catch() handler
  └── unlockToNumpad() Promise.all ← PATCH: add .catch() handler
```

### Pattern 1: logError Helper
**What:** A single function that console.errors the full Supabase error object with structured context metadata.
**When to use:** Every `if (error)` block that follows a Supabase `await`.
**Example:**
```javascript
// Source: Verified from Supabase JS client error object shape (official docs)
function logError(context, error) {
  console.error('[SpendTracker]', context, {
    message: error?.message,
    code: error?.code,
    hint: error?.hint,
    details: error?.details,
    status: error?.status,
    raw: error,
    timestamp: new Date().toISOString(),
    user: currentUser?.id || 'unauthenticated',
    screen
  });
}
```

### Pattern 2: errorToast — Specific Message Mapping
**What:** Maps Supabase error codes/messages to specific human-readable strings.
**When to use:** Replace all generic `toast('Could not [action]')` calls.
**Example:**
```javascript
// Supabase error codes: https://postgrest.org/en/stable/errors.html
function errorToast(error, fallback) {
  const msg = error?.message || '';
  if (!navigator.onLine || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    toast('Network error — check your connection and try again');
    return;
  }
  if (error?.code === '42501' || msg.includes('permission denied') || msg.includes('violates row-level security')) {
    toast('Permission denied — you may not have access to this data');
    return;
  }
  if (error?.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
    toast('Already exists — try a different name');
    return;
  }
  if (error?.status === 401 || msg.includes('JWT') || msg.includes('session')) {
    toast('Session expired — please sign in again');
    return;
  }
  toast(fallback || 'Something went wrong — try again');
}
```

### Pattern 3: Promise.all Catch Handler
**What:** Adds `.catch()` to bare Promise.all calls so load failures surface as toasts.
**When to use:** Lines 1363 and 1670 — the two `Promise.all([loadLabels(), loadMonthTotals()])` calls.
**Example:**
```javascript
// Current (silent failure):
Promise.all([loadLabels(), loadMonthTotals()]).then(() => refreshDisplay());

// Fixed:
Promise.all([loadLabels(), loadMonthTotals()])
  .then(() => refreshDisplay())
  .catch(err => {
    logError('onSignedIn/Promise.all', err);
    toast('Could not load your data — pull to refresh or reload the page');
  });
```

### Pattern 4: loadHistory Error as Toast (ERROR-03)
**What:** `loadHistory()` already shows "Could not load." inline. Add a toast for screens that might call it in the background (connectivity watch, realtime handlers).
**When to use:** Any code path where history load failure wouldn't visibly update a list element.
**Example:**
```javascript
// In loadHistory() — augment existing check:
if (error || !data) {
  logError('loadHistory', error);
  list.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:28px 0;text-align:center">Could not load transactions — tap to retry</div>`;
  toast('Could not load transactions — check your connection');
  return;
}
```

### Anti-Patterns to Avoid
- **Silent error swallow:** `if (error) { toast('msg'); return; }` — never omit `logError` call.
- **Generic toast only:** `toast('Could not add label')` with no `logError` — violates ERROR-01 and ERROR-04.
- **Logging without toast:** `logError(...)` with no user message on user-triggered operations — violates ERROR-02.
- **Re-throwing from UI handlers:** Throwing errors from button click handlers crashes the app; always handle locally.
- **Alerting on every background operation:** Connectivity watch, realtime handlers — log errors, but don't toast on every background retry to avoid noise.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error monitoring/alerting | Custom error reporting service | `console.error` with structured context | No build system, no server for Sentry DSN; console is accessible via browser DevTools and Vercel log drains |
| Toast queue | Custom queuing system | Existing `toast()` with clearTimeout | `toast()` already debounces via `el._t`; no queue needed for Phase 2 scope |
| Network detection | Custom polling | `navigator.onLine` + existing `online` event in `setupConnectivityWatch()` | Already implemented; just read `navigator.onLine` in `errorToast()` |
| Error class hierarchy | Custom `AppError` extends `Error` | Direct `logError(context, supabaseError)` function | Over-engineering for a single-file app; context string is sufficient |

**Key insight:** The Supabase JS client always returns `{ data, error }` — it never throws. Every `const { data, error } = await db.from(...)` already catches network and server errors in the `error` object. The fix is logging + message specificity, not new try/catch infrastructure.

---

## Common Pitfalls

### Pitfall 1: loadLabels Silently Ignores the Error Object
**What goes wrong:** `loadLabels()` at line 2430 does `const {data} = await db.from('labels')...` — it destructures only `data`, discarding `error`. If the query fails, `labels` stays as whatever was in localStorage cache (or empty), and the user sees no feedback.
**Why it happens:** The pattern `if (data) { ... }` implicitly ignores the error path.
**How to avoid:** Destructure both: `const { data, error } = ...`. Then check error first.
**Warning signs:** Labels not loading after sign-in with no visible error.

### Pitfall 2: Promise.all Rejection Goes Unhandled
**What goes wrong:** `Promise.all([loadLabels(), loadMonthTotals()]).then(...)` at lines 1363 and 1670 has no `.catch()`. If either async function rejects (e.g., network timeout throws), the Promise.all rejects silently. The user sees a numpad with no labels and no feedback.
**Why it happens:** Both functions are designed to return early on error (not throw), but network timeouts or Supabase library errors can still reject the promise.
**How to avoid:** Always `.catch()` a Promise.all that calls async functions.
**Warning signs:** Blank chips grid after sign-in with no console errors visible.

### Pitfall 3: Logging the Error Object After Destructuring
**What goes wrong:** If you do `const { error } = await db.from(...)` and then `console.log(error)`, you get the Supabase `PostgrestError` shape but not the full HTTP response. The `.raw` field in `logError` preserves the full object for inspection.
**Why it happens:** Supabase errors are plain objects — no prototype methods, no `.stack` property.
**How to avoid:** Log `{ ...error }` or pass the raw error object directly. Never stringify before logging — it loses the object structure in DevTools.

### Pitfall 4: Overloading Users with Error Toasts on Background Operations
**What goes wrong:** `setupConnectivityWatch()` calls `loadHistory()` on every `online` event. If logging errors also shows a toast on background retries, users get interrupted unnecessarily.
**Why it happens:** Treating background operations the same as user-triggered ones.
**How to avoid:** Distinguish user-triggered operations (always show toast) from background operations (log error, show toast only on first failure, not on retries). For Phase 2, background operations should call `logError` but skip the toast — a comment to note this is sufficient.

### Pitfall 5: Generic Message When Network is the Real Cause
**What goes wrong:** "Could not save" shows when the real cause is no internet. User retries endlessly instead of checking connectivity.
**Why it happens:** No `navigator.onLine` check before showing generic message.
**How to avoid:** `errorToast()` pattern checks `navigator.onLine` first and emits "Network error — check your connection" before falling through to generic.

---

## Code Examples

Verified patterns from official sources:

### Supabase Error Object Shape
```javascript
// Source: Supabase JS client v2 docs — error object always has this shape
// https://supabase.com/docs/reference/javascript/error-handling
const { data, error } = await db.from('expenses').insert(payload);
// error shape when present:
// {
//   message: "string",    // human-readable description
//   code: "string",       // PostgreSQL error code (e.g. "23505" = unique violation)
//   hint: "string",       // optional hint from Postgres
//   details: "string",    // optional detail from Postgres
//   status: number        // HTTP status code (401, 403, 422, etc.)
// }
```

### Full logError + errorToast Usage at a Call Site
```javascript
// Before (current pattern at line 2779):
if (error) { btn.disabled=false; toast('Could not save. Try again.'); return; }

// After (Phase 2 pattern):
if (error) {
  logError('saveExpense', error);
  btn.disabled = false;
  errorToast(error, 'Could not save — try again');
  return;
}
```

### loadLabels with Error Destructuring
```javascript
// Before (current, line 2430):
const {data}=await db.from('labels').select('*').order('created_at',{ascending:false});
if (data) { labels=data; localStorage.setItem(labelCacheKey(),JSON.stringify(labels)); renderChips(); }

// After:
const { data, error } = await db.from('labels').select('*').order('created_at', { ascending: false });
if (error) {
  logError('loadLabels', error);
  // Don't overwrite labels — keep stale cache. Toast only if no cached data available.
  if (!labels.length) toast('Could not load labels — using cached data if available');
  return;
}
if (data) { labels = data; localStorage.setItem(labelCacheKey(), JSON.stringify(labels)); renderChips(); }
```

---

## All Supabase Call Sites Requiring Patching

This is a complete inventory derived from direct codebase inspection (HIGH confidence):

| Location | Function | Current Error Handling | Fix Required |
|----------|----------|----------------------|--------------|
| Line 1670 | `onSignedIn()` | No `.catch()` on Promise.all | Add `.catch()` with logError + toast |
| Line 1363 | `unlockToNumpad()` | No `.catch()` on Promise.all | Add `.catch()` with logError + toast |
| Line 2430 | `loadLabels()` | Discards error (only `{data}`) | Destructure `{data, error}`, logError if error |
| Line 2534 | `loadMonthTotals()` | `if (!data) return` — no error var | Destructure `{data, error}`, logError if error |
| Line 2755-2756 | `addLabel()` | `toast('Could not add label')` — no log | Add logError, use errorToast |
| Line 2652-2653 | `renameLabelPrompt()` | `toast('Could not rename')` — no log | Add logError, use errorToast |
| Line 2671-2672 | `deleteLabel()` | `toast('Could not delete label')` — no log | Add logError, use errorToast |
| Line 2714-2716 | `renderManageLabels` inline edit | `toast('Could not rename')` — no log | Add logError, use errorToast |
| Line 2777-2779 | `saveExpense()` | `toast('Could not save. Try again.')` — no log | Add logError, use errorToast |
| Line 2797-2798 | `loadHistory()` | Inline "Could not load." — no log, no toast | Add logError + toast for background callers |
| Line 2909-2910 | `deleteExpense()` | `toast('Could not delete')` — no log | Add logError, use errorToast |
| Line 2968-2970 | `saveEdit()` | `toast('Could not save')` — no log | Add logError, use errorToast |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `console.log(error)` | `console.error(context, errorObj)` with structured fields | Modern DevTools best practice | Object appears expandable in DevTools, not serialized string |
| Generic "Something went wrong" | Network-aware messages checking `navigator.onLine` | Standard UX pattern | Users understand what to do next |
| `throw` in async UI handlers | Return early with `if (error)` guard | Supabase JS v2 convention | Supabase never throws; always returns `{ data, error }` |

**Deprecated/outdated:**
- Try/catch wrappers around Supabase calls: Unnecessary. Supabase JS v2 always returns `{ data, error }`, never throws for DB operations. Try/catch is still appropriate for network-level failures (e.g., Supabase not reachable), but for DB operation errors the error object is always returned.

---

## Open Questions

1. **Should production errors be sent to an external monitoring service (Sentry, etc.)?**
   - What we know: No Sentry DSN exists; no build system to inject it; Vercel provides log drains for console output.
   - What's unclear: Whether the user wants external error monitoring beyond `console.error`.
   - Recommendation: Phase 2 stays with `console.error` only (YOLO mode, minimal scope). External monitoring is a v2 concern. Document this as a follow-up.

2. **Should loadLabels cache fallback show a toast even on background refresh?**
   - What we know: `loadLabels()` is called both on sign-in (user-facing) and potentially on visibility restore (background).
   - What's unclear: Whether a toast on every background refresh failure is too noisy.
   - Recommendation: Only toast if `labels.length === 0` (no cache available). If cache exists and background refresh fails, log silently.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — zero test coverage per TESTING.md |
| Config file | none |
| Quick run command | Manual verification in browser DevTools |
| Full suite command | Manual verification in browser DevTools |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERROR-01 | `logError()` logs full error object to console | manual | Open DevTools > Console, trigger a DB error, verify structured log entry appears | ❌ Wave 0 |
| ERROR-02 | Network offline shows "Network error" toast; generic DB error shows specific message | manual | Toggle DevTools > Network offline, attempt save, verify toast message | ❌ Wave 0 |
| ERROR-03 | `loadLabels()` or `loadMonthTotals()` failure shows toast instead of blank | manual | Block Supabase endpoint in DevTools, sign in, verify toast appears | ❌ Wave 0 |
| ERROR-04 | Console log entry includes `user`, `screen`, `timestamp`, `code`, `message` | manual | Inspect console output from ERROR-01 test above | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Visual inspection in browser DevTools console
- **Per wave merge:** Full manual test of all 4 requirements against the checklist above
- **Phase gate:** All 4 manual test scenarios pass before `/gsd:verify-work`

### Wave 0 Gaps
- No automated test infrastructure applies (single-file browser app, no test runner)
- Verification relies on a manual checklist:
  - [ ] DevTools Network tab: block Supabase hostname, attempt expense save → "Network error" toast + `[SpendTracker]` console entry
  - [ ] DevTools Network tab: simulate 403 response on labels fetch → toast with specific message + console entry
  - [ ] Disconnect internet, sign in → `Promise.all` catch fires → "Could not load your data" toast appears
  - [ ] Console entry includes `{ message, code, hint, details, status, user, screen, timestamp }` fields

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `index.html` lines 1363, 1580-1585, 1609-1691, 2426-2432, 2532-2538, 2750-2756, 2770-2785, 2790-2803, 2904-2917, 2949-2977 — all Supabase call sites and existing error patterns
- `.planning/codebase/CONCERNS.md` — Error Handling Gaps section (lines 19-31) — lists exact line numbers and patterns
- `.planning/codebase/ARCHITECTURE.md` — Error Handling section confirming "errors swallowed in try-catch blocks"

### Secondary (MEDIUM confidence)
- Supabase JS v2 error object shape: `{ message, code, hint, details, status }` — standard documented fields across Supabase JS client documentation

### Tertiary (LOW confidence)
- PostgREST error codes (42501 = permission denied, 23505 = unique violation) — standard PostgreSQL codes, stable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; patterns confirmed against actual codebase
- Architecture: HIGH — all 12 call sites identified via direct inspection
- Pitfalls: HIGH — identified from actual code patterns (line numbers cited)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain — vanilla JS error handling patterns do not change rapidly)
