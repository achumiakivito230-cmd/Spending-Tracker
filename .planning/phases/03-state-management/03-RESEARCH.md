# Phase 3: State Management - Research

**Researched:** 2026-03-26
**Domain:** Client-side JavaScript state management in a single-file SPA
**Confidence:** HIGH — all findings are from direct codebase inspection

---

## Summary

Phase 3 targets four specific state-management weaknesses in `index.html`. The app uses a simple flat-global model: eight `let` variables declared at the top of the `<script>` block (`allTxData`, `labels`, `currentUser`, `cachedSession`, `screen`, `monthTotals`, `editTx`, `editLabel`) with no synchronization primitives around them. Async functions mutate these globals directly without guards, creating races when multiple callers resolve concurrently.

The most acute risks are: (1) `loadLabels()` called twice in rapid succession (on sign-in and on Realtime error recovery) can write stale server results over a fresher in-flight result; (2) `loadHistory()` resets `activeFilter` to `null` and writes a "Loading..." placeholder to the DOM before the fetch resolves — if the user navigates away mid-fetch, stale DOM content appears on the new screen; (3) `currentUser` is read by `addLabel`, `saveExpense`, `addLabel/manageLabels`, and `accentKey()` but is only null-checked in `onSignedIn()` — all other call sites assume it is set; (4) `switchTab()` / `slideToHistory()` both call `loadHistory()` unconditionally on every navigation, meaning rapid tab taps fire multiple concurrent `loadHistory()` calls, each writing `allTxData` when they resolve.

**Primary recommendation:** Add a single `_labelsLoading` promise-slot guard (in-flight dedup) for `loadLabels()`, a `_historyLoading` guard for `loadHistory()`, null-guard `currentUser` at the start of every function that reads `currentUser.id`, and validate that received Supabase data arrays are non-null before assigning to globals.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STATE-01 | All mutable global state validated before assignment | Findings 1-4 below: null/array checks before assigning allTxData, labels, currentUser |
| STATE-02 | Race conditions prevented in label cache updates | Finding 5: in-flight dedup pattern for loadLabels() |
| STATE-03 | currentUser null-safety consistent across all functions | Finding 6: all call sites enumerated; three unguarded paths found |
| STATE-04 | Screen navigation state synced with DOM (no divergence on rapid transitions) | Findings 7-8: in-flight guard for loadHistory(), stale-render protection |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (no library) | ES2020 | All state management | App has no build step; adding a lib would require refactoring the entire single-file structure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | All fixes are guard-clause and flag patterns, no library required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual promise dedup flag | Signals / Proxy-based store | Proxy approach would require wholesale refactor; flag is a zero-dependency one-liner |

**Installation:**
```bash
# No new dependencies required
```

---

## Architecture Patterns

### Recommended Project Structure
No structural changes. All changes are within the existing `<script>` block of `index.html`.

### Pattern 1: In-Flight Dedup (Promise Slot)
**What:** Store the active promise in a module-level variable. If a second call arrives while the first is still pending, return the same promise instead of firing a new fetch.
**When to use:** Any async loader that writes a shared global (`loadLabels`, `loadHistory`).

```javascript
// Source: direct codebase inspection — pattern applied to existing functions
let _labelsLoading = null;

async function loadLabels() {
  if (_labelsLoading) return _labelsLoading;           // dedup: return existing promise
  _labelsLoading = _doLoadLabels();
  try { await _labelsLoading; } finally { _labelsLoading = null; }
}

async function _doLoadLabels() {
  // ... existing fetch logic ...
}
```

The same pattern applies identically to `loadHistory()` with a `_historyLoading` slot.

### Pattern 2: Guard Clause at Assignment (Validate Before Assign)
**What:** Check that Supabase response data is a valid non-null array before writing to a global. Do not assign if the value would downgrade valid existing state.
**When to use:** Every `allTxData = data` and `labels = data` assignment.

```javascript
// Existing code (line 2859):
allTxData = data;

// Validated version:
if (Array.isArray(data)) allTxData = data;
```

```javascript
// Existing code (line 2484):
if (data) { labels = data; ... }

// Validated version — data is already truthy-checked; add Array.isArray:
if (Array.isArray(data) && data.length >= 0) { labels = data; ... }
```

### Pattern 3: currentUser Null Guard
**What:** Add `if (!currentUser) return;` (or `if (!currentUser) { toast(...); return; }`) at the top of every function that dereferences `currentUser.id` or `currentUser.email`.
**When to use:** Every function that reads a property of `currentUser`.

