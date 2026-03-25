# Phase 1: Data Synchronization - Research

**Researched:** 2026-03-26
**Domain:** Supabase Realtime, offline detection, conflict resolution
**Confidence:** HIGH (core Supabase APIs), MEDIUM (conflict resolution patterns)

---

## Summary

The Spend Tracker currently loads all transaction data once per session into `allTxData` and never refreshes it from Supabase unless the page reloads. If the user opens the app on a second device, adds an expense, then returns to the first device, the first device will show stale data until a manual page reload. There is no websocket subscription, no polling, and no conflict detection when the edit modal is open.

Supabase ships a first-class Realtime engine (WebSocket-based) that publishes Postgres row-level INSERT/UPDATE/DELETE events to subscribing clients. This is the correct tool for SYNC-01 and SYNC-04. Offline detection (SYNC-03) uses native browser events (`window.online`/`offline`) to queue a re-fetch when connectivity returns. Conflict resolution for concurrent edits (SYNC-02) is a product decision: last-write-wins is the standard for a single-user expense app and is safe here.

Because the project keeps Supabase, the Vercel/single-HTML-file stack, and no bundler, the implementation stays within the existing `index.html` by adding a `setupRealtimeSync()` function that creates one channel after `onSignedIn()` and tears it down on `doSignOut()`.

**Primary recommendation:** Use `supabase.channel().on('postgres_changes', ...)` to subscribe to all `expenses` and `labels` changes for the current user immediately after sign-in, apply arriving events as deltas to `allTxData`, and trigger a full re-fetch on `window.online` after offline periods. Use last-write-wins (timestamp comparison) for concurrent edit conflicts.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | User changes from one device reflect in real-time on other devices | Supabase `postgres_changes` subscription delivers INSERT/UPDATE/DELETE to all connected clients in real-time |
| SYNC-02 | App detects concurrent edits and prevents data loss with conflict resolution | Pre-save `updated_at` timestamp check implements last-write-wins; requires `updated_at` column on `expenses` |
| SYNC-03 | Offline changes sync to server when connection restored | `window.online` event triggers `loadHistory()` re-fetch; no client-side queue needed for this use case |
| SYNC-04 | Stale data detection prevents showing outdated transaction history | Realtime subscription keeps `allTxData` fresh; page-visibility re-fetch catches gaps from subscription loss |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | v2 (already loaded via CDN) | Realtime WebSocket channel API | Already in-app; `channel().on('postgres_changes')` is the official API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser `window` events | Native | Online/offline detection | `online`/`offline` events signal when to re-fetch |
| `document.visibilityState` | Native | Tab visibility detection | Re-fetch when tab becomes visible after being hidden (catches missed events) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime (push) | Polling with `setInterval` | Polling is simpler but wastes bandwidth and misses changes between intervals; Realtime is near-instant and the same cost |
| Custom delta logic | Full re-fetch on every event | Delta approach is fast and avoids re-rendering unchanged data; full re-fetch is simpler but causes flicker on active screens |
| RxDB / PowerSync | None for this scope | Both provide offline-first with conflict queues; overkill for a single-user app where last-write-wins is acceptable |

**No new packages required.** The existing Supabase CDN client (`@supabase/supabase-js@2`) already ships the full Realtime API.

---

## Architecture Patterns

### Recommended Structure Within index.html

The existing file has no module system, so all new sync code lives as named functions near the Data Access Layer (lines ~1609–2836). Group additions together:

```
index.html (existing structure, additions marked +)
├── State layer (~1177)         — allTxData, labels, currentUser
├── Data Access Layer (~1609)   — loadHistory(), saveExpense(), etc.
+ ├── setupRealtimeSync()       — creates channel, registers handlers
+ ├── teardownRealtimeSync()    — calls removeChannel()
+ ├── handleExpenseChange()     — applies INSERT/UPDATE/DELETE to allTxData
+ ├── handleLabelChange()       — applies INSERT/UPDATE/DELETE to labels
+ └── setupConnectivityWatch()  — window.online/offline + visibilitychange
├── Boot IIFE (~3169)
+   └── calls setupRealtimeSync() inside onSignedIn()
+   └── calls teardownRealtimeSync() inside doSignOut()
```

### Pattern 1: Supabase Realtime Subscription

**What:** Open one channel per session, listening to `*` events on `expenses` and `labels` tables filtered to the current user's rows.

**When to use:** Immediately after `onSignedIn()`, before any screen is shown.

**Example:**
```javascript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
let realtimeChannel = null;

function setupRealtimeSync(userId) {
  // Always clean up before creating a new channel
  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
  }

  realtimeChannel = db
    .channel('user-expenses-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `user_id=eq.${userId}`
      },
      (payload) => handleExpenseChange(payload)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'labels',
        filter: `user_id=eq.${userId}`
      },
      (payload) => handleLabelChange(payload)
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Re-fetch to cover any events missed during disconnect
        loadHistory();
      }
    });
}

function teardownRealtimeSync() {
  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
```

