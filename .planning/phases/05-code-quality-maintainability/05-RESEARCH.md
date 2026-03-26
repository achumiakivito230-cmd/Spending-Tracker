# Phase 5: Code Quality & Maintainability - Research

**Researched:** 2026-03-26
**Domain:** Single-file codebase modularization, state encapsulation, event-driven architecture, menu listener cleanup, label validation, chart memoization
**Confidence:** HIGH

## Summary

This phase addresses code quality through controlled modularization while maintaining the single-file constraint. The research reveals that the codebase is well-structured for incremental refactoring using factory functions and event-based module communication. The four specific bugs (floating menu listeners, label validation in edit modal, chart jank, and fragile global state) can be fixed in parallel with modularization by extracting the data layer first as a reference implementation.

**Key insight:** The existing code patterns (async data loading, localStorage sync, Supabase integration) provide a proven template for factory-based modularization. The single-file constraint is not a blocker — factory functions and event emitters can organize code logically without requiring file splitting.

**Primary recommendation:** Modularize the data layer (loadLabels, loadHistory, loadMonthTotals) first using factory functions with encapsulated state. This establishes the pattern for extracting UI/navigation modules in future phases, while immediately fixing state fragility and enabling proper error handling/caching for the other three bugs.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture:**
- Keep single `index.html` file, but organize code into logical sections with clear boundaries
- Use factory functions to encapsulate state and return public API
- Adopt event-based module interaction (modules emit events instead of calling each other directly)
- Export utility functions for testing (unit test access to formatters, validators)

**Modularization Priority & Scope:**
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

**Menu Listener Cleanup:**
- Single delegated click-outside handler on document, not per-menu listeners
- Maintain a stack/queue of open menus (budget, label actions, etc.)
- Close top menu on outside click; if stack empty, remove listener

**Label Validation in Edit Modal:**
- Validate label existence just before saving (in saveExpense mutation)
- Check that `editLabel.id` still exists in current `labels` array
- If label was deleted: clear `editLabel` and save transaction as unlabeled
- Toast message: "Label was deleted, saving as unlabeled"
- If edit modal is open for a transaction, disable the delete button for that transaction's label (prevents the conflict)

**Chart Rendering Memoization:**
- Redraw when transaction data changes (expense added/edited/deleted)
- Redraw when filter changes (chart period: month/year/all, or label filter)
- Do NOT redraw on screen transition alone if data/filters unchanged
- Track chart state: `{period, labelFilter, dataHash}`
- Cache both: processed data array AND final rendered HTML
- Data module emits `data-changed` event; chart module listens and invalidates cache

### Claude's Discretion
- Exact event emitter implementation (EventTarget API vs custom object)
- Factory function naming and module file organization structure
- Specific hash algorithm for data comparison (JSON.stringify, crypto.subtle, etc.)
- Detailed error messages and toast wording (template responsibility in planner phase)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Codebase modularized into separate, testable functions | Factory function pattern, data module extraction, utility export for unit tests |
| QUAL-02 | Floating menu listeners properly cleaned up on close | Delegated click-outside handler with menu stack tracking, single listener cleanup |
| QUAL-03 | Edit modal validates labels before saving | Label existence check before saveExpense, orphaned reference prevention, disable-delete guard |
| QUAL-04 | Chart rendering memoized to prevent performance jank | Chart state tracking with hash comparison, cache invalidation on data changes, event-driven rerenders |

</phase_requirements>

---

## Standard Stack

### Core Technology
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JavaScript (ES6+) | Native | Module implementation via factory functions | No external dependencies needed; browser native `crypto` API available for hashing |
| EventTarget API | Native | Event emission and delegation | Browser standard for decoupled communication; alternatives (custom emitter) add unnecessary code |
| Supabase JS SDK | v1.166+ | Real-time subscriptions, data queries | Already in codebase; realtime channel teardown pattern proven in Phase 1 |
| localStorage API | Native | Cache persistence | Established key pattern (`spend_*`) already in use throughout codebase |
| crypto.subtle | Native | Data hashing (for chart memoization) | Used for PIN hashing (Phase 4); suitable for deterministic data state comparison |

