---
phase: 03-state-management
plan: 02
subsystem: state-management
tags: [null-guard, promise-slot, screen-aware, race-condition, loadHistory]

# Dependency graph
requires:
  - phase: 03-state-management
    plan: 01
    provides: Array.isArray guard in loadHistory() and _labelsLoading pattern that this plan mirrors
provides:
  - currentUser null guard in btn-ml-add handler (STATE-03)
  - _historyLoading promise-slot dedup guard on loadHistory() (STATE-04)
  - screen-aware render guard (targetScreen capture + comparison) in _doLoadHistory (STATE-04)
affects:
  - index.html btn-ml-add handler
  - loadHistory() and new _doLoadHistory() function

# Tech tracking
tech-stack:
  added: []
  patterns:
    - null guard before object property access (if (!currentUser) return)
    - promise-slot dedup on loadHistory() mirroring _labelsLoading from Plan 01
    - screen-capture-before-await pattern for DOM safety (const targetScreen = screen before await)

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "currentUser null guard inserted after the name-empty check in btn-ml-add, not at the top of the handler — preserves the logical ordering (validate input before validating auth state)"
  - "loadHistory shell uses try/finally to clear _historyLoading slot even if _doLoadHistory throws — matches the same pattern established in Plan 01 for _labelsLoading"
  - "screen !== targetScreen guard sits after the await and before ALL DOM writes and state assignment — this is the critical ordering for STATE-04 correctness"
  - "Array.isArray guard from Plan 01 preserved in _doLoadHistory body between the error check and the screen guard — no duplicate added"

requirements-completed:
  - STATE-03
  - STATE-04

# Metrics
duration: 1min
completed: 2026-03-26
---

# Phase 3 Plan 02: State Management Guards (currentUser null-safety + loadHistory dedup) Summary

**currentUser null guard in btn-ml-add handler (STATE-03) and _historyLoading promise-slot dedup with screen-capture render guard in loadHistory() (STATE-04) — two targeted edits completing all four STATE requirements**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-26T03:02:59Z
- **Completed:** 2026-03-26T03:03:50Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- btn-ml-add handler now exits silently when currentUser is null — TypeError on currentUser.id is impossible (STATE-03)
- loadHistory() deduplicates concurrent calls via `_historyLoading` promise-slot — a second caller during an in-flight fetch returns the same promise rather than spawning a second Supabase request (STATE-04)
- _doLoadHistory() captures `screen` into `targetScreen` before the await; after the await it compares and returns early if the user has navigated away — prevents stale DOM writes on rapid tab navigation (STATE-04)
- All four STATE requirements (STATE-01 through STATE-04) now satisfied across Plans 03-01 and 03-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add currentUser null guard to btn-ml-add handler** - `4b5808a` (fix)
2. **Task 2: Add promise-slot dedup and screen-aware guard to loadHistory()** - `7e517e8` (feat)

## Files Created/Modified

- `index.html` — Two function modifications:
  - Line 3354: `if (!currentUser) return;` inserted after `if (!name) return;` in btn-ml-add handler, before `currentUser.id` access
  - Lines 2853-2890: `let _historyLoading = null` slot + `loadHistory()` shell (if-check, assignment, try/finally clear) + `_doLoadHistory()` inner function (targetScreen capture, fetch, screen comparison guard, state assignment)

## Decisions Made

- null guard placed after the input-validation early-exit (`if (!name) return`) to preserve logical ordering: validate input first, then validate auth state.
- `try { await _historyLoading; } finally { _historyLoading = null; }` in the shell mirrors the Plan 01 pattern exactly — the slot is cleared even on throw, preventing permanent lock-out.
- `const targetScreen = screen` captured as the very first line of `_doLoadHistory()`, before any DOM write or await — this is the only correct placement.
- The `if (screen !== targetScreen) return` sits after the await and before `allTxData = data`, `renderFilterChips`, and `renderHistory` — all three state/DOM mutations are skipped on stale completion.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- STATE-01 through STATE-04 all satisfied — Phase 3 complete
- Ready for Phase 4: Security Fixes
- No blockers

## Self-Check: PASSED

- FOUND: `.planning/phases/03-state-management/03-02-SUMMARY.md`
- FOUND: commit `4b5808a` (Task 1 — currentUser null guard)
- FOUND: commit `7e517e8` (Task 2 — promise-slot + screen-aware guard)
- FOUND: `if (!currentUser) return` at line 3354 in index.html
- FOUND: `let _historyLoading = null` at line 2853 in index.html
- FOUND: `const targetScreen = screen` at line 2862 in index.html
- FOUND: `if (screen !== targetScreen) return` at line 2879 in index.html

---
*Phase: 03-state-management*
*Completed: 2026-03-26*