### Pattern 2: Applying Delta Events to In-Memory State

**What:** Update `allTxData` in-place based on the event type, then re-render only the affected screen.

**When to use:** Inside the `handleExpenseChange()` callback for every Realtime event.

```javascript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
function handleExpenseChange(payload) {
  const { eventType, new: newRow, old: oldRow } = payload;

  if (eventType === 'INSERT') {
    // Skip if we own this insert (already added optimistically)
    if (allTxData.some(tx => tx.id === newRow.id)) return;
    allTxData.unshift(newRow);

  } else if (eventType === 'UPDATE') {
    const idx = allTxData.findIndex(tx => tx.id === newRow.id);
    if (idx !== -1) allTxData[idx] = newRow;

  } else if (eventType === 'DELETE') {
    // oldRow contains only primary key for DELETE (no full row)
    allTxData = allTxData.filter(tx => tx.id !== oldRow.id);
  }

  // Re-render visible screen
  if (screen === 'history') renderHistory(allTxData, activeFilter);
  if (screen === 'chart')   renderChart();
}
```

### Pattern 3: Conflict Detection on Save

**What:** Before overwriting a record via `saveEdit()`, compare the stored `updated_at` timestamp against the value that was loaded when the edit modal opened.

**When to use:** Inside `saveEdit()`, as a guard before the Supabase `update()` call.

```javascript
// Requires: expenses table has an updated_at column (auto-updated by Postgres trigger)
// Requires: editTx captured at modal open time stores editTx._capturedAt = editTx.updated_at

async function saveEdit() {
  // Fetch the current server row to detect concurrent changes
  const { data: current } = await db
    .from('expenses')
    .select('updated_at')
    .eq('id', editTx.id)
    .single();

  if (current && current.updated_at !== editTx._capturedAt) {
    // Conflict detected: another device edited this row
    // Strategy: last-write-wins — show warning toast, proceed with save
    toast('Note: this expense was edited on another device. Your changes will be saved.');
  }

  // Proceed with update (last-write-wins)
  const { error } = await db
    .from('expenses')
    .update({ amount: editTx.amount, label_name: editTx.label_name, label_id: editTx.label_id })
    .eq('id', editTx.id);

  if (error) { toast('Could not save edit.'); return; }
  // Realtime will deliver the UPDATE event back to this tab — no manual allTxData patch needed
}
```

### Pattern 4: Offline Detection and Re-Sync

**What:** Listen for `window.online` to trigger a full re-fetch when connectivity restores. Listen for `visibilitychange` to catch stale data after a long tab sleep.