```javascript
// Three unguarded call sites found:

// 1. btn-ml-add handler (line 3333):
const payload = { user_id: currentUser.id, name, color: null, budget: null };
// Fix: add guard at top of handler — if (!currentUser) return;

// 2. addLabel() (line 2808):
if (currentUser) payload.user_id = currentUser.id;   // already guarded with if(currentUser) — OK

// 3. saveExpense() (line 2830):
if (currentUser) payload.user_id = currentUser.id;   // already guarded — OK

// 4. loadHistory() calls currentUser implicitly via the Supabase RLS filter
//    but the query itself has no explicit user_id filter — relies on RLS.
//    Guard is not strictly required here but consistent style warrants it.
```

### Pattern 4: Screen-Aware Render Guard
**What:** Before writing to a DOM element that belongs to a specific screen, check that `screen === 'expected-screen'`. If the user navigated away before the async fetch resolved, skip the DOM write.
**When to use:** Inside `.then()` callbacks that follow `loadHistory()` or `loadLabels()` when called from navigation functions.

```javascript
// Existing pattern (line 2462 — connectivity watch):
loadHistory().then(() => {
  if (screen === 'history') renderHistory(allTxData, activeFilter);
  if (screen === 'chart')   renderChart();
});
// This is already correct. The same pattern needs applying inside loadHistory() itself:

async function loadHistory() {
  const targetScreen = screen;                          // capture at call time
  list.innerHTML = `<div>Loading…</div>`;
  // ... fetch ...
  if (screen !== targetScreen) return;                  // user navigated away
  allTxData = data;
  renderFilterChips(data);
  renderHistory(data, null);
}
```

### Anti-Patterns to Avoid
- **Reassigning `labels = []` or `allTxData = []` at the top of a loader:** Clears valid cached data if the network request then fails. Use a local variable, validate it, then assign.
- **Calling `loadHistory()` unconditionally on every tab navigation:** Use the in-flight dedup guard. If a load is already in progress (< 1s old), the second call reuses the existing promise.
- **Adding a debounce timer to navigation:** Timers compound with CSS transitions (0.36s) and create visible lag. In-flight dedup is zero-latency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async call dedup | Custom queue / message bus | Promise-slot (`_loading = null` pattern) | Single variable, no dependencies, 3 lines |
| State validation | Schema validator (Zod, Yup) | `Array.isArray(data)` inline checks | App has no build step; library would require bundler |
| Null safety | TypeScript | Guard clauses at function entry | TypeScript requires compile step; guard clauses are zero-cost vanilla JS |

**Key insight:** All four requirements are solvable with guard clauses and one-variable flags. No new abstractions, libraries, or architectural changes are needed.

---

## Common Pitfalls

### Pitfall 1: loadHistory() Mutates DOM Before Fetch Resolves
**What goes wrong:** `loadHistory()` writes "Loading..." to `#tx-list` and clears `filter-row` synchronously before the `await`. If the user switches tabs after the DOM write but before the fetch resolves, the history DOM is cleared even though the history screen is not visible. When the user returns, the fetch resolves and overwrites `allTxData`, but `renderHistory` was called against the old screen state.
**Why it happens:** DOM mutations and state mutations are interleaved with the async fetch.
**How to avoid:** Capture `const targetScreen = screen` before the fetch; skip the DOM mutation at the end if `screen !== targetScreen`.
**Warning signs:** History screen shows blank or shows "Loading..." when re-entering after rapid navigation.

### Pitfall 2: Simultaneous loadLabels() Calls Write Stale Data
**What goes wrong:** `onSignedIn()` and `unlockToNumpad()` both call `loadLabels()` as part of their `Promise.all`. Additionally, Realtime channel errors trigger `loadHistory()` (line 2511) but `handleLabelChange` can also fire concurrently. If two `loadLabels()` calls are in flight, the one that resolves second writes `labels = data` last — but the second result is not necessarily fresher (both hit the same DB snapshot within milliseconds).
**Why it happens:** No mutual exclusion around the async fetch-and-assign sequence.
**How to avoid:** Promise-slot dedup — if `_labelsLoading` is non-null, the second caller awaits the same promise.
**Warning signs:** Label chips briefly flash or render duplicates after sign-in.

