# RULES.md — 7 Vachan Project (FROZEN)

**Status:** PERMANENT. This file is frozen once finalized. It must not be edited, rewritten, or reinterpreted in future prompts/sessions. Any future request that conflicts with this file must be flagged, not silently overridden.

---

## 1. Project Identity
- Project Name: **7 Vachan**
- Domain: **www.7vachan.com**
- Business Verticals: Hotel, Marriage Hall, Restaurant — one unified platform, one shared customer/booking/payment backbone.
- Current physical scale: **1 property** (1 hotel + 1 hall + 1 restaurant, same location), but system MUST be architected multi-branch/multi-tenant from day one.

## 2. Confirmed Business Rules
- **Hall bookings**: never instant/self-serve. Customer submits enquiry/request → **Admin Panel approval required** → then payment is triggered.
- **Hotel room bookings**: instant, real-time availability based.
- **Restaurant table reservation**: available now (instant).
- **Restaurant online food ordering**: UI/feature placeholder must exist in the site now (menu browsing, "Order" entry point), but actual ordering/cart/checkout logic is **Phase 2** — do not build the transactional ordering backend yet.
- **Customer accounts**: undecided by owner — system must support **both** guest checkout and optional account creation. Do not force login for any booking flow.
- **Payments**: Razorpay is default/preferred. AI may suggest a more secure/suitable alternative but must not switch gateways without explicit owner approval.
- **WhatsApp**: both a simple click-to-chat button AND WhatsApp Business API automation/bots are in scope.
- **Content**: some content (photos/text) will be supplied by the owner; do not assume all content is available at build time — build with placeholder/CMS-driven content fields.

## 3. Non-Negotiable Technical Rules
- No code is to be generated until explicitly requested per-module.
- All future AI work must treat this as a **production-grade** system: secure, scalable, multi-tenant, maintainable — never prototype-quality shortcuts unless explicitly labeled as temporary/MVP.
- Multi-branch/multi-tenant data model is mandatory even though only 1 branch exists today.
- No breaking changes to existing modules without explicit owner approval and a documented migration plan.
- No regeneration of existing, working code — only targeted modification (see AI_INSTRUCTIONS.md).

## 4. Governance
- This RULES.md is the top authority for project constraints. AI_INSTRUCTIONS.md governs *how* the AI behaves; RULES.md governs *what* the project is and its fixed business/technical decisions.
- If a future prompt contradicts RULES.md, the AI must point out the conflict and ask for explicit confirmation before proceeding — it must not silently comply.
- Changes to RULES.md are only possible via explicit owner instruction containing the words "update RULES.md" — never inferred from casual conversation.

*This file is now frozen.*