**When to use:** Called once in `setupConnectivityWatch()` after sign-in.

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
function setupConnectivityWatch() {
  window.addEventListener('online', () => {
    toast('Back online — syncing…');
    loadHistory().then(() => {
      if (screen === 'history') renderHistory(allTxData, activeFilter);
      if (screen === 'chart')   renderChart();
    });
  });

  // Re-fetch when tab becomes visible after >5 min in background
  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
      loadHistory();
      hiddenAt = null;
    }
  });
}
```

### Anti-Patterns to Avoid

- **Do not create a new channel on every screen transition.** Channels are per-session, not per-screen. One channel handles all tables for the session lifetime.
- **Do not call `loadHistory()` on every Realtime event.** This defeats the purpose of delta sync. Only re-fetch on reconnect or CHANNEL_ERROR.
- **Do not filter DELETE events at the subscription level.** Supabase cannot filter deletes by column value — you must handle all deletes and check the `old.id` client-side.
- **Do not leave orphaned channels.** Always call `db.removeChannel(channel)` in `doSignOut()` and before creating a new channel on re-auth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket management | Custom WebSocket reconnect loop | Supabase Realtime channel with subscribe status callbacks | Supabase handles exponential backoff, heartbeats, and auth token refresh automatically |
| Server-push notifications | SSE or polling loop | `db.channel().on('postgres_changes')` | Already included in the Supabase CDN library in-use |
| Offline queue | IndexedDB queue with sync worker | Re-fetch on `window.online` | This is a single-user expense app — there are no concurrent offline writes to reconcile; a re-fetch on reconnect covers 100% of cases |
| Conflict merging | Field-level CRDT merge | Last-write-wins with `updated_at` guard | A user editing their own expenses on two devices simultaneously is a degenerate case; LWW with a warning toast is appropriate |

**Key insight:** Supabase Realtime is already bundled in `@supabase/supabase-js` v2. Zero new dependencies are needed. The entire sync system is ~80 lines of JavaScript added to the existing file.

---

## Common Pitfalls

### Pitfall 1: Table Not in supabase_realtime Publication
**What goes wrong:** Channel subscribes successfully but no events arrive. The subscription callback fires `SUBSCRIBED` but data changes are invisible.
**Why it happens:** Tables must be explicitly added to the `supabase_realtime` Postgres publication. New tables are not included by default.
**How to avoid:** Run this SQL in the Supabase dashboard before testing:
```sql
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table labels;
```
**Warning signs:** Channel status reaches `SUBSCRIBED` but no payload arrives after making a change directly in Supabase Table Editor.

### Pitfall 2: RLS Blocks Realtime Events
**What goes wrong:** Subscription is active but only some events arrive, or no events arrive despite the table being in the publication.
**Why it happens:** Supabase Realtime respects RLS. If the user's JWT doesn't satisfy the SELECT policy on the row being changed, the event is filtered out server-side.
**How to avoid:** Verify the RLS SELECT policy allows `auth.uid() = user_id` for authenticated users. Test with Supabase's policy tester.
**Warning signs:** Direct database reads work fine but Realtime delivers nothing for the same rows.

### Pitfall 3: DELETE Events Carry Only Primary Key
**What goes wrong:** `payload.old` in a DELETE event is `{ id: "..." }` with no other columns.
**Why it happens:** Postgres WAL for DELETE only reliably contains the primary key unless `REPLICA IDENTITY FULL` is set. Supabase does not set this by default.
**How to avoid:** Use `payload.old.id` to filter from `allTxData`. Do not access `payload.old.amount` or `payload.old.label_name` — they will be undefined.
**Warning signs:** `console.log(payload.old)` on delete shows only `{ id: "..." }`.

### Pitfall 4: Duplicate Inserts from Optimistic + Realtime
**What goes wrong:** User saves an expense; the app immediately adds it to `allTxData` (optimistic). Then Realtime delivers the INSERT event for the same row. The history screen shows the expense twice.
**Why it happens:** The app applies the Realtime event without checking if the row is already present.
**How to avoid:** In `handleExpenseChange` for INSERT, check `allTxData.some(tx => tx.id === newRow.id)` before adding. Current code does not do this.
**Warning signs:** After saving, history shows duplicates that disappear only on page reload.

### Pitfall 5: Channel Not Cleaned Up on Sign-Out
**What goes wrong:** After sign-out and sign-in as a different user, the previous channel (keyed to old userId filter) is still active. Events from the new session may not arrive correctly, or old events may bleed through.
**Why it happens:** Channels persist in `supabase.channels[]` until explicitly removed.
**How to avoid:** Call `teardownRealtimeSync()` at the start of `doSignOut()`, before clearing `currentUser`.
**Warning signs:** Events arrive after sign-out, or channel count in `db.getChannels()` grows per login cycle.

### Pitfall 6: Missed Events During Tab Sleep
**What goes wrong:** User leaves tab open for 30+ minutes (mobile browser throttled). Returns to find stale data even though the Realtime channel is nominally active.
**Why it happens:** Mobile browsers throttle background tabs. WebSocket connections may silently drop. Supabase Realtime does not queue missed events — they are lost.
**How to avoid:** Re-fetch `loadHistory()` when `document.visibilityState` changes from `hidden` to `visible` after >5 minutes.
**Warning signs:** User reports data is stale after returning to the app on mobile.

---

## Code Examples

### Full Channel Setup (Verified API Pattern)
```javascript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
// Source: https://supabase.com/docs/reference/javascript/removechannel

let realtimeChannel = null;

function setupRealtimeSync(userId) {
  if (realtimeChannel) db.removeChannel(realtimeChannel);

  realtimeChannel = db
    .channel('user-data-sync')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
      handleExpenseChange
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'labels', filter: `user_id=eq.${userId}` },
      handleLabelChange
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Full re-fetch covers events missed during disconnect window
        loadHistory();
      }
    });
}
```

### Enabling Tables in Supabase Dashboard (SQL)
```sql
-- Run once in Supabase SQL Editor
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table labels;

-- Add updated_at column for conflict detection (if not already present)
alter table expenses
  add column if not exists updated_at timestamptz default now();

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger expenses_updated_at
  before update on expenses
  for each row execute function update_updated_at();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `db.from('table').on('INSERT', cb)` (legacy syntax) | `db.channel().on('postgres_changes', {event:'INSERT',...}, cb)` | supabase-js v2 (2022) | Old syntax does not work in v2; new channel API is the only supported path |
| Polling with `setInterval` | Realtime WebSocket subscription | Supabase Realtime GA (~2023) | Polling is now an anti-pattern for Supabase; use subscriptions |

**Deprecated/outdated:**
- `supabase.from('table').on('INSERT', callback).subscribe()` — this is the v1 API. The project already uses `@supabase/supabase-js@2` (confirmed via CDN import in `index.html`). Do not use the v1 syntax.

---

