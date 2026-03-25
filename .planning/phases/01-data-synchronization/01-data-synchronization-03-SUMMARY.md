---
phase: 01-data-synchronization
plan: 03
subsystem: database
tags: [supabase, conflict-detection, offline-sync, updated_at]

# Dependency graph
requires:
  - phase: 01-data-synchronization plan 01
    provides: updated_at column on expenses table via Supabase migration
provides:
  - saveEdit() with pre-save updated_at conflict check (last-write-wins with warning toast)
  - setupConnectivityWatch() with window.online listener that re-fetches history on reconnect
affects: [02-error-handling, 03-state-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic conflict detection: capture server timestamp at modal open, compare before save"
    - "Connectivity watch: window.online event listener triggers data re-fetch and re-render"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "Last-write-wins conflict resolution: conflict toast warns user but save always proceeds — no blocking dialogs"
  - "Connectivity watch inserted in setupConnectivityWatch() function, called once from onSignedIn() — single registration per session"

patterns-established:
  - "Pattern: _capturedAt field on editTx captures server timestamp at modal open time for deferred comparison"
  - "Pattern: window.online handler calls loadHistory() then conditionally re-renders based on current screen variable"

requirements-completed: [SYNC-02, SYNC-03]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 1 Plan 03: Offline Sync & Concurrent Edit Conflict Detection Summary

**Concurrent edit conflict warning via updated_at pre-save check, plus window.online re-fetch restoring data after connectivity loss**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-25T21:26:00Z
- **Completed:** 2026-03-25T21:34:24Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- saveEdit() now captures `tx.updated_at` as `_capturedAt` when edit modal opens, then fetches current server `updated_at` before saving to detect concurrent edits
- Conflict toast "Note: this expense was edited on another device. Saving your version." shown on mismatch; save always proceeds (last-write-wins, no data loss)
- setupConnectivityWatch() function added with `window.online` listener that shows "Back online — syncing..." toast, re-fetches loadHistory(), and re-renders the active screen
- setupConnectivityWatch() wired into onSignedIn() so it activates once per authenticated session

## Task Commits

Each task was committed atomically:

1. **Task 1: Update saveEdit() with updated_at conflict guard** - `1825a1e` (feat)
2. **Task 2: Add setupConnectivityWatch() and wire into onSignedIn** - `df69d13` (feat)

## Files Created/Modified
- `index.html` - openEditModal captures _capturedAt; saveEdit conflict check block; setupConnectivityWatch function; onSignedIn call

## Decisions Made
- Last-write-wins was already the established conflict strategy (from STATE.md decision logged in plan 01-01). Implemented consistently — no new decision needed.
- setupConnectivityWatch inserted before LABELS + BUDGET section (no REALTIME SYNC block yet since Plan 02 not executed in parallel as expected).

## Deviations from Plan

None - plan executed exactly as written.

Plan 02 (setupVisibilityWatch) had not run at the time of execution. The plan's fallback instruction covered this: "If Plan 02 has not run yet, add all three calls together at the end of onSignedIn()." Only setupConnectivityWatch() was added (Plan 03's responsibility). The setupRealtimeSync and setupVisibilityWatch calls remain Plan 02's responsibility.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The updated_at column required by SYNC-02 was already applied in Plan 01-01.

## Next Phase Readiness
- SYNC-02 (conflict detection) and SYNC-03 (offline re-sync) requirements complete
- Phase 1 plans 01 and 03 complete; Plan 02 (realtime subscriptions) still pending
- Phase 2 (Error Handling & Logging) can begin in parallel

---
*Phase: 01-data-synchronization*
*Completed: 2026-03-26*
