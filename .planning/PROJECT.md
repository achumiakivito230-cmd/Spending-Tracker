# Spend Tracker: Stability & Maintainability

## What This Is

The Spend Tracker is a single-page expense management app with Supabase backend, biometric auth, and spending analytics. This phase focuses on fixing critical stability issues (data sync, error handling, state management) and modularizing the codebase to enable future development without technical debt.

## Core Value

Users have reliable, consistent expense data they can trust across devices, with clear error feedback when things go wrong. The codebase is maintainable and testable for future work.

## Requirements

### Validated

- ✓ User authentication with email/password
- ✓ Transaction creation with labels and budgets
- ✓ Transaction history and filtering
- ✓ Chart visualization of spending
- ✓ PIN and biometric unlock
- ✓ Supabase sync backend
- ✓ Vercel deployment

### Active

- [ ] Real-time data synchronization across devices
- [ ] Conflict resolution for concurrent edits
- [ ] Comprehensive error handling and logging
- [ ] Proper error messages to users
- [ ] State management without race conditions
- [ ] Modular code architecture (separate files/functions)
- [ ] No silent failures on database operations
- [ ] Consistent data validation

### Out of Scope

- New features or UI changes — defer to v2
- Mobile app — web-first for now
- Real-time chat or messaging — out of scope
- Video/media support — defer to v2

## Context

**Existing State:**
- 3,225-line single `index.html` file (HTML, CSS, JS inline)
- Supabase backend with `expenses` and `labels` tables
- In-memory state (`allTxData`, `labels`, `currentUser`, etc.)
- Detectable concerns: 169 lines documented in `.planning/codebase/CONCERNS.md`
- 10 prioritized todos for bug fixes and improvements
- No automated testing, environment config hardcoded

**User Feedback:**
- App works but has reliability issues when editing on multiple devices
- Unclear error messages when things fail
- Difficult to maintain and extend with monolithic structure

## Constraints

- **Tech Stack**: Keep Supabase, Vercel, HTML/CSS/JS (no bundler changes)
- **Compatibility**: Must work on all modern browsers (WebAuthn support)
- **No Breaking Changes**: Preserve existing API and user experience
- **No New Features**: Focus exclusively on stability and refactoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Modularize codebase | Single file is becoming unmaintainable; modules improve readability, testability, and future extensibility | — Pending |
| Implement real-time sync | Current polling-only approach misses changes from other devices; Supabase subscriptions enable live updates | — Pending |
| Add error logging | Silent failures make debugging impossible; structured logging will prevent issues in production | — Pending |
| State management refactor | Global mutable variables cause race conditions and hard-to-trace bugs; need validation and consistency | — Pending |

---
*Last updated: 2026-03-26 after initialization*
