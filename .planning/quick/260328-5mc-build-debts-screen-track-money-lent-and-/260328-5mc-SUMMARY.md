---
phase: 260328-5mc
plan: 01
subsystem: debts-screen
tags: [feature, ui, supabase, debts, tab-bar]
dependency_graph:
  requires: [index.html (existing screen system, Supabase client, fmtNum, sym, logError, toast, switchTab)]
  provides: [#s-debts, loadDebts, renderDebtsScreen, openDebtDetail, settleDebtEntry, add-debt-overlay]
  affects: [tab-bar, TAB_ORDER, TAB_SCREEN_IDS, switchTab, #s-feedback accessibility]
tech_stack:
  added: []
  patterns: [screen-slide-panel, bottom-sheet-modal, fragment-based-dom-render, Supabase CRUD, optimistic-local-cache-update]
key_files:
  created: []
  modified:
    - path: index.html
      changes: "Added 90 lines CSS (debts screen, detail panel, add sheet), #s-debts screen HTML with detail panel, add-debt-overlay sheet HTML, debts JS section (~200 lines), TAB_ORDER/TAB_SCREEN_IDS update, switchTab loadDebts() hook"
decisions:
  - "Used sym() helper from existing codebase instead of manual currency map — keeps currency handling consistent"
  - "TAB_SCREENS_WITH_BAR auto-derives from TAB_ORDER so debts screen automatically gets tab bar"
  - "feedback kept in TAB_SCREEN_IDS (not TAB_ORDER) so profile popover switchTab('feedback') still works without activating a tab button"
  - "Detail panel is position:absolute inside #s-debts at z-index:50 — slides over list without new screen entry in TAB_SCREEN_IDS"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 1
---

# Phase 260328-5mc Plan 01: Debts Screen Summary

One-liner: Full Debts tab replacing Feedback icon in bottom nav, with Supabase-persisted contact ledger, add-debt bottom sheet (name/amount/direction/note), contact detail panel with per-entry settle button, and green/red balance indicators.

## What Was Built

### Task 1: CSS and SQL Migration Comment
- Added 90-line CSS block covering: debts header, summary cards (you-are-owed / you-owe), contact list rows with avatars, detail panel that slides over the list at z-index:50, settle button states, and the add-debt bottom sheet with direction chips
- Added SQL migration comment block in the JS config section documenting the `debts` table DDL (CREATE TABLE, RLS, index) for the user to apply in Supabase

### Task 2: HTML, Tab Bar Swap, and JavaScript
- Replaced `data-tab="feedback"` tab button with `data-tab="debts"` using a people/group SVG icon
- Added `#s-debts` screen with two-layer layout: contacts list (summary cards + rows) and a slide-in detail panel
- Added `#add-debt-overlay` bottom sheet with name, amount, direction chip toggle (I lent / I borrowed), optional note, and save button
- Updated `TAB_ORDER` to `['numpad', 'history', 'chart', 'budget', 'debts']` — removes feedback from tab nav
- Updated `TAB_SCREEN_IDS` to include both `debts:'s-debts'` and `feedback:'s-feedback'` — feedback remains accessible from profile popover
- Added `if (target === 'debts') loadDebts();` hook in `switchTab()`
- Added full debts JS: `setDebtDir`, `openAddDebtSheet`, `closeAddDebtSheet`, `saveDebt`, `loadDebts`, `renderDebtsScreen`, `openDebtDetail`, `settleDebtEntry`, `closeDebtDetail`
- Wired DOMContentLoaded listeners for add-button, save-button, back-button, and overlay-tap-to-close

### Task 3: Human Verification (checkpoint — awaiting user)
Awaiting user to:
1. Apply Supabase SQL migration (debts table)
2. Verify Debts tab, add/settle flow, and profile popover feedback link

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Used `sym()` instead of manual currency symbol map**
- **Found during:** Task 2 JS implementation
- **Issue:** Plan snippet used a hand-coded `{ USD:'$', EUR:'€', ... }` map; existing codebase has `sym()` helper that reads `currency` variable
- **Fix:** Replaced inline map with `sym()` calls in `renderDebtsScreen()` and `openDebtDetail()`
- **Files modified:** index.html
- **Commit:** d94e089

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 6421803 | feat(260328-5mc-01): add Debts screen CSS and Supabase SQL migration comment |
| 2    | d94e089 | feat(260328-5mc-01): add Debts screen HTML, tab bar swap, and JS |

## Deployment

Deployed to: https://spend-tracker-iota.vercel.app

## Self-Check

- [x] `#s-debts` screen exists in index.html
- [x] `data-tab="debts"` present (1 instance), `data-tab="feedback"` absent from tab bar (0 instances)
- [x] `TAB_ORDER` contains `debts`, not `feedback`
- [x] `loadDebts`, `saveDebt`, `settleDebtEntry`, `renderDebtsScreen` all present
- [x] `add-debt-overlay` HTML present
- [x] `debt-detail-panel` HTML present
- [x] Commits 6421803 and d94e089 exist
- [x] Deployed to Vercel production

## Self-Check: PASSED