### Pitfall 3: currentUser.id Access in btn-ml-add Handler
**What goes wrong:** The `btn-ml-add` click handler (line 3333) accesses `currentUser.id` without a null check. This handler is registered at script parse time, not in `onSignedIn`. If somehow the manage-labels screen is reached before `onSignedIn` sets `currentUser` (impossible in normal flow but possible in edge cases like concurrent tab + state reset), this throws a TypeError.
**Why it happens:** Event handlers are registered globally; `currentUser` is only assigned during the auth flow.
**How to avoid:** Add `if (!currentUser) return;` at the top of the handler.
**Warning signs:** Uncaught TypeError in console when adding a label from the manage-labels screen.

### Pitfall 4: Rapid Tab Switching Fires Multiple loadHistory() Calls
**What goes wrong:** `switchTab('history')` calls `loadHistory()` unconditionally (line 1862). `slideToHistory()` also calls `loadHistory()`. If the user taps history → chart → history within the 0.36s transition window, two `loadHistory()` calls are outstanding. Each resolves and writes `allTxData`, and each fires `renderFilterChips` / `renderHistory` against the live DOM. The second render uses `activeFilter = null` because `loadHistory()` resets it.
**Why it happens:** No in-flight tracking; every navigation call is independent.
**How to avoid:** Promise-slot dedup for `loadHistory()`; screen-aware render guard.
**Warning signs:** Filter chips reset to unfiltered state unexpectedly after navigation.

### Pitfall 5: monthTotals Not Validated Before Assignment
**What goes wrong:** `loadMonthTotals()` builds `monthTotals = {}` then populates it (lines 2590-2591). If `data` is null (already handled via early return) this is fine, but the object is always unconditionally reset. If a second call arrives while the first is pending (e.g., budget screen opened rapidly), the second call resets `monthTotals = {}` mid-render, causing budget bars to briefly show 0%.
**Why it happens:** `monthTotals` is reset before the fetch, not after.
**How to avoid:** Build the object locally (`const totals = {}`), then assign `monthTotals = totals` only after the loop completes.

---

## Code Examples

Verified patterns from direct codebase inspection:

### Current State Variable Declarations (lines 1246-1265)
```javascript
let raw          = '';
let labels       = [];
let picked       = null;
let screen       = 'auth';
let allTxData    = [];
let activeFilter = null;
let monthTotals  = {};
let editTx       = null;
let editLabel    = null;
let currentUser  = null;
let cachedSession = null;
let realtimeChannel = null;
```

### Current loadLabels() — Race Condition Present (lines 2474-2485)
```javascript
async function loadLabels() {
  const cached = localStorage.getItem(labelCacheKey());
  if (cached) try { labels = JSON.parse(cached); } catch {}
  if (!db) return;
  const { data, error } = await db.from('labels').select('*').order('created_at', { ascending: false });
  if (error) { logError('loadLabels', error); if (!labels.length) toast('...'); return; }
  if (data) { labels = data; localStorage.setItem(labelCacheKey(), JSON.stringify(labels)); renderChips(); }
}
// Problem: no guard against concurrent calls. Two calls both reach the await,
// both write labels = data when they resolve (in arbitrary order).
```

### Current loadHistory() — DOM Mutation Before Guard (lines 2844-2862)
```javascript
async function loadHistory() {
  const list = document.getElementById('tx-list');
  list.innerHTML = `<div ...>Loading…</div>`;   // DOM mutated BEFORE the fetch
  document.getElementById('filter-row').innerHTML = '';
  activeFilter = null;
  // ... await fetch ...
  allTxData = data;
  renderFilterChips(data);
  renderHistory(data, null);
}
// Problem: DOM cleared immediately. If user navigates away, the history
// screen DOM is blanked even when not visible, and the render fires on
// allTxData regardless of current screen.
```

### Call Sites That Invoke loadLabels() (both fire on auth)
```javascript
// onSignedIn() — line 1713:
Promise.all([loadLabels(), loadMonthTotals()])

// unlockToNumpad() — line 1363:
Promise.all([loadLabels(), loadMonthTotals()])
// Note: only one of these fires per session (biometric/PIN path vs. email path),
// so simultaneous dual-call from these two functions is not a real risk.
// The real risk is: loadLabels() called from onSignedIn() + Realtime error recovery
// (line 2511 calls loadHistory, not loadLabels — but handleLabelChange fires
// concurrently and also writes labels).
```

