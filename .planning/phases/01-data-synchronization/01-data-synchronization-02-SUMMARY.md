---
phase: 01-data-synchronization
plan: 02
subsystem: database
tags: [supabase, realtime, websocket, sync, visibility-api]

# Dependency graph
requires:
  - phase: 01-data-synchronization-01
    provides: updated_at columns, supabase_realtime publication, RLS policies on expenses and labels

provides:
  - setupRealtimeSync() — one Supabase Realtime channel per session, subscribed to expenses and labels tables
  - teardownRealtimeSync() — removes channel on sign-out, prevents orphaned channels
  - handleExpenseChange() — applies INSERT/UPDATE/DELETE deltas to allTxData with duplicate guard
  - handleLabelChange() — applies INSERT/UPDATE/DELETE deltas to labels array and localStorage cache
  - setupVisibilityWatch() — re-fetches history when tab returns from 5+ minute background sleep
  - realtimeChannel state variable — single channel reference per session

affects: [02-error-handling, 03-state-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase postgres_changes channel per user session (not per screen)"
    - "Delta apply pattern: INSERT dedup guard + UPDATE in-place + DELETE by id only"
    - "Visibility API re-fetch on 5-minute background threshold"
    - "Channel teardown in doSignOut() before db.auth.signOut()"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "One channel per session (not per table) — both expenses and labels subscribed via single .channel().on().on()"
  - "INSERT duplicate guard uses allTxData.some(tx => tx.id === newRow.id) to prevent double-render from optimistic add + Realtime event"
  - "DELETE handler uses payload.old.id only — Supabase DELETE events carry only primary key without REPLICA IDENTITY FULL"
  - "Re-render on screen === 'history' calls renderFilterChips() + renderHistory() for complete UI refresh"
  - "setupVisibilityWatch placed in onSignedIn, not setupConnectivityWatch, per plan split between 01-02 (visibility) and 01-03 (online/offline)"

patterns-established:
  - "Pattern: teardownRealtimeSync() is first call in doSignOut() — before closeProfilePopover() and before auth.signOut()"
  - "Pattern: realtimeChannel null-check guards re-auth cycles — if(realtimeChannel) db.removeChannel before creating new"

requirements-completed: [SYNC-01, SYNC-04]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 1 Plan 02: Realtime Sync Summary

**Supabase Realtime channel subscribed to expenses and labels per user session, with INSERT dedup guard, delta apply to allTxData, and 5-minute visibility re-fetch**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T21:36:38Z
- **Completed:** 2026-03-25T21:44:38Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Supabase Realtime channel ('user-data-sync') subscribes to expenses and labels tables with user_id filter immediately after sign-in
- handleExpenseChange() applies INSERT/UPDATE/DELETE deltas to allTxData with dedup guard and re-renders visible screen
- handleLabelChange() applies INSERT/UPDATE/DELETE deltas to labels array and keeps localStorage cache in sync
- setupVisibilityWatch() re-fetches history when tab returns after 5+ minute background sleep
- teardownRealtimeSync() cleans up channel in doSignOut() before auth.signOut() — no orphaned channels

## Task Commits

Each task was committed atomically:

1. **Task 1: Add realtimeChannel state variable and four sync functions** - `fec6044` (feat)
2. **Task 2: Wire sync functions into onSignedIn and doSignOut** - `a0d9d09` (feat)

## Files Created/Modified
- `index.html` - Added realtimeChannel state var, setupRealtimeSync, teardownRealtimeSync, handleExpenseChange, handleLabelChange, setupVisibilityWatch; wired into onSignedIn and doSignOut

## Decisions Made
- Used single channel with two `.on('postgres_changes', ...)` calls rather than two separate channels — fewer WebSocket connections, one teardown call
- INSERT duplicate guard is essential because the existing numpad code adds transactions optimistically to allTxData before the Supabase INSERT completes; without the guard, Realtime delivers the same row and doubles it in history
- DELETE events from Supabase Realtime carry only `{ id: "..." }` in payload.old unless REPLICA IDENTITY FULL is set — guard uses id only as per research pitfall documentation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all verifications passed on first attempt.

## User Setup Required
None - no external service configuration required. Tables and publication were confirmed ready by plan 01-01.

## Next Phase Readiness
- SYNC-01 and SYNC-04 requirements fulfilled: real-time cross-tab/device sync and stale-data prevention are both implemented
- Phase 1 (Data Synchronization) is now complete — all three plans (01-01, 01-02, 01-03) are done
- Phase 2 (Error Handling & Logging) can begin

---
*Phase: 01-data-synchronization*
*Completed: 2026-03-26*
