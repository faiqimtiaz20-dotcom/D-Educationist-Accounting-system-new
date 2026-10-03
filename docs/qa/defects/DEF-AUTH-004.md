# DEF-AUTH-004 — Login empty-form validation missing

## Status
**Resolved** (29 Sep 2026)

## Fix
- Added `required` on email and password inputs.
- `handleSubmit` blocks empty submit with `"Email and password are required"`.

## TC
AUTH-004