## Open Questions

1. **Does `expenses` already have an `updated_at` column?**
   - What we know: The schema documented in INTEGRATIONS.md lists fields as `id, user_id, amount, label_id, label_name, created_at`. No `updated_at`.
   - What's unclear: Whether one was added manually in Supabase dashboard.
   - Recommendation: SYNC-02 (conflict detection) requires `updated_at`. The Wave 0 task must add this column and trigger before any conflict detection code runs.

2. **Are RLS SELECT policies already configured on `expenses` and `labels`?**
   - What we know: INTEGRATIONS.md confirms RLS is used (`filter by currentUser.id` at app layer). Whether Postgres-level SELECT policies are set for `auth.uid()` is unconfirmed.
   - What's unclear: Whether Realtime will pass through events without an explicit SELECT policy.
   - Recommendation: Verify in Supabase dashboard. If SELECT policy is missing, Realtime will deliver no events. Add: `create policy "User owns expenses" on expenses for select using (auth.uid() = user_id);`

3. **Is the `expenses` table currently in the `supabase_realtime` publication?**
   - What we know: INTEGRATIONS.md shows no subscriptions are configured today.
   - What's unclear: Whether the table was added to the publication at any point.
   - Recommendation: Treat as "not added" and include the `alter publication` SQL in Wave 0 setup steps.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently — zero automated test coverage per CONCERNS.md |
| Config file | None — Wave 0 must create manual validation checklist |
| Quick run command | Manual browser test (see checklist below) |
| Full suite command | Manual multi-tab test (see checklist below) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Test Method | Notes |
|--------|----------|-----------|-------------|-------|
| SYNC-01 | Change on device A appears on device B without reload | Manual (two tabs) | Open two browser tabs. Add expense in Tab A. Verify it appears in Tab B's history within 3 seconds. | Cannot be automated without E2E framework |
| SYNC-02 | Concurrent edit detected; save proceeds with warning | Manual | Open edit modal. In another tab, edit same expense and save. Return to first tab and save. Verify toast appears. | Requires `updated_at` column |
| SYNC-03 | Offline changes sync when back online | Manual | Go offline (DevTools → Network → Offline). Add expense. Go back online. Verify it syncs. | Note: expense saves fail offline since there's no queue — this requirement means re-fetching latest data on reconnect, not queuing offline writes |
| SYNC-04 | Stale data not shown after tab returns from background | Manual | Switch away from tab for 5 min. Return. Verify history re-fetches. | Test with DevTools Performance throttling or actual device |

### Sampling Rate
- **Per task:** Manually verify the specific behavior the task implements before marking done
- **Per wave merge:** Run the full manual checklist (SYNC-01 through SYNC-04)
- **Phase gate:** All 4 items pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `expenses` table needs `updated_at` column + trigger (SQL migration, not a code file)
- [ ] `expenses` and `labels` added to `supabase_realtime` publication (SQL, Supabase Dashboard)
- [ ] RLS SELECT policy confirmed for both tables
- [ ] Manual test checklist created as `.planning/phases/01-data-synchronization/TEST-CHECKLIST.md`

*(No automated test files needed — the single-HTML-file architecture has no test runner. Manual verification is the correct approach for this phase.)*

---

## Sources

### Primary (HIGH confidence)
- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — subscription API, RLS requirements, filter limitations, DELETE event behavior
- [Supabase removeChannel Reference](https://supabase.com/docs/reference/javascript/removechannel) — channel cleanup API
- [Supabase subscribe Reference](https://supabase.com/docs/reference/javascript/subscribe) — status callbacks, channel management

### Secondary (MEDIUM confidence)
- [Supabase Realtime RLS Blog Post](https://supabase.com/blog/realtime-row-level-security-in-postgresql) — confirmed RLS enforcement on Realtime events
- [MDN Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) — offline detection API; `false` is reliable, `true` is not
- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) — confirmed events are not queued during disconnects

### Tertiary (LOW confidence — for context only)
- [GitHub Discussion: Supabase offline support](https://github.com/orgs/supabase/discussions/357) — confirms no native offline queue; third-party solutions (RxDB, PowerSync) are overkill for this use case
- [GitHub Discussion: How to handle realtime idle reconnects](https://github.com/orgs/supabase/discussions/19387) — community pattern for visibilitychange re-fetch

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Supabase Realtime API verified directly from official docs; v2 channel API confirmed
- Architecture: HIGH — Patterns derived from official docs; delta apply pattern is standard
- Pitfalls: HIGH — DELETE key-only behavior and publication requirement confirmed from official docs; duplicate insert pitfall is logical from the existing optimistic insert code
- Conflict resolution: MEDIUM — Last-write-wins recommendation based on product logic (single user, low concurrency), not benchmarked

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (Supabase Realtime API is stable; the v2 channel API has been stable since 2022)
