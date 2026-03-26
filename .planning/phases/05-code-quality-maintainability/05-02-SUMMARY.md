---
phase: 05-code-quality-maintainability
plan: 02
subsystem: ui
tags: [event-listeners, menu-management, label-validation, click-outside, UIModule]

# Dependency graph
requires:
  - phase: 05-code-quality-maintainability
    provides: DataModule with validateLabelExists method (already present from prior run)
provides:
  - UIModule IIFE with single delegated click-outside listener and menu stack
  - openMenu/closeMenu/isMenuOpen/getMenuStack/closeAll public API
  - Budget input, label action, and rename prompt menus managed via UIModule
  - Label validation in saveEdit() prevents orphaned label_id in database
  - Delete button disabled for label currently being edited in edit modal
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UIModule IIFE pattern for shared UI state (menu stack, single document listener)"
    - "onClose callback pattern: UIModule.openMenu(name, element, anchor, () => element.remove())"
    - "Pre-save validation pattern: check DataModule.validateLabelExists before Supabase update"
    - "Defense in depth: Layer 1 (prevention via disabled button) + Layer 2 (recovery via validation)"

key-files:
  created: []
  modified:
    - index.html

key-decisions:
  - "UIModule.openMenu() takes (name, element, anchor, onClose) — onClose callback handles DOM removal, keeping UIModule decoupled from specific menu implementations"
  - "Menu buttons (Set/Save/Rename) call UIModule.closeMenu() explicitly; click-outside detected by single delegated listener"
  - "saveEdit() uses labelId/labelName local vars after validation so null label saves correctly as unlabeled"
  - "Delete button disable applied in both openLabelActions (chip long-press menu) and renderManageLabels — both paths that can delete labels"

patterns-established:
  - "UIModule pattern: single document click listener managed via stack; call openMenu() on show, closeMenu() on explicit close"
  - "Pre-save label validation: DataModule.validateLabelExists(editLabel.id) checked before Supabase update"

requirements-completed: [QUAL-02, QUAL-03]

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 05 Plan 02: Menu Listener Dedup & Label Validation Summary

**Single delegated click-outside UIModule replacing per-menu anonymous listeners, plus two-layer label validation preventing orphaned label_id references**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T06:45:34Z
- **Completed:** 2026-03-26T07:01:00Z
- **Tasks:** 4
- **Files modified:** 1

## Accomplishments

- Created UIModule IIFE with single shared `clickOutsideListener` and `menuStack[]` — no listener stacking possible
- Migrated all three menu types (budget input, label actions, rename prompt) from inline `outside()` functions to UIModule delegation
- Added `DataModule.validateLabelExists()` call in `saveEdit()` before Supabase update — if label deleted while modal open, clears label and saves as unlabeled with toast
- Disabled delete buttons (in `openLabelActions` and `renderManageLabels`) for the label currently open in the edit modal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UIModule with delegated click-outside handler** - `362b769` (feat)
2. **Task 2: Update menu listeners to use UIModule** - `2e20153` (feat)
3. **Task 3: Validate label exists in saveEdit** - `60e8839` (feat)
4. **Task 4: Disable delete button for label being edited** - `dab88b8` (feat)

## Files Created/Modified

- `index.html` - Added UIModule IIFE (~70 lines), replaced 3 inline outside() listeners, added validateLabelExists pre-save check, disabled delete buttons in 2 locations

## Decisions Made

- UIModule.openMenu() takes `onClose` callback so the module doesn't need to know how each menu's DOM is structured — the caller passes `() => element.remove()`, keeping UIModule decoupled
- Menu action buttons (Set, Save, Rename) explicitly call `UIModule.closeMenu()` so the module stack stays consistent whether user closes via button or via click-outside
- Both `openLabelActions` (chip long-press) and `renderManageLabels` (manage-labels screen) had the delete-disable logic applied — both are potential deletion paths
- `labelId`/`labelName` locals extracted before Supabase update so null label (after validation clears it) saves correctly as unlabeled

## Deviations from Plan

None - plan executed exactly as written. `DataModule.validateLabelExists` was already present from a prior plan execution, so only the call site in `saveEdit()` needed adding.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- QUAL-02 and QUAL-03 complete — menu listener stacking fixed, label validation in place
- UIModule available for any future menus/overlays needing click-outside management
- Phase 05 code quality improvements fully applied to index.html

---
*Phase: 05-code-quality-maintainability*
*Completed: 2026-03-26*
