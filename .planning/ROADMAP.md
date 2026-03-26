# Roadmap: Spend Tracker Stability & Maintainability

**Version:** v1.1 (Stability Release)
**Created:** 2026-03-26
**Phases:** 5 | **Requirements:** 20 | **All v1 requirements covered** ✓

---

## Phase Breakdown

### Phase 1: Data Synchronization
**Goal:** Enable real-time multi-device sync with conflict resolution.

**Requirements:** SYNC-01, SYNC-02, SYNC-03, SYNC-04

**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Database migration: add updated_at columns, enable Realtime publication, create test checklist *(complete 2026-03-26)*
- [x] 01-02-PLAN.md — Realtime subscriptions: handleExpenseChange, handleLabelChange, setupRealtimeSync, visibility watch *(complete 2026-03-26)*
- [x] 01-03-PLAN.md — Offline sync and conflict detection: saveEdit guard, setupConnectivityWatch *(complete 2026-03-26)*

**Success Criteria:**
1. User makes expense change on Device A; appears on Device B within 1 second
2. Concurrent edits from two tabs resolve without data loss
3. Offline changes sync when connection restored
4. App detects and handles server state changes without manual refresh

**Priority:** Critical — enables reliable multi-device usage

---

### Phase 2: Error Handling & Logging
**Goal:** Replace silent failures with clear error feedback and logging.

**Requirements:** ERROR-01, ERROR-02, ERROR-03, ERROR-04

**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — Add logError/errorToast helpers; patch loadLabels, loadMonthTotals, and both Promise.all call sites *(complete 2026-03-26)*
- [x] 02-02-PLAN.md — Patch all mutation call sites (addLabel, rename, delete, saveExpense, saveEdit, deleteExpense, loadHistory) *(complete 2026-03-26)*

**Success Criteria:**
1. All database operation errors logged with full context to console/monitoring
2. User sees specific error message (e.g., "Network error — try again" vs generic "Could not add label")
3. Async data loads that fail show toast/message instead of blank state
4. Developer can diagnose production issues from logged errors

**Priority:** High — improves debuggability and user experience

---

### Phase 3: State Management
**Goal:** Eliminate race conditions and ensure data consistency.

**Requirements:** STATE-01, STATE-02, STATE-03, STATE-04

**Plans:** 2/2 plans complete

Plans:
- [x] 03-01-PLAN.md — Promise-slot dedup for loadLabels(), Array.isArray guard for allTxData, local accumulator for loadMonthTotals() *(complete 2026-03-26)*
- [x] 03-02-PLAN.md — Nav guard, currentUser null-safety *(complete 2026-03-26)*

**Success Criteria:**
1. All assignments to `allTxData`, `labels`, `currentUser` validated before assignment
2. Simultaneous `loadLabels()` calls don't create cache inconsistency
3. Functions check `currentUser` before using it (no null reference errors)
4. Rapid screen navigation doesn't cause visual glitches or state divergence

**Priority:** High — prevents hard-to-trace bugs

---

### Phase 4: Security Fixes
**Goal:** Close vulnerability gaps and harden authentication.

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04

**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — XSS fix: replace innerHTML with textContent for label rendering; move admin email to env variable placeholder *(complete 2026-03-26)*
- [x] 04-02-PLAN.md — PIN hashing: upgrade to PBKDF2 with 600,000 iterations; encrypt WebAuthn credential IDs with AES-GCM *(complete 2026-03-26)*

**Success Criteria:**
1. Label names rendered with `textContent` (XSS vectors blocked)
2. Admin email read from environment variable, not source code
3. PIN hash uses PBKDF2 with random salt (10,000 attempts take >10 minutes)
4. WebAuthn credential IDs encrypted before localStorage storage

**Priority:** Critical — protects user data and accounts

---

### Phase 5: Code Quality & Maintainability
**Goal:** Modularize codebase and fix UI/UX bugs.

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Plans:** 2/3 plans executed

Plans:
- [ ] 05-01-PLAN.md — DataModule factory: encapsulate data layer (loadLabels, loadHistory, loadMonthTotals) *(QUAL-01)*
- [ ] 05-02-PLAN.md — Menu listener cleanup & label validation: delegated click-outside handler, edit modal validation *(QUAL-02, QUAL-03)*
- [ ] 05-03-PLAN.md — Chart memoization: cache rendered SVG, invalidate on data/filter change *(QUAL-04)*

**Success Criteria:**
1. Core functions (auth, transactions, UI) extracted into separate modules
2. Budget/label menu listeners cleaned up properly (no listener stacking)
3. Edit modal validates label existence before save (orphaned references prevented)
4. Chart redraws only when data changes, not on every screen transition

**Priority:** Medium — improves maintainability for future work

---

## Execution Plan

**Wave 1 (Parallel):**
- Phase 1: Data Synchronization (complete)
- Phase 2: Error Handling & Logging (complete)
- Phase 3: State Management (complete)
- Phase 4: Security Fixes (complete)

**Wave 2:**
- Phase 5: Code Quality & Maintainability (3 plans, ready for execution)

**Total Estimated Effort:** 4-6 weeks full-time (phases can overlap for experienced developers)

---

## Requirements Mapping

All v1 requirements mapped to exactly one phase:

| Category | Phase | Count | Status |
|----------|-------|-------|--------|
| Data Synchronization | 1 | 4/4 | Complete |
| Error Handling | 2 | 4/4 | Complete |
| State Management | 3 | 4/4 | Complete |
| Security Fixes | 4 | 4/4 | Complete |
| Code Quality | 5 | 4/4 | Planning complete |

**Coverage:** 20/20 requirements mapped ✓

---

## Key Decisions

- **Modularize:** Split single file into modules for maintainability (factory functions, keep single HTML file)
- **Supabase Subscriptions:** Use real-time listeners for sync (Phase 1)
- **Server-Side Validation:** Validate sensitive operations on backend (Phase 4)
- **Structured Logging:** Add context to errors for debugging (Phase 2)
- **Event-driven modules:** Modules communicate via events, not direct calls (Phase 5)

---

*Roadmap created: 2026-03-26*
*Phase 1 planned: 2026-03-26*
*Phase 2 planned: 2026-03-26*
*Phase 3 planned: 2026-03-26*
*Phase 4 planned: 2026-03-26*
*Phase 5 planned: 2026-03-26*
