---
phase: 03-state-management
plan: 01
subsystem: database
tags: [supabase, promise-slot, dedup, race-condition, array-guard]

# Dependency graph
requires:
  - phase: 02-error-handling-and-logging
    provides: logError() utility and toast() error paths that the patched functions rely on
provides:
  - _labelsLoading promise-slot dedup guard on loadLabels()
  - Array.isArray guard before allTxData assignment in loadHistory()
  - Local accumulator pattern in loadMonthTotals() for atomic monthTotals assignment
affects:
  - 03-state-management (plans 02+)
  - Any future plan touching loadLabels, loadHistory, or loadMonthTotals

# Tech tracking
tech-stack:
  added: []
  patterns:
    - promise-slot dedup (let _labelsLoading = null shell)
    - Array.isArray guard before global array assignment
    - local-accumulator pattern for atomic object replacement

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "Promise-slot dedup via _labelsLoading null slot: concurrent loadLabels() calls return the same in-flight promise rather than spawning two Supabase fetches"
  - "Array.isArray guard placed immediately before allTxData=data in loadHistory() success path — existing error path (if error || !data) already handles null, guard is defense-in-depth for success branch"
  - "Local accumulator (const totals={}) in loadMonthTotals() ensures monthTotals is never observable in a zeroed or partially-filled state during accumulation"

patterns-established:
  - "promise-slot: if (slot) return slot; slot = doWork(); try { await slot } finally { slot = null } — use this for any function that must not run concurrently"
  - "Array.isArray guard before assigning Supabase response to a global array — guards the success path even when the error check already filters nulls"
  - "local-accumulator: build object in const local, assign global only after loop — prevents observers seeing intermediate state"

requirements-completed:
  - STATE-01
  - STATE-02

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 3 Plan 01: State Management Race Condition Guards Summary

**Promise-slot dedup for loadLabels(), Array.isArray guard for allTxData, and local-accumulator pattern for loadMonthTotals() — three targeted race-condition fixes with zero behavior change on happy path**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T03:00:17Z
- **Completed:** 2026-03-26T03:00:17Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- loadLabels() now deduplicates concurrent in-flight fetches: a second caller gets the same promise, never triggers a second Supabase round-trip
- allTxData is guarded by Array.isArray before assignment — prevents TypeError propagation if Supabase returns a non-array success payload
- loadMonthTotals() builds totals in a local const and assigns atomically — observers can never see monthTotals in a zeroed or mid-accumulation state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add promise-slot dedup to loadLabels()** - `ac968c2` (feat)
2. **Task 2: Add Array.isArray guard to loadHistory()** - `0015431` (fix)
3. **Task 3: Fix loadMonthTotals() reset-before-fetch** - `cd670ce` (fix)

## Files Created/Modified

- `index.html` — Three function modifications:
  - Lines 2474-2492: `let _labelsLoading = null` slot + `loadLabels()` shell + `_doLoadLabels()` inner function
  - Lines 2867-2868: `if (!Array.isArray(data)) return;` guard before `allTxData=data` in `loadHistory()`
  - Lines 2598-2600: `const totals={}` accumulator + `monthTotals=totals` atomic assignment in `loadMonthTotals()`

## Decisions Made

- Promise-slot uses `finally { _labelsLoading = null }` to clear the slot even if the inner fetch throws, ensuring no permanent lock-out on error.
- The `_doLoadLabels()` split keeps the inner logic identical to the original — only the shell changes, minimizing diff surface.
- Array.isArray guard sits in the success path only; the existing `if (error || !data)` check already handles null/undefined on the error path.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- STATE-01 and STATE-02 requirements satisfied
- Ready for Plan 02 (STATE-03/STATE-04 fixes: optimistic-update rollback and Realtime event dedup)
- No blockers

## Self-Check: PASSED

- FOUND: `.planning/phases/03-state-management/03-01-SUMMARY.md`
- FOUND: commit `ac968c2` (Task 1 — loadLabels promise-slot)
- FOUND: commit `0015431` (Task 2 — Array.isArray guard in loadHistory)
- FOUND: commit `cd670ce` (Task 3 — local accumulator in loadMonthTotals)

---
*Phase: 03-state-management*
*Completed: 2026-03-26*
