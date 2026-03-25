# Manual Test Checklist: Data Synchronization (Phase 1)

Tests for requirements SYNC-01 through SYNC-04. Run these after all Wave 1–3 plans are merged.
All tests require a live Supabase connection. Use two browser tabs on the same account.

**Pre-conditions:**
- Local dev server running: `node serve.mjs` (serves http://localhost:3000)
- A test account signed in on at least one tab
- Supabase updated_at columns and realtime publication confirmed in place (see 01-01-PLAN.md)

---

## SYNC-01: Real-time multi-device sync

**Requirement:** User changes from one device reflect in real-time on other devices without page reload.

- [ ] Open two browser tabs to http://localhost:3000
- [ ] Sign in to the same account on both tabs
- [ ] In Tab A, navigate to the numpad screen, enter an amount, pick a label, tap Save
- [ ] Switch to Tab B immediately (without reloading)
- [ ] Observe Tab B's history screen — the new expense must appear within 3 seconds

**Pass condition:** Tab B shows the new expense with the correct amount and label, with no page reload triggered.

Notes:

---

## SYNC-02: Concurrent edit conflict detection (last-write-wins)

**Requirement:** App detects concurrent edits and prevents data loss with conflict resolution.

Conflict resolution strategy: **last-write-wins** — the later save proceeds and completes, but the user on the stale tab receives a warning toast before their save lands, informing them that another device has already edited the record.

- [ ] Open two browser tabs to http://localhost:3000
- [ ] Sign in to the same account on both tabs
- [ ] Navigate both tabs to the history screen
- [ ] In Tab A, open the edit modal for an existing expense — do NOT save yet
- [ ] In Tab B, open the edit modal for the **same expense**, change the amount to a different value, tap Save
- [ ] Wait for Tab B to show an "Updated!" confirmation toast
- [ ] Return to Tab A, change the amount to yet another different value, tap Save
- [ ] Observe the toast that appears in Tab A before or during save

**Pass condition:** Tab A shows a toast containing the phrase "edited on another device" (or similar conflict warning). The edit still saves successfully (last-write-wins — Tab A's value becomes the final value). No data loss or silent overwrite without warning.

Notes:

---

## SYNC-03: Offline re-sync

**Requirement:** App re-fetches latest data when connectivity is restored after being offline.

Note: The app does not queue offline writes — expenses entered offline will fail. This test verifies that on reconnect, the app pulls any server-side changes it missed while offline.

- [ ] Sign in on one tab; navigate to the history screen; verify data loads correctly
- [ ] Open DevTools (F12) → Network tab → set throttle dropdown to "Offline"
- [ ] In a separate Supabase Table Editor tab (or another browser), insert a new expense row for this user directly in the database
- [ ] Return to the first tab (still showing Offline throttle) — note no new expense appears
- [ ] In DevTools Network tab, set throttle back to "No throttling"
- [ ] Watch the first tab for an automatic sync response

**Pass condition:** A toast reading "Back online — syncing…" (or similar) appears within 2 seconds of going back online. The new expense that was inserted directly in Supabase appears in the history list without requiring a manual page reload.

Notes:

---

## SYNC-04: Stale data detection after tab sleep

**Requirement:** Stale data detection prevents showing outdated transaction history when a tab returns from a long background period.

- [ ] Sign in on one tab; navigate to the history screen; note the current expense list
- [ ] In Supabase Table Editor, insert a new expense row for this user directly in the database
- [ ] Switch away from the tab for at least 5 real minutes (go to another tab or minimize), then return

**Alternative quick test (DevTools shortcut):**
- [ ] In DevTools Console, run `document.dispatchEvent(new Event('visibilitychange'))` to simulate returning from background
- [ ] Note: this only triggers a re-fetch if `hiddenAt` was set more than 5 minutes ago. For the shortcut to work, you must have hidden the tab at least 5 minutes before running this command.

**Pass condition:** History re-fetches automatically upon tab becoming visible again; the newly inserted expense appears in the list without a manual reload.

Notes:

---

## Summary

| Req ID | Test Name | Result | Tested By | Date |
|--------|-----------|--------|-----------|------|
| SYNC-01 | Real-time multi-device sync | | | |
| SYNC-02 | Concurrent edit conflict detection | | | |
| SYNC-03 | Offline re-sync | | | |
| SYNC-04 | Stale data detection after tab sleep | | | |

**Overall pass:** All four rows must show "Pass" before Phase 1 can be closed.
