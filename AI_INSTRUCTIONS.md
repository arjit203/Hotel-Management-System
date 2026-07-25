# AI_INSTRUCTIONS.md — 7 Vachan Project (PERMANENT)

**Status:** PERMANENT. These instructions apply to every future prompt in this project, across every session, without exception.

## 0. Mandatory Pre-Read Order
Before answering ANY future prompt in this project, the AI must first read, in this order:
1. `RULES.md`
2. `AI_INSTRUCTIONS.md` (this file)
3. `PROJECT_DOCUMENTATION.md`
4. `CHANGELOG.md`
5. `API_DOCUMENTATION.md`
6. `FOLDER_STRUCTURE.md`

If any of these files are missing or not provided in context, the AI must explicitly say so before proceeding, rather than assuming defaults.

---

## 1. AI Behaviour Rules
- Never contradict RULES.md. If a prompt conflicts with it, flag the conflict and ask for confirmation before acting.
- Never assume scope — if a request is ambiguous, state the assumption explicitly and proceed, OR ask one clarifying question if the ambiguity is significant enough to cause wasted work.
- Never silently drop a previously agreed feature or decision.
- Always work module-by-module; do not sprawl into unrelated modules unless asked.
- Treat every past decision recorded in PROJECT_DOCUMENTATION.md/CHANGELOG.md as binding unless the owner explicitly changes it.

## 2. How to Respond
- Be direct and structured: state what was done, what changed, what remains.
- No code inside conceptual/planning discussions unless code is explicitly requested.
- When code IS requested, response must include: which files are affected, a summary of the change, and any required doc updates.
- Flag any security, scalability, or cost implication of a request proactively, even if not asked.

## 3. How to Modify Existing Code
- Never rewrite a whole file/module to make a small change — use targeted, minimal diffs.
- Before modifying, confirm which file(s)/function(s) are affected and check FOLDER_STRUCTURE.md for correct location.
- Preserve existing function/variable naming conventions already in use in that module.
- Do not refactor unrelated code "while you're in there" — refactors must be a separate, explicit request.

## 4. How to Update Documentation
- Every code change that adds/removes/changes a feature, API, or schema must be paired with an update to the relevant doc(s): PROJECT_DOCUMENTATION.md, API_DOCUMENTATION.md, DATABASE_SCHEMA.md, CHANGELOG.md.
- Documentation updates are not optional — a code change without a doc update is considered incomplete.
- Never delete historical entries from CHANGELOG.md — append only.

## 5. How to Create APIs
- Follow REST conventions already established in API_DOCUMENTATION.md (naming, versioning, response envelope).
- Every new API must document: method, path, auth requirement, request body, response shape, error codes.
- All APIs must validate input server-side regardless of frontend validation.
- New endpoints must be added under the correct module namespace (e.g. `/api/v1/hotel/...`, `/api/v1/hall/...`).

## 6. How to Create Components
- Components must be built for reuse across verticals where logically shared (e.g. a generic `BookingCalendar`, `GalleryGrid`, `ReviewCard` used by Hotel/Hall/Restaurant alike) rather than duplicated per vertical.
- Vertical-specific logic stays in vertical-specific components; shared UI/logic stays in `shared/` per FOLDER_STRUCTURE.md.
- Every component must be responsive by default.

## 7. How to Maintain Scalability
- Design every new feature assuming multiple branches/hotels/halls/restaurants exist, even if only 1 exists today.
- Avoid hardcoded IDs, single-tenant assumptions, or singleton data models anywhere.
- Prefer async/queue-based processing for notifications, emails, and payment webhooks over blocking synchronous calls.

## 8. How to Maintain Security
- Never store raw card data; payments only via gateway tokens/handoff (Razorpay or approved alternative).
- All admin routes require authentication + RBAC check server-side, not just hidden in UI.
- All user input sanitized/validated server-side; parameterized queries only, never string-concatenated SQL.
- Secrets/keys only via environment variables, never hardcoded — see ENVIRONMENT_VARIABLES.md.
- Rate-limit public-facing forms (booking, contact, enquiry) to prevent abuse/spam.

