# Roadmap: Spend Tracker Stability & Maintainability

**Version:** v1.1 (Stability Release)
**Created:** 2026-03-26
**Phases:** 5 | **Requirements:** 20 | **All v1 requirements covered** ✓

---

## Phase Breakdown

### Phase 1: Data Synchronization
**Goal:** Enable real-time multi-device sync with conflict resolution.

**Requirements:** SYNC-01, SYNC-02, SYNC-03, SYNC-04

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

**Success Criteria:**
1. Label names rendered with `textContent` (XSS vectors blocked)
2. Admin email read from environment variable, not source code
3. PIN hash uses Argon2/PBKDF2 with random salt (10,000 attempts take >minutes)
4. WebAuthn credential IDs encrypted before localStorage storage

**Priority:** Critical — protects user data and accounts

---

### Phase 5: Code Quality & Maintainability
**Goal:** Modularize codebase and fix UI/UX bugs.

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Success Criteria:**
1. Core functions (auth, transactions, UI) extracted into separate modules
2. Budget/label menu listeners cleaned up properly (no listener stacking)
3. Edit modal validates label existence before save (orphaned references prevented)
4. Chart redraws only when data changes, not on every screen transition

**Priority:** Medium — improves maintainability for future work

---

## Execution Plan

**Wave 1 (Parallel):**
- Phase 1: Data Synchronization
- Phase 2: Error Handling & Logging

**Wave 2 (Sequential after Wave 1):**
- Phase 3: State Management
- Phase 4: Security Fixes (parallel with Phase 3)

**Wave 3:**
- Phase 5: Code Quality & Maintainability

**Total Estimated Effort:** 4-6 weeks full-time (phases can overlap for experienced developers)

---

## Requirements Mapping

All v1 requirements mapped to exactly one phase:

| Category | Phase | Count | Status |
|----------|-------|-------|--------|
| Data Synchronization | 1 | 4 | Pending |
| Error Handling | 2 | 4 | Pending |
| State Management | 3 | 4 | Pending |
| Security Fixes | 4 | 4 | Pending |
| Code Quality | 5 | 4 | Pending |

**Coverage:** 20/20 requirements mapped ✓

---

## Key Decisions

- **Modularize:** Split single file into modules for maintainability
- **Supabase Subscriptions:** Use real-time listeners for sync (not polling)
- **Server-Side Validation:** Validate sensitive operations on backend
- **Structured Logging:** Add context to errors for debugging

---

*Roadmap created: 2026-03-26*
*Next: /gsd:discuss-phase 1 or /gsd:plan-phase 1*
