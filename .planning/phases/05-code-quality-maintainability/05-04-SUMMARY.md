---
phase: 05-code-quality-maintainability
plan: "04"
subsystem: data
tags: [datamodule, state-management, refactor, labels, transactions]

# Dependency graph
requires:
  - phase: 05-code-quality-maintainability
    provides: DataModule factory with full API (loadLabels, loadHistory, loadMonthTotals, setLabels, setTransactions, validateLabelExists)
provides:
  - DataModule._labels populated at runtime via DataModule.loadLabels() in Promise.all load chain
  - DataModule._allTxData populated at runtime via DataModule.loadHistory() in _doLoadHistory
  - All 7 labels mutations sync DataModule._labels via setLabels()
  - All 5 transaction mutations sync DataModule._allTxData via setTransactions()
  - validateLabelExists() functional end-to-end (returns correct boolean for deleted vs existing labels)
affects:
  - ChartModule cache invalidation (data-changed event fires on loadHistory)
  - saveEdit label validation (QUAL-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wrapper delegation: standalone load functions wrap DataModule methods + sync global state"
    - "Mutation sync: every direct allTxData/labels mutation followed by DataModule.setTransactions/setLabels"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "Option B mutation sync: keep existing Supabase call sites unchanged, add DataModule.setLabels/setTransactions after each mutation — safer than replacing Supabase calls, no behavioral change, just state sync"
  - "Wrapper pattern for loadLabels/loadMonthTotals: thin wrappers delegating to DataModule + syncing globals keeps all downstream rendering code working unchanged"
  - "_doLoadHistory delegates to DataModule.loadHistory() then syncs allTxData = DataModule.getTransactions() — DataModule is data-only, DOM rendering stays in wrapper"
  - "Promise.all call sites changed to DataModule.loadLabels/loadMonthTotals directly; .then() syncs labels = DataModule.getLabels() before refreshDisplay()"

patterns-established:
  - "After any standalone load: sync global from DataModule getter (labels = DataModule.getLabels(), allTxData = DataModule.getTransactions())"
  - "After any direct mutation: call DataModule.setLabels(labels) or DataModule.setTransactions(allTxData) immediately on same line"

requirements-completed: [QUAL-01, QUAL-03]

# Metrics
duration: 3min
completed: "2026-03-26"
---

# Phase 5 Plan 04: DataModule Call-Site Wiring Summary

**DataModule wired as active data layer: all 8 load call sites and 12 mutation sites now route through DataModule, making validateLabelExists() functional and _labels/_allTxData populated at runtime**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T07:27:32Z
- **Completed:** 2026-03-26T07:30:12Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Removed standalone `_doLoadLabels()` and `_labelsLoading` variable — DataModule.loadLabels() replaces them entirely
- Converted `loadLabels()`, `loadMonthTotals()`, and `_doLoadHistory()` to thin wrappers that delegate to DataModule and sync globals
- Added `DataModule.setLabels(labels)` after all 7 labels mutation sites (handleLabelChange×3, deleteLabel, renderManageLabels delete, addLabel, btn-ml-add)
- Added `DataModule.setTransactions(allTxData)` after all 5 transaction mutation sites (handleExpenseChange×3, deleteExpense, saveEdit)
- QUAL-01 fully satisfied: DataModule is the authoritative state layer for both reads and writes
- QUAL-03 fully satisfied: `validateLabelExists(editLabel.id)` in saveEdit now checks a populated `_labels` array and returns the correct boolean

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace standalone load function call sites with DataModule methods** - `49ffec5` (feat)
2. **Task 2: Replace all direct allTxData and labels mutations with DataModule method calls** - `284687e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `index.html` - Standalone load function bodies replaced; mutation sync calls added throughout

## Decisions Made

- **Option B for mutation sync:** Rather than replacing Supabase call sites entirely (Option A), kept existing Supabase calls and added `DataModule.setLabels/setTransactions` sync calls immediately after each direct mutation. Safer (no behavioral change), avoids duplicating error handling/toasts, and is sufficient for keeping DataModule state current.
- **Wrapper delegation pattern:** `loadLabels()`, `loadMonthTotals()`, `loadHistory()` become thin wrappers rather than being fully removed. This keeps existing call sites throughout the code unchanged — they all still call the same function names, which now delegate to DataModule.
- **Promise.all direct DataModule calls:** The two `Promise.all([loadLabels(), loadMonthTotals()])` boot-chain call sites were updated to `Promise.all([DataModule.loadLabels(), DataModule.loadMonthTotals()])` directly, with `.then()` syncing `labels = DataModule.getLabels()` before `refreshDisplay()`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- QUAL-01 and QUAL-03 requirements are fully satisfied
- DataModule is the active source of truth for both data loading and mutation state
- All rendering code (renderFilterChips, renderHistory, renderChips, renderManageLabels) continues to work via synced globals
- Phase 5 gap-closure complete — the DataModule API created in Plan 05-01 skeleton is now fully wired

---
*Phase: 05-code-quality-maintainability*
*Completed: 2026-03-26*