## 9. How to Maintain SEO
- Every public page must have unique meta title/description, managed via SEO Data model (admin-editable), not hardcoded.
- Server-side rendering or pre-rendering required for public pages (SEO cannot depend on client-side-only rendering).
- All images require alt text; all pages included in sitemap.xml unless explicitly excluded.
- Structured data (schema.org: Hotel, Restaurant, LocalBusiness, Event) required on relevant pages.

## 10. How to Handle Deployment
- Follow DEPLOYMENT_GUIDE.md exactly; no ad hoc production changes outside documented process.
- All changes go through a staging step before production where feasible.
- Never deploy schema-breaking changes without a documented migration in DATABASE_SCHEMA.md + CHANGELOG.md.

## 11. How to Handle Payments
- Razorpay is default gateway; any alternative must be explicitly approved by the owner (see RULES.md).
- Support both full and partial/advance payments per PAYMENT_GUIDE.md.
- All payment status changes must be driven by verified webhook events, never trusted purely from client-side confirmation.
- Every successful payment must generate an invoice record and be logged for refund traceability.

## 12. How to Maintain Folder Structure
- FOLDER_STRUCTURE.md is frozen once finalized — do not introduce new top-level folders without explicit owner approval.
- New files must go into the correct existing subfolder based on module/type, never a new ad hoc folder.

## 13. How to Handle Existing Modules
- Before touching an existing module, read its section in PROJECT_DOCUMENTATION.md to understand its current responsibilities and dependencies.
- Do not merge or split existing modules without explicit request.
- Cross-module changes (e.g. a change in Booking Engine affecting Hotel + Hall + Restaurant) must be called out explicitly, with impact listed per module.

## 14. How to Maintain Backward Compatibility
- Existing API contracts must not break for already-integrated clients (admin panel, mobile app if any) without a versioned endpoint (`/v2/...`) and a deprecation note in CHANGELOG.md.
- Database migrations must be additive/backward-compatible where possible (add columns with defaults, avoid destructive drops without a migration plan and backup).

## 15. How to Write Reusable Code
- Shared logic (booking conflict checks, payment handling, notification sending) lives once in shared utilities, not duplicated per vertical.
- Configuration (business hours, currency, tax rate) must be data-driven/admin-configurable, not hardcoded constants.

## 16. How to Provide Testing Instructions
- Every feature delivered must come with: what to test manually, expected result, and edge cases to check (e.g. double-booking attempt, payment failure mid-flow, expired coupon).
- Critical flows (booking, payment, refund) require test coverage before being marked production-ready in CHANGELOG.md.
- See TESTING_GUIDE.md for structure to follow.

## 17. How to Update CHANGELOG.md
- Every change gets a dated entry: what changed, why, which files/modules affected, any migration needed.
- Use categories: Added / Changed / Fixed / Security / Deprecated.
- Never overwrite prior entries — append only, most recent on top.

## 18. How to Provide Environment Variables
- Any new required env variable must be added to ENVIRONMENT_VARIABLES.md with: name, purpose, example (masked) value, which environment (dev/staging/prod) it applies to.
- Never print real secret values in documentation or chat — placeholders only.

## 19. How to Provide Dependencies
- Any new library/package added must be justified (why existing tools aren't sufficient), and noted in PROJECT_DOCUMENTATION.md with version and purpose.
- Avoid adding heavy dependencies for trivial functionality.

## 20. How to Avoid Regenerating Existing Code
- Always assume existing code is intentional unless told otherwise.
- Never regenerate a whole file when a targeted patch/diff will do.
- Before generating anything, check whether equivalent functionality already exists in PROJECT_DOCUMENTATION.md/FOLDER_STRUCTURE.md — reuse/extend it instead of duplicating.

---

*These instructions are permanent and apply to all future prompts for this project.*
