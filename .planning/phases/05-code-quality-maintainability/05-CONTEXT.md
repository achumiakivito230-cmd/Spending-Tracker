# Phase 5: Code Quality & Maintainability - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Modularize the single-file codebase into logical, testable functions while fixing four specific UI/UX bugs. The phase focuses on code structure and reliability without adding new features or changing the user experience.

Core improvements:
1. Extract functions into reusable, encapsulated modules (starting with data layer)
2. Fix floating menu listener stacking issues
3. Prevent orphaned label references in the edit modal
4. Memoize chart rendering to avoid jank on screen transitions

</domain>

<decisions>
## Implementation Decisions

### Modularization & Code Organization

**Architecture:**
- Keep single `index.html` file, but organize code into logical sections with clear boundaries
- Use factory functions to encapsulate state and return public API
- Adopt event-based module interaction (modules emit events instead of calling each other directly)
- Export utility functions for testing (unit test access to formatters, validators)

**Priority & Scope:**
- Start with data loading module (loadLabels, loadHistory, loadMonthTotals)
- Extract all three data functions together for consistent error handling and caching
- Data module manages cache invalidation and localStorage sync
- Later phases can modularize auth and UI rendering

**State Management:**
- Use factory functions: `const DataModule = () => { let state = {...}; return { getLabels(), setLabels(), ... } }`
- No standalone globals; all state encapsulated within module scope
- Modules expose only public methods; internal helpers stay private
- Data module owns: allTxData, labels, and related validation

**Module Interaction:**
- Modules communicate via events, not direct function calls
- Data module emits: `data-changed`, `labels-updated`, `transactions-updated`, `cache-error`
- UI/Chart modules listen and respond to invalidation events
- Prevents tight coupling and allows adding new listeners without refactoring

### Menu Listener Cleanup

**Architecture:**
- Single delegated click-outside handler on document, not per-menu listeners
- Maintain a stack/queue of open menus (budget, label actions, etc.)
- Close top menu on outside click; if stack empty, remove listener

**Close Triggers:**
- Click outside menu bounds
- Escape key pressed
- User clicks menu item (selects option)

**State Tracking:**
- Track `currentOpenMenu` in a UI module state object
- Single source of truth for which menu is open
- Prevents listener stacking and simplifies debugging

### Label Validation in Edit Modal

**Detection:**
- Validate label existence just before saving (in saveExpense mutation)
- Check that `editLabel.id` still exists in current `labels` array

**Conflict Resolution:**
- If label was deleted: clear `editLabel` and save transaction as unlabeled
- Toast message: "Label was deleted, saving as unlabeled"
- Prevents orphaned label_id in database

**Prevention:**
- If edit modal is open for a transaction, disable the delete button for that transaction's label
- Only applies to the specific label being edited
- Prevents the conflict from happening in the first place

### Chart Rendering Memoization

**Redraw Triggers:**
- Redraw when transaction data changes (expense added/edited/deleted)
- Redraw when filter changes (chart period: month/year/all, or label filter)
- **Do NOT** redraw on screen transition alone if data/filters unchanged

**Cache Strategy:**
- Track chart state: `{period, labelFilter, dataHash}`
- Before rendering, compare current state to cached state
- If unchanged, skip render and reuse cached output
- Cache both: processed data array AND final rendered HTML

**Cache Invalidation:**
- Data module emits `data-changed` event when transactions mutate
- Chart module listens to event and invalidates its cache
- Chart period/filter changes also trigger cache invalidation
- Re-render on invalidation only if state actually changed

**Performance Impact:**
- Eliminates jank when switching between screens (history → chart → budget)
- Reduces CPU during rapid filter clicks (debounce render calls via cache check)

### Claude's Discretion

- Exact event emitter implementation (EventTarget API vs custom object)
- Factory function naming and module file organization structure
- Specific hash algorithm for data comparison (JSON.stringify, crypto.subtle, etc.)
- Detailed error messages and toast wording (template responsibility in planner phase)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Specific bug descriptions and line numbers for each issue
  - Listener stacking (lines 2488, 2516, 2544)
  - Label validation gap (lines 2802–2845)
  - Chart redraw performance (lines 2850–2862, 1794–1810)
  - Global state fragility (lines 1246–1264 throughout)

- `.planning/codebase/STRUCTURE.md` — Current code organization, line references, naming conventions
  - Utility functions (lines 1260–1597)
  - Data/transaction logic (lines 2202–2836)
  - Event listener attachment (lines 3040–3165)

### Requirements
- `.planning/REQUIREMENTS.md` — Requirements traceability (QUAL-01 through QUAL-04 map to this phase)
  - QUAL-01: Codebase modularized into separate, testable functions
  - QUAL-02: Floating menu listeners properly cleaned up on close
  - QUAL-03: Edit modal validates labels before saving
  - QUAL-04: Chart rendering memoized to prevent performance jank

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Utility functions** (lines 1260–1597): `fmtNum()`, `monthStart()`, `monthEnd()`, `pinHash()`, `sym()` — Already tested, can be exported as-is
- **Data queries** (lines 2670–2683, 2404–2410, 2850–2862): Supabase query patterns already established; modularize with consistent error handling
- **Screen navigation** (lines 1815–1871): `slideToX()` and `slideBack()` functions — Template for modular navigation system

### Established Patterns
- **Global state mutation**: All state (allTxData, labels, currentUser) modified directly; need factory wrapper
- **Async data loading**: Try-catch with `toast()` on error; modularize into consistent error handler
- **Event listeners**: Anonymous functions attached to buttons; consolidate into delegation pattern (menu listeners especially)
- **Rendering functions**: `renderHistory()`, `renderChart()`, `renderFilterChips()` — Good template for UI module structure

### Integration Points
- **Supabase client**: `db` variable at lines 1170–1177; will be passed to/created within data module
- **localStorage**: Keys use consistent `spend_{feature}_${userId}` pattern; ensure data module handles all writes
- **DOM mutations**: All screens use class toggles (`.off-right`, `.off-left`, `.open`); navigation module should own screen state
- **Toast notifications**: Existing `toast()` function called from data layer; modularize with logging

</code_context>

<specifics>
## Specific Ideas

**Design inspiration:**
- Keep the refactoring conservative — no major architectural overhaul. Goal is readability and testability, not perfection.
- Follow existing naming conventions strictly (slides, functions, CSS classes) so code feels familiar after changes.

**Testing approach:**
- Unit test utilities independently: `fmtNum()`, `monthStart()`, `pinHash()` can be tested in Node
- Integration test data module functions (loadLabels, loadHistory) with real Supabase test data
- Manual testing for UI (menus, modals) until E2E test framework added (Phase 6)

**No breaking changes:**
- Public API for screens/buttons stays the same — external callers don't notice refactoring
- localStorage keys and Supabase table structure unchanged
- User experience identical after refactoring

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-code-quality-maintainability*
*Context gathered: 2026-03-26*