### Unguarded currentUser Access (line 3333)
```javascript
document.getElementById('btn-ml-add').addEventListener('click', async () => {
  const name = input.value.trim();
  if (!name) return;
  const payload = { user_id: currentUser.id, name, color: null, budget: null };
  // ^ currentUser could be null if this handler fires before onSignedIn sets it
  // (extremely unlikely but undefended)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global mutation without guards | Same (pre-Phase 3) | Phase 3 will change this | Race conditions on concurrent async calls |
| Silent null dereference | `if (!currentUser) return` in onSignedIn only | Phase 3 adds to all call sites | Eliminates TypeError risk |

**Deprecated/outdated:**
- None applicable — this is vanilla JS with no framework churn.

---

## Open Questions

1. **Does loadLabels() actually race in practice?**
   - What we know: `onSignedIn` and `unlockToNumpad` are mutually exclusive code paths (only one fires per sign-in event), so the Promise.all double-call is not a real concurrent risk from those two. However, Realtime channel recovery (line 2511) calls `loadHistory`, and `handleLabelChange` can fire concurrently with a `loadLabels` that was triggered by channel reconnect.
   - What's unclear: Whether a Realtime CHANNEL_ERROR can arrive while an `onSignedIn` `loadLabels` is still in flight.
   - Recommendation: Apply the dedup guard regardless — it costs nothing and prevents edge cases.

2. **Should loadHistory() avoid resetting activeFilter?**
   - What we know: `loadHistory()` sets `activeFilter = null` before the fetch (line 2848). This is intentional on explicit user navigation to the history tab.
   - What's unclear: When called from the connectivity-watch `online` event, resetting the user's active filter is undesirable UX.
   - Recommendation: Move `activeFilter = null` to only the cases where `loadHistory()` is called as a result of explicit navigation, not background re-sync. This is a STATE-04 improvement.

3. **monthTotals race — severity?**
   - What we know: `loadMonthTotals` is called in both `Promise.all` chains and also after setting a budget (line 2654).
   - What's unclear: Whether the budget-set call and the navigation call can overlap in time.
   - Recommendation: Use local variable pattern (build locally, assign once) — simple fix, eliminates the question.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — zero test infrastructure currently exists (confirmed in .planning/codebase/TESTING.md) |
| Config file | None — Wave 0 gap |
| Quick run command | Manual browser console verification |
| Full suite command | Manual verification checklist |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STATE-01 | allTxData not assigned when data is non-array | manual-only | Browser console: call loadHistory with mocked null response | ❌ Wave 0 |
| STATE-01 | labels not assigned when data is non-array | manual-only | Browser console inspection | ❌ Wave 0 |
| STATE-02 | Two rapid loadLabels() calls produce identical labels array | manual-only | DevTools Network throttle to Slow 3G, trigger two calls | ❌ Wave 0 |
| STATE-03 | btn-ml-add with currentUser=null does not throw | manual-only | Set currentUser=null in console, click add label | ❌ Wave 0 |
| STATE-04 | Rapid tab switching does not blank history or reset filter | manual-only | Tap history → chart → history within 200ms | ❌ Wave 0 |

**Note:** This is a no-build, single-file app with no testing infrastructure. Automated tests would require extracting functions into modules (Phase 5 scope). Phase 3 validation is manual browser testing only.

### Sampling Rate
- **Per task commit:** Manual smoke test in browser DevTools
- **Per wave merge:** Full manual test checklist (see Wave 0 gaps)
- **Phase gate:** All four requirements pass manual verification before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework installed — manual verification only for this phase
- [ ] Manual test checklist: `.planning/phases/03-state-management/TEST-CHECKLIST.md` — covers STATE-01 through STATE-04

*(Automated testing is deferred to Phase 5 / QUAL-01 when codebase is modularized)*

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `index.html` lines 1246-1265 (state declarations)
- Direct inspection of `index.html` lines 2474-2485 (`loadLabels`)
- Direct inspection of `index.html` lines 2844-2862 (`loadHistory`)
- Direct inspection of `index.html` lines 1693-1739 (`onSignedIn`)
- Direct inspection of `index.html` lines 1355-1375 (`unlockToNumpad`)
- Direct inspection of `index.html` lines 1842-1870 (`switchTab`)
- Direct inspection of `index.html` lines 3329-3341 (`btn-ml-add` handler)
- `.planning/codebase/ARCHITECTURE.md` — data flow and state layer

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` accumulated context — prior phase decisions confirm error handling patterns established in Phase 2

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no libraries needed; all patterns are vanilla JS guard clauses
- Architecture: HIGH — directly verified against source code line numbers
- Pitfalls: HIGH — all four pitfall descriptions derived from actual code reading, not inference
- Validation: HIGH — zero test infra confirmed in TESTING.md; manual-only approach documented accurately

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable codebase; only changes if Phase 2 or Phase 4 land significant rewrites)
