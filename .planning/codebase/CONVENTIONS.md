# Coding Conventions

**Analysis Date:** 2026-03-26

## Language & Environment

**Primary Language:** JavaScript (inline in single HTML file)
- No build step, no framework, no module system
- All code runs in browser context within `<script>` tag at bottom of `index.html`

## Naming Patterns

**Files:**
- Single file architecture: `index.html` contains all HTML, CSS, and JavaScript

**Functions:**
- camelCase for all functions: `loadLabels()`, `refreshDisplay()`, `verifyPIN()`, `pinSetupInput()`
- Descriptive, action-oriented names: `slideToLabel()`, `openBudgetInput()`, `applyAccent()`
- Async functions prefixed with `async`: `async function pinHash()`, `async function doAuth()`
- Event handler functions describe what happens: `lockPinInput(k)`, `pressKey(k)`

**Variables:**
- camelCase for all variables: `lockRaw`, `labels`, `monthTotals`, `currentUser`, `cachedSession`
- State variables prefixed with intent when grouped: `pinSetupRaw`, `pinSetupStep`, `pinSetupFirst`
- Array/collection variables use plural or descriptive names: `allTxData`, `labels`, `ACCENT_COLORS`, `FB_STATES`
- Boolean prefixes optional but many use predicate style: `hasPIN()`, `hasBio`

**Constants:**
- UPPER_SNAKE_CASE for configuration constants: `SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_EMAIL`, `CURRENCIES`, `ACCENT_COLORS`
- UPPER_SNAKE_CASE for lookup tables: `NEON_PALETTE`, `FB_STATES`, `PERIOD_LABELS`, `TAB_ORDER`, `TAB_SCREEN_IDS`, `TAB_SCREENS_WITH_BAR`

**Types/Objects:**
- Objects use camelCase properties: `{label, total}`, `{bg, fg}`, `{eyeL, eyeR}`
- Dataset attributes use kebab-case: `data-k`, `data-id`, `data-tab`, `data-lock`, `data-psk`

**CSS Classes:**
- kebab-case for all CSS classes: `.chip-bar`, `.label-action-menu`, `.budget-input-row`, `.lock-dots`
- BEM-style modifiers with `.active`, `.danger`, `.open`: `.tab-btn.active`, `.label-action-btn.danger`
- Screen identifiers: `#s-auth`, `#s-lock`, `#s-numpad`, `#s-label`, `#s-history`, `#s-chart`, `#s-budget`, `#s-feedback`

**DOM IDs:**
- kebab-case with descriptive prefixes: `#auth-email`, `#lock-dots`, `#fb-mic-btn`, `#budget-numpad-modal`
- Screen wrapper IDs: `#s-{screen-name}`
- Modal/overlay IDs: `#{screen}-overlay` or `#{screen}-sheet` or `#{screen}-numpad-modal`

## Code Structure & Organization

**Section Organization:**
- Code uses inline comment separators: `// ════════════════════════════`
- Sections describe functional area: `// CONFIG`, `// STATE`, `// PIN / LOCK`, `// NAVIGATION`, `// NUMPAD`, `// LABELS + BUDGET`, `// CHART`, `// EVENT LISTENERS`
- Section order matches feature importance and call order

**Comments:**
- Section headers use Unicode box-drawing: `// ────────────────────────────`
- CSS selectors use ASCII art comments: `/* ── FLOATING SHAPES ── */`, `/* ── SCREEN 0: AUTH ── */`
- State variable declarations include purpose comment: `let lockRaw = '';` // PIN digits being entered on lock screen`
- Configuration comments are detailed with setup instructions (see ADMIN CONFIG block at line 1186-1200)
- No JSDoc; inline comments describe intent where non-obvious

**Spacing:**
- Functions separated by blank line
- Dense code within functions (single-line arrow functions common)
- Two blank lines before new functional section

## Code Style

**Formatting:**
- No formatter (Prettier/ESLint not configured)
- Inconsistent spacing in some places: `const {data}=await` vs `const { error } = await`
- Mixed one-liner vs multi-line style:
  - Single-line for simple operations: `raw=raw.slice(0,-1);`
  - Multi-line for complex logic with readability priority
- Semicolons used consistently
- No trailing commas in inline objects

**Variable Declaration:**
- `const` for immutable references (configuration, handlers)
- `let` for mutable state and counters
- `var` not used; project targets modern browsers

**Arrow Functions:**
- Inline event listeners often use implicit arrow functions: `.addEventListener('click',()=>{...})`
- Named async functions used for complex operations requiring clarity
- Short inline handlers: `btn.addEventListener('click', () => pressKey(btn.dataset.k))`

## Import Organization

**External Libraries:**
- CDN imports in `<head>`:
  ```html
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  ```
- No local imports; single-file architecture

**Global Access:**
- All code has global scope within `<script>` block
- Supabase client exposed globally: `let db = null;` (initialized in CONFIG section)
- State variables globally accessible