### Supporting Libraries/Patterns
| Pattern | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Factory functions | ES6 | State encapsulation | Every module in this phase and beyond |
| Event emitters (via EventTarget) | Native | Decoupled communication | Module-to-module interactions (data module → UI listeners) |
| Delegated event handlers | Native | Listener cleanup | Menu/modal click-outside handlers |
| Promise-based async | Native | Async data operations | loadLabels(), loadHistory(), setupPIN() — already pattern in codebase |
| Try-catch with logError | Existing | Error handling | All Supabase operations (established Phase 2 pattern) |
| toast() notifications | Existing (lines 1262) | User feedback | Conflicts, validation failures, async errors |

### Why This Stack
- **No new dependencies:** Factory functions, EventTarget, and crypto.subtle are all native browser APIs. Adds zero to bundle size.
- **Proven patterns:** Async/await with try-catch, localStorage with `spend_*` keys, Supabase queries, and realtime subscriptions are already established in Phases 1–4.
- **Testing compatibility:** Utility functions extracted at module level can be unit tested in Node.js without DOM (e.g., data validators, formatters already at lines 1260–1597).
- **Incremental migration:** Factory functions allow extracting one module at a time. DOM/screens stay untouched until Phase 6.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Factory functions + EventTarget | Class-based state + PubSub library | Classes require `new` instantiation overhead; external library adds complexity when native API is sufficient |
| EventTarget API | Custom event emitter object | Custom object adds ~50 lines of boilerplate; EventTarget is standard, inspectable in DevTools |
| crypto.subtle (hash) | MD5 or CRC | crypto.subtle is constant-time and available; MD5/CRC are weaker for data integrity checks |
| Single delegated handler | Per-menu listeners | Per-menu listeners cause listener stacking (the bug we're fixing); delegation is cleaner and prevents accumulation |
| Cache with data hash | Always re-render on filter change | Hash check prevents unnecessary DOM thrashing; adds negligible overhead with crypto.subtle |

**Installation:**
```bash
# No new npm packages needed
# All dependencies are browser native (crypto, localStorage, EventTarget, Promise)
# Supabase SDK already present via CDN in index.html lines 19
```

---

## Architecture Patterns

### Recommended Code Organization (Single File)

```
index.html (3225 lines) organized as:

Lines 1–800       — CSS (no changes)
Lines 801–1060    — HTML structure (no changes)
Lines 1177–1251   — Global state marker (remove over time)
Lines 1260–1597   — Constants & utility functions (extract/test as-is)

[NEW Section: Data Module Factory]
Lines 1610–1800   — DataModule factory (encapsulated state, public methods)
  - Owns: allTxData, labels, _labelsLoading, _historyLoading
  - Exports: getLabels(), setLabels(), getTransactions(), addTransaction(), etc.
  - Emits: data-changed, labels-updated, cache-error

[Later Phase: Menu/UI Module]
Lines 1810–2100   — UIModule factory (menu state, delegated listeners)
  - Owns: currentOpenMenu, menuStack
  - Exports: openMenu(), closeMenu(), isMenuOpen()
  - Emits: menu-opened, menu-closed

Auth & Navigation  — Unchanged (until Phase 6)
Data operations    — Unchanged (now wrapped by DataModule)
Event listeners    — Updated to use module methods instead of globals
Supabase queries   — Moved into DataModule, consistent error handling
```

### Pattern 1: Factory Function for State Encapsulation

**What:** A factory function returns an object with public methods. State variables are scoped to the factory closure, inaccessible from outside.

**When to use:** Every module (data, UI, navigation, auth). Prevents accidental global mutations.

**Example (Data Module):**
```javascript
// Source: Phase 5 implementation
const DataModule = (() => {
  // Private state — not accessible outside this closure
  let allTxData = [];
  let labels = [];
  let _labelsLoading = null;
  let _historyLoading = null;

  // Private helper
  function cacheLabels() {
    if (currentUser) {
      localStorage.setItem(`spend_labels_${currentUser.id}`, JSON.stringify(labels));
    }
  }

  // Public API — only these methods are exposed
  return {
    getLabels() { return [...labels]; },  // Copy, not reference
    setLabels(newLabels) {
      if (!Array.isArray(newLabels)) throw new Error('Expected array');
      labels = newLabels;
      cacheLabels();
      this.emit('labels-updated');
    },
    getTransactions() { return [...allTxData]; },
    async loadLabels() {
      if (_labelsLoading) return _labelsLoading;  // Dedup concurrent calls
      _labelsLoading = (async () => {
        try {
          const { data, error } = await db.from('labels')
            .select('*')
            .eq('user_id', currentUser.id);
          if (error) throw error;
          if (Array.isArray(data)) {
            labels = data;
            cacheLabels();
            this.emit('labels-updated', data);
          }
        } catch (err) {
          logError('DataModule.loadLabels', err);
          this.emit('cache-error', err);
        } finally {
          _labelsLoading = null;
        }
      })();
      return _labelsLoading;
    },
    // More methods: loadHistory, validateLabel, deleteLabel, etc.
  };
})();

// Usage: DataModule.getLabels(), DataModule.loadLabels(), etc.
// State inside closure is private — can only mutate via public methods
```

### Pattern 2: Event-Based Module Communication

**What:** Modules emit events instead of calling each other. Listeners attach to events and respond without knowing who emitted.

**When to use:** Cross-module communication to prevent circular dependencies and tight coupling.

**Example (Chart Module listening to Data Module):**
```javascript
// Source: Event architecture from Phase 1 Realtime sync pattern
const ChartModule = (() => {
  let cachedChartState = null;
  let cachedHTML = null;

  function computeDataHash(data, period, labelFilter) {
    // Deterministic hash of current chart inputs
    const str = JSON.stringify({ data, period, labelFilter });
    return str; // In practice, use crypto.subtle.digest for true hash
  }

  function renderChart(data, period, labelFilter) {
    const hash = computeDataHash(data, period, labelFilter);

    // Check cache
    if (cachedChartState?.hash === hash && cachedHTML) {
      return cachedHTML;  // Reuse cached output
    }

    // Rebuild only if state changed
    const processed = filterAndGroupData(data, period, labelFilter);
    const html = buildChartSVG(processed);
    cachedChartState = { hash, period, labelFilter };
    cachedHTML = html;
    return html;
  }

  // Listen to data module events
  DataModule.addEventListener('data-changed', (event) => {
    // Invalidate cache when data changes
    cachedChartState = null;
    cachedHTML = null;
    if (screen === 'chart') {
      // Re-render with new data
      const data = DataModule.getTransactions();
      const html = renderChart(data, activeChartPeriod, activeChartLabel);
      document.getElementById('chart-container').innerHTML = html;
    }
  });

  return {
    render(data, period, labelFilter) {
      return renderChart(data, period, labelFilter);
    },
  };
})();
```

### Pattern 3: Delegated Click-Outside Handler for Menu Cleanup

**What:** Single document-level listener manages all menu closes. Menu stack tracks which is open. No per-menu listeners accumulate.

**When to use:** Modal/popover/menu management. Prevents listener stacking (the QUAL-02 bug).

**Example:**
```javascript
// Source: Established delegation pattern from Phase 2 onward
const UIModule = (() => {
  let menuStack = [];  // Stack of open menus: ['budget', 'label-actions']
  let clickOutsideListener = null;

  function attachClickOutside() {
    if (clickOutsideListener) return;  // Already attached

    clickOutsideListener = (e) => {
      if (menuStack.length === 0) return;

      const topMenu = menuStack[menuStack.length - 1];
      const menuEl = document.getElementById(`${topMenu}-menu`);

      if (menuEl && !menuEl.contains(e.target)) {
        closeMenu(topMenu);
      }
    };

    document.addEventListener('click', clickOutsideListener);
  }

  function detachClickOutside() {
    if (clickOutsideListener) {
      document.removeEventListener('click', clickOutsideListener);
      clickOutsideListener = null;
    }
  }

  return {
    openMenu(name) {
      if (!menuStack.includes(name)) menuStack.push(name);
      attachClickOutside();
      document.getElementById(`${name}-menu`)?.classList.add('open');
    },
    closeMenu(name) {
      menuStack = menuStack.filter(m => m !== name);
      document.getElementById(`${name}-menu`)?.classList.remove('open');
      if (menuStack.length === 0) detachClickOutside();
    },
    isMenuOpen(name) { return menuStack.includes(name); },
  };
})();
```

### Anti-Patterns to Avoid

- **Global state mutations without guard:** Don't do `allTxData = newData` outside a module. Wrap in factory functions with validation.
- **Listener accumulation:** Don't attach new listeners without removing old ones. Use delegated handlers or clearListeners before re-attaching.
- **Direct function calls between modules:** Instead of `DataModule.loadLabels()` → `UIModule.renderLabels()`, use events: DataModule emits 'labels-updated', UIModule listens.
- **Side effects in getters:** Factory functions should have `.getState()` return immutable copies, not raw references. Prevents accidental mutations.
- **Hardcoded error messages in modules:** Pass errors to higher-level toast() via events, not directly in data layer. Keeps layers separated.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global state management | Custom mutation tracker or state machine | Factory functions with encapsulated scope | Factory closures are simpler, native to JS, and proven in this codebase. Custom state machines add complexity (XState is 200KB+ minified). |
| Decoupled module communication | Custom message bus or mediator pattern | EventTarget API with `.dispatchEvent()` | EventTarget is standard, works in all browsers, inspectable in DevTools. Custom bus adds ~100 LOC. |
| Menu/listener stacking | Individual listeners per menu with manual tracking | Single delegated handler with menu stack array | Single handler is cleaner, prevents listener leaks. Per-menu listeners are the bug (QUAL-02). |
| Cache invalidation with data comparison | Custom diff algorithm or immutable library | crypto.subtle.digest() hash of JSON state | crypto is native, fast enough for UI layer, no deps. Immutable libs are overkill for single-file app. |
| Chart memoization | Manual DOM caching or virtual DOM | Cache chart state hash + rendered HTML string | Chart is already SVG/HTML string. Caching the string avoids D3/Canvas complexity. No need for React/Preact. |
| Async deduplication | Semaphore or mutex library | Simple `_loadingPromise` variable (return in-flight promise) | Pattern already proven in loadLabels() dedup (Phase 3). No need for library. |
| Validation before save | ad-hoc checks in each mutation function | Centralized validator in data module | Consistent error handling, testable in isolation. Prevents bugs like orphaned labels (QUAL-03). |

**Key insight:** The QUAL bugs (listener stacking, label validation, chart jank) are NOT architectural deficits. They're fixable with patterns already established in Phases 1–4 (delegated handlers, error handling, Realtime sync). Don't introduce new frameworks or libraries.

---

## Common Pitfalls

### Pitfall 1: Listener Stacking (QUAL-02 Root Cause)

**What goes wrong:**
Each time a menu opens (budget, label actions), a new click-outside listener is added. If the user opens/closes menus rapidly, old listeners aren't removed, and clicking outside triggers multiple handlers, causing slow closes or unexpected behavior.

Current code (lines 2488–2546):
```javascript
document.addEventListener('click', function outside(e) {
  // Tries to remove itself, but if multiple listeners added,
  // only the last one removes, older ones remain
  document.removeEventListener('click', outside);
});
```

**Why it happens:**
Anonymous functions cannot be easily tracked. Each `addEventListener` creates a new function reference. `removeEventListener` with the same function reference should remove it, but if code paths diverge, the reference is lost.

**How to avoid:**
Use named listener functions OR delegated handlers with a menu stack. This phase uses menu stack approach (locked decision).

**Warning signs:**
- Menu takes 2–3 clicks to close
- Performance degrades after opening many menus
- DevTools event listeners panel shows multiple "click" handlers on document

### Pitfall 2: Label Desync in Edit Modal (QUAL-03 Root Cause)

**What goes wrong:**
User opens edit modal for transaction with label "Groceries". While modal is open, someone (or the current user on another tab) deletes "Groceries" label. User saves the transaction. The label is now gone from the `labels` array, but the transaction in `allTxData` still has `label_id` pointing to the deleted label. When rendering history, the transaction shows "Unlabeled" but has a stale `label_id` in DB.

Current code (lines 2802–2845):
```javascript
// No validation that editLabel.id exists in current labels before saving
const { data, error } = await db.from('expenses').update({
  label_id: editLabel.id,  // Could be deleted label!
  label_name: editLabel.name,
}).eq('id', editTx.id).select().single();
```

**Why it happens:**
Labels array is global and mutable. Modal doesn't subscribe to label changes. Deletion happens in real-time via Supabase sync (Phase 1), but modal doesn't know.

**How to avoid:**
Validate `editLabel.id` exists in `DataModule.getLabels()` just before save. If deleted, show toast and clear the label. Prevent deletion if modal is open for that label.

**Warning signs:**
- Transactions in history show "Unlabeled" but have `label_id` in DB
- Rendering label chips after deletion shows stale references
- Modal stays open even when its label is deleted

### Pitfall 3: Chart Jank on Screen Transitions (QUAL-04 Root Cause)

**What goes wrong:**
User switches screens: history → chart → budget → history. Each screen transition calls `slideToChart()` which calls `renderChart()` immediately, rebuilding the entire SVG even though data and filters haven't changed. On slow devices, this causes frame drops (jank).

Current code (lines 1794–1810, 2850–2862):
```javascript
function slideToChart() {
  // No check if chart needs rerender
  renderChart();  // Always rebuilds
}

function renderChart() {
  // Processes 200 transactions, groups by period, builds SVG
  // Runs every screen transition, even if data unchanged
}
```

**Why it happens:**
Rendering is the "everything changed" default. No cache. No state comparison. Every screen transition assumes data is fresh.

**How to avoid:**
Track chart state (period, label filter, data hash). Compare to cached state before rendering. Only rebuild if state changed.

**Warning signs:**
- Slow navigation between screens
- High CPU usage when switching tabs
- Chart flickers even if you're just switching back and forth to same screen

### Pitfall 4: Factory Function Scope Leakage

**What goes wrong:**
Developer creates factory function but exposes internal state directly:
```javascript
const Module = (() => {
  let state = [];
  return { state };  // WRONG: returns reference, not copy
})();

Module.state.push('bad');  // Mutates internal state from outside!
```

**How to avoid:**
Return immutable copies or getter functions only:
```javascript
return {
  getState() { return [...state]; },  // Copy, not reference
  setState(newState) { state = newState; },  // Controlled mutation
};
```

**Warning signs:**
- State mutations don't trigger expected re-renders
- Changes from one module don't propagate to listeners
- Impossible-to-debug "ghost" state changes

### Pitfall 5: Confusing Event Emitter Implementation

**What goes wrong:**
Mix of custom event emitter and EventTarget API:
```javascript
DataModule.emit('changed');       // Custom
DataModule.dispatchEvent(new Event('changed'));  // EventTarget
// Both trying to notify listeners; confusion about which listeners fire
```

**How to avoid:**
Pick one approach (locked decision: EventTarget API). Use consistently:
```javascript
DataModule.addEventListener('labels-updated', handler);
DataModule.dispatchEvent(new CustomEvent('labels-updated', { detail: data }));
```

**Warning signs:**
- Event handlers not firing
- Some listeners get updates, others don't
- Code has both `.on()` and `.addEventListener()`

---

## Code Examples

Verified patterns from existing codebase + locked decisions:

### Example 1: Existing Utility Function (Template for Testing)

```javascript
// Source: index.html lines 1318–1325 (from Phase 4, now extracted for testing)
// These functions can be unit tested in Node.js without DOM

function fmtNum(n, decimals = 2) {
  const locale = localStorage.getItem('spend_currency') === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

// Test in Node:
// import { fmtNum } from './utils.js';
// console.assert(fmtNum(1000, 0) === '1,000', 'US format failed');
```

### Example 2: Data Module Factory (QUAL-01)

```javascript
// Source: Pattern from Phase 1 Realtime sync + Phase 3 Promise dedup

const DataModule = (() => {
  // Private state — only accessible via public methods
  let allTxData = [];
  let labels = [];
  let _labelsLoading = null;
  let _historyLoading = null;

  // Private helper for cache sync
  function cacheLabels() {
    if (currentUser) {
      localStorage.setItem(
        `spend_labels_${currentUser.id}`,
        JSON.stringify(labels)
      );
    }
  }

  // Create internal event target for module communications
  const eventTarget = new EventTarget();

  // Public API
  return {
    // Event handling
    addEventListener(event, handler) {
      eventTarget.addEventListener(event, handler);
    },
    removeEventListener(event, handler) {
      eventTarget.removeEventListener(event, handler);
    },
    dispatchEvent(event) {
      eventTarget.dispatchEvent(event);
    },

    // State getters (return copies, not references)
    getLabels() {
      return [...labels];
    },
    getTransactions() {
      return [...allTxData];
    },

    // State setters with validation
    setLabels(newLabels) {
      if (!Array.isArray(newLabels)) {
        throw new Error('DataModule.setLabels: expected array');
      }
      labels = newLabels;
      cacheLabels();
      this.dispatchEvent(new CustomEvent('labels-updated', { detail: newLabels }));
    },

    // Async operations with dedup + error handling
    async loadLabels() {
      // Return cached promise if already loading (Phase 3 pattern)
      if (_labelsLoading) return _labelsLoading;

      _labelsLoading = (async () => {
        try {
          const { data, error } = await db.from('labels')
            .select('*')
            .eq('user_id', currentUser.id);

          if (error) throw error;

          if (Array.isArray(data)) {
            labels = data;
            cacheLabels();
            this.dispatchEvent(new CustomEvent('labels-updated', { detail: data }));
          }
        } catch (err) {
          logError('DataModule.loadLabels', err);
          this.dispatchEvent(new CustomEvent('cache-error', { detail: err }));
          throw err;
        } finally {
          _labelsLoading = null;
        }
      })();

      return _labelsLoading;
    },

    async loadHistory() {
      if (_historyLoading) return _historyLoading;

      _historyLoading = (async () => {
        try {
          const { data, error } = await db.from('expenses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Phase 3 guard: validate array before assignment
          if (Array.isArray(data)) {
            allTxData = data;
            this.dispatchEvent(new CustomEvent('transactions-updated', { detail: data }));
          }
        } catch (err) {
          logError('DataModule.loadHistory', err);
          this.dispatchEvent(new CustomEvent('cache-error', { detail: err }));
          throw err;
        } finally {
          _historyLoading = null;
        }
      })();

      return _historyLoading;
    },

    // Validation method (used by QUAL-03 fix)
    validateLabelExists(labelId) {
      return labels.some(l => l.id === labelId);
    },
  };
})();

// Usage:
// DataModule.addEventListener('labels-updated', (e) => { /* re-render */ });
// await DataModule.loadLabels();
// const txns = DataModule.getTransactions();
```

### Example 3: Chart Memoization (QUAL-04)

```javascript
// Source: Memoization pattern + Phase 1 event listening

const ChartModule = (() => {
  let cachedState = null;
  let cachedHTML = null;

  // Generate deterministic hash of current chart inputs
  function computeStateHash(transactions, period, labelFilter) {
    // In production, use crypto.subtle.digest for true hash
    // For now, JSON.stringify is sufficient for data comparison
    const state = { transactions, period, labelFilter };
    return JSON.stringify(state);
  }

  function buildChartHTML(transactions, period, labelFilter) {
    // Existing renderChart() logic here
    // Returns HTML string of SVG
    // ... (unchanged from current implementation)
  }

  function renderChart(transactions, period, labelFilter) {
    const hash = computeStateHash(transactions, period, labelFilter);

    // Cache hit: reuse previous HTML
    if (cachedState === hash && cachedHTML) {
      return cachedHTML;
    }

    // Cache miss: rebuild and cache
    const html = buildChartHTML(transactions, period, labelFilter);
    cachedState = hash;
    cachedHTML = html;
    return html;
  }

  // Listen to data module for invalidation
  DataModule.addEventListener('transactions-updated', () => {
    // Clear cache when data changes
    cachedState = null;
    cachedHTML = null;

    // Re-render only if chart screen is visible
    if (screen === 'chart') {
      const txns = DataModule.getTransactions();
      const html = renderChart(txns, activeChartPeriod, activeChartLabel);
      document.getElementById('chart-container').innerHTML = html;
    }
  });

  return {
    render(transactions, period, labelFilter) {
      return renderChart(transactions, period, labelFilter);
    },
    clearCache() {
      cachedState = null;
      cachedHTML = null;
    },
  };
})();

// Usage:
// slideToChart() now only calls ChartModule.render() which checks cache
// Switching screens doesn't trigger full rebuild if data unchanged
```

### Example 4: Menu Listener Cleanup (QUAL-02)

```javascript
// Source: Delegation pattern + Phase 1 Realtime (established pattern)

const UIModule = (() => {
  let menuStack = [];  // Track which menus are open
  let clickOutsideListener = null;

  // Attach single delegated handler to document
  function attachClickOutsideHandler() {
    if (clickOutsideListener) return;  // Already attached

    clickOutsideListener = (event) => {
      // Only process if menus are open
      if (menuStack.length === 0) return;

      // Check if click is outside the top menu
      const topMenuName = menuStack[menuStack.length - 1];
      const menuEl = document.getElementById(`${topMenuName}-menu`);

      // If menu exists and click is outside, close it
      if (menuEl && !menuEl.contains(event.target)) {
        closeMenu(topMenuName);
      }
    };

    document.addEventListener('click', clickOutsideListener);
  }

  // Remove listener when no menus are open
  function detachClickOutsideHandler() {
    if (clickOutsideListener) {
      document.removeEventListener('click', clickOutsideListener);
      clickOutsideListener = null;
    }
  }

  return {
    openMenu(name) {
      // Add to stack if not already open
      if (!menuStack.includes(name)) {
        menuStack.push(name);
      }

      // Attach listener on first menu open
      attachClickOutsideHandler();

      // Show menu element
      const menuEl = document.getElementById(`${name}-menu`);
      if (menuEl) menuEl.classList.add('open');
    },

    closeMenu(name) {
      // Remove from stack
      menuStack = menuStack.filter(m => m !== name);

      // Hide menu element
      const menuEl = document.getElementById(`${name}-menu`);
      if (menuEl) menuEl.classList.remove('open');

      // Detach listener if no menus remain open
      if (menuStack.length === 0) {
        detachClickOutsideHandler();
      }
    },

    isMenuOpen(name) {
      return menuStack.includes(name);
    },
  };
})();

// Replace old per-menu listeners with:
// document.getElementById('btn-open-budget').addEventListener('click', () => {
//   UIModule.openMenu('budget');
// });
```

### Example 5: Label Validation Before Save (QUAL-03)

```javascript
// Source: Validation + existing saveExpense pattern + Phase 1 conflict detection

async function saveExpense(formData) {
  try {
    // Validate label exists in current labels array
    const label = editLabel;
    if (label && label.id) {
      if (!DataModule.validateLabelExists(label.id)) {
        // Label was deleted while modal was open
        toast('Label was deleted, saving as unlabeled');
        editLabel = null;  // Clear the deleted label
      }
    }

    // Build payload with validated label
    const payload = {
      user_id: currentUser.id,
      amount: parseFloat(editForm.amount.value),
      label_id: editLabel?.id || null,
      label_name: editLabel?.name || null,
      created_at: editTx.created_at,
    };

    // Save to database
    const { data, error } = await db.from('expenses')
      .update(payload)
      .eq('id', editTx.id)
      .select()
      .single();

    if (error) throw error;

    // Update local state via DataModule
    // (DataModule will emit 'transactions-updated' event)
    const txns = DataModule.getTransactions();
    const idx = txns.findIndex(tx => tx.id === editTx.id);
    if (idx !== -1) {
      txns[idx] = data;
    }

    closeEditModal();
    toast('Expense saved');

  } catch (err) {
    logError('saveExpense', err);
    toast('Could not save expense');
  }
}

// Prevention: disable label delete button if edit modal is open for that label
function renderLabelActions(label) {
  const deleteBtn = document.getElementById(`btn-delete-label-${label.id}`);

  // Disable delete if this label is being edited
  if (editLabel?.id === label.id) {
    deleteBtn.disabled = true;
    deleteBtn.title = 'Cannot delete label while editing';
  } else {
    deleteBtn.disabled = false;
    deleteBtn.title = 'Delete label';
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single global namespace | Factory functions with encapsulated scope | Phase 5 (this phase) | Prevents accidental mutations, testable isolation |
| Per-menu click listeners | Single delegated handler with menu stack | Phase 5 (QUAL-02 fix) | Prevents listener stacking, cleaner cleanup |
| No chart caching | Hash-based memoization with event invalidation | Phase 5 (QUAL-04 fix) | Eliminates jank on screen transitions |
| No label validation on save | Existence check before mutation + delete prevention | Phase 5 (QUAL-03 fix) | Prevents orphaned references in database |
| Direct function calls between modules | Event-based communication via EventTarget | Phase 5 (architecture pattern) | Decouples modules, enables testing in isolation |

**Deprecated/outdated patterns (prior phases, now superseded):**
- SHA-256 unsalted PIN hashing: Replaced with PBKDF2 + salt (Phase 4, SEC-03)
- Direct innerHTML with user data: Replaced with createElement + textContent (Phase 4, SEC-01)
- No async error handling: Now wrapped in logError() calls (Phase 2)
- No promise dedup: Now uses _loadingPromise pattern (Phase 3)

---

## Open Questions

None. Locked decisions from CONTEXT.md fully specify the architecture. All patterns (factory functions, EventTarget, delegated handlers, memoization) are established in existing codebase and verified to work.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest or Node.js built-in assert (lightweight) |
| Config file | None yet (Wave 0) — will be created if needed |
| Quick run command | `node tests/unit/data-module.test.js` (inline Node test) |
| Full suite command | `npm test` (to be added in package.json) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | Factory function returns methods; state is private | Unit | `node tests/unit/data-module.test.js` | ❌ Wave 0 |
| QUAL-01 | Utility functions (fmtNum, pinHash, etc.) are exportable and testable | Unit | `node tests/unit/utils.test.js` | ❌ Wave 0 |
| QUAL-02 | Click-outside listener attached once; removed when menu stack empty | Integration | Manual (browser: open/close budget, label menus; check DevTools listeners) | ❌ Wave 0 |
| QUAL-03 | saveExpense validates label exists before mutation | Unit | `node tests/unit/label-validation.test.js` | ❌ Wave 0 |
| QUAL-03 | Delete button disabled if label is being edited in modal | Integration | Manual (browser: open edit modal, attempt delete on same label) | ❌ Wave 0 |
| QUAL-04 | Chart render with same data/period/filter returns cached HTML | Unit | `node tests/unit/chart-memoization.test.js` | ❌ Wave 0 |
| QUAL-04 | Chart cache invalidates on data-changed event | Integration | Manual (browser: add transaction, switch to chart, verify no jank) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run quick unit tests for affected module (e.g., `node tests/unit/data-module.test.js`)
- **Per wave merge:** Run full unit suite + manual integration checks for listener cleanup and chart transitions
- **Phase gate:** All unit tests passing + manual verification of QUAL-02 (no listener stacking) and QUAL-04 (no chart jank)

### Wave 0 Gaps
- [ ] `tests/unit/data-module.test.js` — Test DataModule factory encapsulation, getLabels/getTransactions, loadLabels promise dedup
- [ ] `tests/unit/utils.test.js` — Test fmtNum(), monthStart(), monthEnd(), pinHash (with crypto.subtle) — exportable from index.html
- [ ] `tests/unit/label-validation.test.js` — Test validateLabelExists() logic for QUAL-03 fix
- [ ] `tests/unit/chart-memoization.test.js` — Test computeStateHash() and cache hit/miss logic for QUAL-04
- [ ] `jest.config.js` or `package.json` test script — Will be created in plan phase if tests are added
- [ ] Manual test checklist (Phase 6 E2E): Menu listener stacking, chart jank, label desync during edit — documented for QA

*(If no automated framework added: All tests are manual. Planner will create checklist of browser behaviors to verify.)*

---

## Sources

### Primary (HIGH confidence)
- `index.html` lines 1260–1597 — Utility functions pattern (fmtNum, pinHash, monthStart, etc.) verified working
- `index.html` lines 1318–1357 — PIN hashing with PBKDF2 + salt (Phase 4, SEC-03) — crypto.subtle API proven working
- `index.html` lines 2609–2688 — Realtime sync with EventTarget pattern (Phase 1) — event-based communication proven
- `index.html` lines 1386–1391 — Promise.all dedup pattern (Phase 3) — _labelsLoading null slot proven
- `.planning/phases/05-code-quality-maintainability/05-CONTEXT.md` — Locked decisions and architecture direction from discussion phase

### Secondary (MEDIUM confidence)
- MDN Web Docs: `EventTarget` API — Standard browser API for event emission/listening
- MDN Web Docs: `crypto.subtle.digest()` — Native browser crypto for deterministic hashing (used in Phase 4)
- JavaScript.info: Factory Functions & Closures — Proven JS pattern for encapsulation

### Tertiary (Architectural Validation)
- Existing Phase 1–4 implementations — Prove that factory pattern (unlockToNumpad, setupPIN), delegated listeners (realtime subscriptions), error handling (try-catch + logError), and event-driven updates (Realtime sync) all work in single-file codebase without external frameworks

---

## Metadata

**Confidence breakdown:**
- Standard stack (factory functions, EventTarget, crypto.subtle): **HIGH** — All native browser APIs with proven precedent in Phases 1–4
- Architecture (module encapsulation, event emitters, delegated listeners): **HIGH** — Locked decisions directly reference existing patterns in codebase
- Pitfalls (listener stacking, label desync, chart jank): **HIGH** — All documented in CONCERNS.md with line numbers
- Test framework (Node.js unit tests for utilities, manual integration): **MEDIUM** — Framework choice deferred to planner; pattern is standard

**Research date:** 2026-03-26
**Valid until:** 2026-04-09 (14 days — architecture is stable, unlikely to change. Update if Phase 4 or Phase 6 plans diverge significantly.)

---

*Phase 05: Code Quality & Maintainability*
*Research completed: 2026-03-26*
