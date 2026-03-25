# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Current State:**
- No test framework configured
- `package.json` defines test script as: `"test": "echo \"Error: no test specified\" && exit 1"`
- No test files present in codebase

**Runner:**
- Not configured
- To add testing, consider: Jest, Vitest, or Playwright for E2E

**Assertion Library:**
- Not configured

## Test File Organization

**Location:**
- No test files exist
- If added, co-located pattern recommended: `index.test.html` or separate `tests/` directory

**Naming:**
- Would follow: `*.test.js` or `*.spec.js` pattern

**Structure:**
- Single-file app structure means tests would either:
  1. Import/eval the HTML file as a module (complex)
  2. Use E2E testing against localhost server
  3. Extract functions into testable modules first

## Testing Strategy

**Untestable as Structured:**
- Current single-file, inline-script architecture prevents unit testing
- No module exports; all functions have global scope only
- Heavy DOM coupling makes isolated testing infeasible without significant refactor

**Testing Approaches Available:**

**1. Manual/Screenshot Testing (Currently Practiced):**
- `serve.mjs` runs local dev server at `http://localhost:3000`
- `screenshot.mjs` captures Puppeteer screenshots for visual validation
- Screenshots stored in `./temporary screenshots/` with auto-increment naming
- Used for design verification against reference images

**2. E2E Testing (Recommended Path):**
- Would use Playwright or Puppeteer to test complete user flows
- Test auth flow, PIN setup, transaction entry, chart rendering
- Can interact with running app at `http://localhost:3000`
- Slow but comprehensive; validates entire system

**3. Extract & Unit Test (Refactor First):**
- Move pure functions to separate modules: `utils.js` for `fmtNum()`, `chipColor()`, `polar()`
- Move data functions to module: `storage.js` for `loadLabels()`, `loadHistory()`
- Then unit test extracted logic before re-integrating

## Critical Functions Needing Testing

**Crypto/Security:**
- `pinHash(digits)` → SHA-256 hashing; verify consistent output
- `verifyPIN(digits)` → PIN verification logic
- `registerBiometric()` → WebAuthn flow (manual browser test only)

**Data Transformation:**
- `fmtNum(n, decimals)` → Number formatting with Intl.NumberFormat
- `parseAmt(s)` → String to number parsing for decimal amounts
- `fmtAmt(s)` → Display formatting with currency
- `chipColor(name)` → Color hash function for labels
- `polar(cx, cy, r, deg)` → Polar coordinate conversion for charts

**State Management:**
- `loadLabels()` → Supabase load + localStorage cache
- `loadHistory()` → Supabase transaction query + in-memory array
- `loadMonthTotals()` → Aggregation logic
- `renderChips()` → Label rendering from state

**UI Logic:**
- `pickChip(lbl, btn)` → Label selection state
- `slideToLabel()` / navigation functions → Screen state transitions
- `updateTabBar()` → Tab visibility + button marking

**Form Validation:**
- `pressKey(k)` → Numeric input validation (max 8 digits, 2 decimals)
- `lockPinInput(k)` → PIN input state (4 digits only)
- `pinSetupInput(k)` → PIN setup flow (enter, confirm, mismatch)

**Error Scenarios:**
- `try/catch` around Supabase operations (silent failures)
- `if (!db)` guards for offline/no-connection cases
- PIN mismatch → shake animation + reset state
- Transaction delete → optimistic or rollback behavior (not tested currently)

## Testing Gaps

**High Priority:**
- No validation testing for PIN creation (should reject short/mismatched)
- No test for offline behavior (localStorage-only fallback)
- No test for concurrent Supabase operations (Promise.all chains)
- No test for animation state reset on navigation
- No test for budget calculation correctness

**Medium Priority:**
- Number formatting edge cases (very large numbers, decimals)
- Date bucketing logic in `chartBuckets()` (week/month/year aggregation)
- Label color collision detection
- Form input sanitization

**Low Priority:**
- UI state machine (screen transitions, tab switching)
- localStorage key collision between users
- Browser compatibility for WebAuthn

## Recommended Testing Approach

**Phase 1: Setup (No Code Changes)**
1. Add Vitest to `package.json` for unit tests
2. Add Playwright for E2E tests
3. No refactoring needed; tests can bootstrap the app from `index.html`

