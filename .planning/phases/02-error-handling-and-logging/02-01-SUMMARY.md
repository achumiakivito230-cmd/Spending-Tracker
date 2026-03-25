---
phase: 02-error-handling-and-logging
plan: 01
subsystem: error-handling
tags: [supabase, logging, error-handling, toast, promise]

# Dependency graph
requires:
  - phase: 01-data-synchronization
    provides: loadLabels, loadMonthTotals, onSignedIn, unlockToNumpad call sites
provides:
  - logError(context, error) helper with structured [SpendTracker] console.error output
  - errorToast(error, fallback) helper with navigator.onLine network check and error-code mapping
  - Error destructuring in loadLabels() and loadMonthTotals()
  - .catch() handlers on both Promise.all data-load chains
affects:
  - 02-error-handling-and-logging (Plan 02 mutation-site patching builds on these helpers)
  - 03-state-management
  - 04-security-fixes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - logError(context, error) structured logging pattern for all Supabase call sites
    - errorToast(error, fallback) as the standard user-facing error mapper
    - Promise.all .catch() pattern for all parallel data-load chains

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "loadLabels toast fires only when labels.length === 0 (no stale cache) — background refresh failure logs silently to avoid interrupting users with cached data"
  - "loadMonthTotals does not toast on error — background aggregation; Promise.all .catch() handles user-facing feedback for the full load failure case"
  - "errorToast navigator.onLine check is first condition — network errors are the most common failure mode and get the most specific message"

patterns-established:
  - "Pattern: Always call logError(context, error) before returning from an error path in any Supabase async function"
  - "Pattern: Promise.all data-load chains must always have .catch(err => { logError(...); toast(...); })"
  - "Pattern: Destructure { data, error } not just { data } from all Supabase query responses"

requirements-completed:
  - ERROR-01
  - ERROR-03
  - ERROR-04

# Metrics
duration: 10min
completed: 2026-03-26
---

# Phase 2 Plan 1: Error Handling Helpers and Data-Load Call Sites Summary

**logError + errorToast helpers added to index.html; loadLabels, loadMonthTotals, and both Promise.all sign-in/unlock chains patched to eliminate silent blank state on data load failure**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-26T00:00:00Z
- **Completed:** 2026-03-26T00:10:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Added `logError(context, error)` with structured [SpendTracker] console.error including 9 fields: message, code, hint, details, status, raw, timestamp, user, screen
- Added `errorToast(error, fallback)` with navigator.onLine network check, RLS permission mapping, duplicate key mapping, and session-expired mapping
- Patched `loadLabels()` to destructure `{ data, error }`, log on error, and show toast only when no cached labels exist
- Patched `loadMonthTotals()` to destructure `{ data, error }` and log on error silently
- Added `.catch()` to both `Promise.all([loadLabels(), loadMonthTotals()])` calls in `unlockToNumpad()` and `onSignedIn()`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add logError and errorToast helper functions** - `ac63e3c` (feat)
2. **Task 2: Patch loadLabels and loadMonthTotals to destructure and log errors** - `dff7e6b` (fix)
3. **Task 3: Add .catch() to both bare Promise.all calls** - `f84ba8c` (fix)

## Files Created/Modified
- `index.html` - Added error helpers after `toast()`, patched both load functions and both Promise.all chains

## Decisions Made
- loadLabels toast only when `!labels.length`: if cache exists, background refresh failure is silent — avoids noisy toasts when the user already sees data
- loadMonthTotals does not toast: it is a background aggregation function; the Promise.all .catch() covers user-facing feedback for the overall load failure
- navigator.onLine as first condition in errorToast: network errors are the most common real-world cause of Supabase failures; most specific message should appear first

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error helpers are now available for Plan 02 (mutation-site patching: saveExpense, deleteExpense, addLabel, etc.)
- Both data-load paths are covered; Plan 02 covers write paths
- No blockers

---
*Phase: 02-error-handling-and-logging*
*Completed: 2026-03-26*
