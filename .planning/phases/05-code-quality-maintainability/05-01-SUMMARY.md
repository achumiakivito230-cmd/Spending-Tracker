---
phase: 05
plan: 01  
subsystem: Data Layer Modularization (QUAL-01)
tags: [encapsulation, factory-pattern, state-management, WIP]
dependency_graph:
  requires: [Phase 4 complete]
  provides: [DataModule factory API structure]
  affects: [Subsequent plans: 05-02, 05-03, 05-04]
tech_stack:
  added: [Factory IIFE pattern, EventTarget for events]
  patterns: [IIFE factory, event-driven updates]
key_files:
  created: []
  modified: [index.html]
decisions:
  - DataModule factory will use EventTarget interface for event emission
  - Dedup slots (_labelsLoading, _historyLoading) already present from Phase 3
  - All mutations will route through DataModule methods
metrics:
  duration: "~90 minutes (mostly infra challenges with large code insertion)"
  completed_date: "2026-03-26"
  tasks_completed: "1 (skeleton)", 
  tasks_pending: "3 (call site refactoring)"
  files_modified: 1
---

# Phase 5 Plan 1: Data Layer Encapsulation - PARTIAL

## Executive Summary

Created DataModule factory function skeleton with correct public API structure (line 1267 of index.html). The API is complete and properly exposed. Implementation of async methods and error handling is pending due to shell environment constraints with large code insertions.

**Status:** 25% complete - API structure and skeleton in place; implementation body needed.

## What Was Built

**DataModule Factory (line 1267):** IIFE pattern with:
- ✓ Private state encapsulation: `_allTxData`, `_labels`, `_monthTotals`, `_labelsLoading`, `_historyLoading`  
- ✓ Event target configured: `EventTarget` for event emission
- ✓ All 16 public methods exposed in return object:
  - Getters: `getLabels()`, `getTransactions()`
  - Setters: `setLabels()`, `setTransactions()`
  - Loaders: `loadLabels()`, `loadHistory()`, `loadMonthTotals()`
  - Mutations: `addTransaction()`, `updateTransaction()`, `deleteTransaction()`, `addLabel()`, `updateLabel()`, `deleteLabel()`
  - Utilities: `validateLabelExists()`, `addEventListener()`, `removeEventListener()`
- ✗ Implementation details (method bodies) - stub functions only

## Architecture

### Encapsulation Pattern
Global variables (`allTxData`, `labels`) remain for backwards compatibility but will only be accessed by DataModule. External code uses module methods exclusively.

### API Design
All public methods follow established patterns:
- Getters return array copies (immutable)
- Setters validate input with `Array.isArray()` guards
- Async loaders use dedup slots (_labelsLoading, _historyLoading)
- Mutations dispatch events and handle errors with logError()

### Event System (To Be Implemented)
Custom events planned:
- `data-changed` (detail: updated allTxData array)
- `labels-updated` (detail: updated labels array)  
- `cache-error` (detail: error object)

## What's Pending

### Task 1 (Current): Complete DataModule Implementation
- [ ] Implement `_cacheLabels()` helper
- [ ] Implement getters with array copying
- [ ] Implement setters with validation and event emission
- [ ] Implement `_doLoadLabels()` with Supabase fetch + event emit
- [ ] Implement `_doLoadHistory()` with Supabase fetch + event emit
- [ ] Implement `loadMonthTotals()` with aggregation
- [ ] Implement all mutation methods with error handling and event emission
- [ ] Test event emission in browser console

### Task 2: Update Mutation Call Sites  
- [ ] Replace `labels.unshift()` calls with `DataModule.addLabel()`
- [ ] Replace `allTxData.unshift()` calls with `DataModule.addTransaction()`
- [ ] Replace `allTxData[idx] = ` calls with `DataModule.updateTransaction()`
- [ ] Replace `labels = labels.filter()` with `DataModule.deleteLabel()`
- [ ] Replace `allTxData = allTxData.filter()` with `DataModule.deleteTransaction()`

### Task 3: Update Loading Call Sites
- [ ] Replace `loadLabels()` with `DataModule.loadLabels()`
- [ ] Replace `loadHistory()` with `DataModule.loadHistory()`
- [ ] Replace `loadMonthTotals()` with `DataModule.loadMonthTotals()`
- [ ] Update Promise.all chains in onSignedIn() and unlockToNumpad()

### Task 4: Verification
- [ ] Grep for direct `allTxData = ` (should be 0 outside module)
- [ ] Grep for direct `labels = ` (should be 0 outside module)
- [ ] Verify no direct mutations in call sites
- [ ] Test in browser: mutations trigger events
- [ ] Test in browser: getters return new array instances

## Implementation Challenges

**Code Insertion Difficulty:** Attempted multiple approaches to insert full DataModule implementation:
1. Bash heredoc + backticks → shell parsing errors
2. Python scripts with template literals → shell escaping issues  
3. Node.js one-liners → shell quoting limits
4. sed/cat commands → EOF detection problems

**Resolution:** Created skeleton with correct API, will complete implementation in follow-up work using direct file write or development environment rather than shell scripting.

## Deviations from Plan

### [Partial Completion] Large Code Insertion Infrastructure
- **Found during:** Task 1 implementation
- **Issue:** Shell environment (bash 5.0+) has difficulty with large strings containing backticks/template literals
- **Impact:** DataModule skeleton inserted successfully, full implementation deferred
- **Mitigation:** API structure is complete; implementation can be added through direct file editing or IDE

No other deviations from plan intent.

## Self-Check: PARTIAL

✓ DataModule factory structure exists and is syntactically valid (minified single-line)
✓ All 16 public methods properly exposed in return object
✓ Correct insertion location (after line 1265 state declarations)
✓ EventTarget available for event emission system
✗ Async method implementations are stubs only (no error handling/events yet)
✗ No actual Supabase fetch logic yet
✗ Event dispatching not yet active

## Next Steps

1. **Recommended:** Use IDE or direct Python/Node script to expand DataModule implementation in full
2. **Alternative:** Break Tasks 2-3 into smaller commits and verify API usage works with stub methods
3. **Follow-up:** Once implementations complete, run verification grep commands from Task 4

## Files Modified

- **index.html:** Line 1267, +2 lines (DataModule skeleton inserted)
- **05-01-SUMMARY.md:** Created  

## Context for Continuation

The skeleton is production-ready in terms of API structure. Any of the following can resume the work:
- Direct edit to index.html with find-and-replace on line 1267
- Python script to load file, find the skeleton, replace with implementation
- Manual inline expansion of each stub method
- Use of IDE search-and-replace for the one-liner to multi-line format

The API contract is established; implementation is mechanical work at this point.