**Phase 2: E2E Test Suite (Validates Flows)**
```javascript
// Example: tests/auth.spec.js
import { test, expect } from '@playwright/test';

test('user can sign up and create PIN', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('#auth-email', 'test@example.com');
  await page.fill('#auth-pass', 'password123');
  await page.click('#auth-submit');

  // PIN setup sheet appears
  await expect(page.locator('#pin-sheet-overlay')).toHaveClass('open');

  // User enters PIN
  await page.click('[data-psk="1"]');
  await page.click('[data-psk="2"]');
  await page.click('[data-psk="3"]');
  await page.click('[data-psk="4"]');

  // Confirm PIN
  await page.click('[data-psk="1"]');
  await page.click('[data-psk="2"]');
  await page.click('[data-psk="3"]');
  await page.click('[data-psk="4"]');

  // Should confirm and show toast
  await expect(page.locator('#toast')).toContainText('PIN set');
});

test('lock screen rejects incorrect PIN', async ({ page }) => {
  // Start with existing PIN
  // Go to lock screen
  // Enter wrong PIN
  // Verify shake animation + error message
  // Verify can retry
});
```

**Phase 3: Unit Tests for Pure Functions**
```javascript
// Example: tests/utils.test.js
import { fmtNum, parseAmt, polar } from '../index.html'; // would need extraction
import { test, expect } from 'vitest';

test('fmtNum formats with INR locale', () => {
  expect(fmtNum(100000, 0, 'INR')).toBe('1,00,000');
});

test('fmtNum formats with US locale', () => {
  expect(fmtNum(100000, 0, 'USD')).toBe('100,000');
});

test('parseAmt handles decimal input', () => {
  expect(parseAmt('123.45')).toBe(123.45);
  expect(parseAmt('0')).toBe(0);
  expect(parseAmt('123')).toBe(123);
});

test('polar converts degrees to coordinates', () => {
  const p = polar(100, 100, 50, 0); // center, radius, 0 deg (right)
  expect(p.x).toBeCloseTo(150, 1);
  expect(p.y).toBeCloseTo(100, 1);
});
```

## Manual Testing Checklist

**Authentication:**
- [ ] Sign up with new email/password
- [ ] Sign in with existing credentials
- [ ] Sign out clears session and shows auth screen
- [ ] Offline mode shows cached data

**PIN/Security:**
- [ ] First login prompts PIN setup after 800ms delay
- [ ] PIN must be 4 digits (no partial confirms)
- [ ] Can skip PIN setup (shows "Continue as" next time)
- [ ] Lock screen rejects incorrect PIN with shake + error
- [ ] Can change PIN from profile popover
- [ ] Can clear PIN (shows continue button next time)

**Transactions:**
- [ ] Numpad accepts 0-9 and single decimal point
- [ ] Cannot input more than 2 decimals
- [ ] Cannot exceed 8 digit whole part
- [ ] Backspace removes rightmost digit
- [ ] GO button disabled when amount ≤ 0
- [ ] Enter key submits (keyboard support)

**Labels:**
- [ ] Can add new label
- [ ] Chips render with distinct colors
- [ ] Can select/deselect chips
- [ ] Long-press opens rename/budget/delete menu
- [ ] Budget bar updates as spent amount changes
- [ ] Warning badge shows at 80%+ budget
- [ ] Can delete label (removes all transactions?)

**Navigation:**
- [ ] Tab switching animates smoothly
- [ ] All screens accessible from numpad
- [ ] Back button returns to numpad
- [ ] Escape key navigates back (on label, history screens)
- [ ] Keyboard navigation works (0-9, Enter, Backspace)

**Charts:**
- [ ] Chart renders on first visit (loads history)
- [ ] Period tabs switch aggregation (day/week/month/year/all)
- [ ] Filter chips work (by label)
- [ ] Line chart draws correctly with cumulative values
- [ ] Donut chart shows label breakdown
- [ ] Bar chart shows period buckets

**Data:**
- [ ] Transactions sync to Supabase
- [ ] Labels cached in localStorage
- [ ] Monthly totals calculated correctly
- [ ] Budget limits persist per label
- [ ] Offline: can enter transactions (queued?)
- [ ] Offline: can view cached history

**UI/Design:**
- [ ] Accent color changes persist
- [ ] Currency changes display symbols correctly
- [ ] Mobile safe-area padding correct (notch)
- [ ] Animations don't stutter on low-end devices
- [ ] Feedback form rating states animate
- [ ] Toast notifications appear/disappear

---

*Testing analysis: 2026-03-26*