## Error Handling

**Patterns:**

**Try/Catch Blocks:**
- Used for operations that may fail silently: `try { db = supabase.createClient(...); } catch(e) {}`
- Silent catches common for optional features:
  ```javascript
  try { labels=JSON.parse(cached); } catch {}
  ```
- Parameter-less catch: `catch(e)` or `catch(_)` or `catch {}`

**Error Objects & Destructuring:**
- Supabase responses: `const { data, error } = await db.from(...)`
- Errors checked explicitly: `if (error) { toast('Could not rename'); return; }`
- Silent ignore pattern: `if (!db) return;`

**User-Facing Errors:**
- `toast()` function displays errors: `toast('Incorrect PIN')`
- Validation errors shown in dedicated elements: `#auth-error`, `#lock-error`
- Error clearing: `document.getElementById('lock-error').textContent = '';`

**Async Error Handling:**
- Promise chains use `.then()` with error recovery:
  ```javascript
  Promise.all([loadLabels(), loadMonthTotals()]).then(() => refreshDisplay());
  ```
- Unhandled promise rejections tolerated (no `.catch()` on all promises)
- `await` used directly in try/catch blocks

## Logging

**Framework:** No logging library; uses browser console

**Patterns:**
- No `console.log()` calls found in application code
- Errors surfaced to user via `toast()` function instead
- Debug info not exposed to console

**Toast Function:**
- `toast(message, status)` shows notifications: `toast('PIN set! You\'ll use it next time...', 'ok')`
- Used for success, error, and info messages
- Timeouts implicit (styling handles display)

## DOM Manipulation

**Query Patterns:**
- `document.getElementById(id)` for single element access (most common)
- `document.querySelectorAll(selector)` for batch operations
- `.closest(selector)` for event delegation bubbling

**Element Creation:**
- Imperative DOM creation: `document.createElement('button')`
- Inline `innerHTML` for simple content: `btn.innerHTML = '✏️ Rename'`
- Complex HTML passed as template strings with backticks:
  ```javascript
  item.innerHTML = `
    <div class="bar-label-text">${label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
  `;
  ```

**Event Listeners:**
- `addEventListener()` for all event binding
- Callback function defined inline or referenced by name
- `{once:true}` option used to auto-remove single-fire handlers:
  ```javascript
  btn.addEventListener('animationend',()=>btn.classList.remove('tapped'),{once:true});
  ```

**Class Manipulation:**
- `.classList.add()`, `.remove()`, `.toggle()` for state
- State classes: `.active`, `.off-right`, `.off-left`, `.open`, `.hidden`, `.visible`
- `.classList.toggle(className, condition)` pattern common: `d.classList.toggle('filled', i < lockRaw.length)`

## Data Access

**localStorage:**
- Used for per-user configuration: `localStorage.getItem(key)`, `localStorage.setItem(key, value)`
- Keys include user ID to scope data: `spend_pin_${userId}`, `spend_labels_${userId}`
- JSON serialization for objects:
  ```javascript
  localStorage.setItem(labelCacheKey(), JSON.stringify(labels));
  const cached = localStorage.getItem(labelCacheKey());
  if (cached) try { labels=JSON.parse(cached); } catch {}
  ```

**Database (Supabase):**
- Queries use method chain style: `await db.from('labels').select('*').order('created_at',{ascending:false})`
- Destructuring for results: `const {data}=await db.from(...)`
- No null checks on queries; trusts Supabase response structure

## Function Design

**Size:**
- Functions range from 3 lines to 40+ lines
- Most utility functions 5-15 lines
- Complex features (rendering, state management) 20-50 lines

**Parameters:**
- Single parameter pass: `pressKey(k)`, `pickChip(lbl, btn)`
- No destructuring in parameters; pass objects or primitives
- No default parameters used

**Return Values:**
- Many functions void (mutate DOM or state directly)
- Some return boolean: `await verifyPIN()`, `hasPIN()`
- Some return computed values: `fmtNum()`, `sym()`, `chipColor()`

**Side Effects:**
- Heavy reliance on side effects (DOM updates, localStorage writes)
- No pure functions; functions modify global state and DOM simultaneously
- Async functions chain `.then()` callbacks for dependent operations

## Module Design

**Exports:**
- Single-file architecture; no explicit exports
- All functions globally scoped within script

**Barrel Pattern:**
- Not applicable; no modules

**Initialization:**
- Async IIFE at bottom of script (line ~3180):
  ```javascript
  (async () => { ... })();
  ```
- Boot sequence handles Supabase setup, session restoration, and initial screen render
- Event listeners attached after DOM and state setup

## Type Safety

**No TypeScript:**
- Plain JavaScript; no type annotations
- Type inference implied by variable names and usage
- No runtime type checks; assumes correct usage

---

*Convention analysis: 2026-03-26*
