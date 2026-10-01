# PGPGS REST API v1 (for the mobile app)

Base URL: `https://<your-domain>/api/v1` (dev: `http://localhost:3000/api/v1`)

The mobile app and the website share the **same Neon Postgres database**. All
access from the mobile app goes through these JSON endpoints — never connect
the app directly to the database.

## Authentication

Members log in with the **same Member ID + password** they use on the website
digital-ID portal. Login returns an opaque bearer token (stored hashed in the
`member_sessions` table, 30-day expiry — the exact same sessions the website
uses, so revocation works identically).

```
POST /api/v1/auth/login
{ "memberId": "GS-0000", "password": "..." }

→ 200 { "token": "<opaque>", "tokenType": "Bearer", "expiresIn": 2592000, "member": { "memberId": "GS-0000" } }
→ 400 missing fields · 401 invalid credentials · 429 rate limited
```

Send the token on every protected request:

```
Authorization: Bearer <token>
```

`POST /api/v1/auth/logout` with the token revokes it (deletes the session).
Store the token in the platform's **secure storage** (iOS Keychain /
Android Keystore / `flutter_secure_storage`), never in plain preferences.

### Admin authentication (contributions management)

Admins (treasurers/officers) log in with the **dashboard email + password** —
the same `admin_users` credentials and lockout rules as the website:

```
POST /api/v1/auth/admin-login
{ "email": "admin@example.com", "password": "..." }

→ 200 { "token": "<opaque>", "tokenType": "Bearer", "expiresIn": 604800, "admin": { "email": "...", "name": "...", "role": "admin" } }
→ 400 missing fields · 401 invalid credentials or locked account · 429 rate limited
```

Send that token as `Authorization: Bearer <token>` on the `/contributions`
management endpoints below. Tokens are stored hashed in `admin_sessions`
(7-day expiry — the same sessions the website cookie uses, so revoking one
revokes both). `POST /api/v1/auth/admin-logout` revokes the bearer token (or
the cookie session for same-origin web calls). Same-origin browser calls may
omit the header entirely — the admin cookie is accepted as a fallback.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | — | Member login, returns bearer token |
| POST | `/auth/logout` | Bearer or cookie | Revoke the current member session |
| GET | `/auth/me` | Bearer or cookie | Digital-ID profile incl. QR code |
| POST | `/auth/admin-login` | — | Admin login, returns bearer token |
| POST | `/auth/admin-logout` | Bearer or cookie | Revoke the current admin session |
| GET | `/news?limit=10&offset=0` | — | Published news (summary list) |
| GET | `/news/{slug}` | — | Full single news post |
| GET | `/chapters` | — | Published chapters |
| GET | `/officers` | — | Current Roxas City officers |
| GET | `/members?q=&status=&chapter=&limit=&offset=` | Admin | Member directory, auto-scoped to the caller's chapter |
| GET | `/contributions?month&q=status&page&perPage` | Admin | Dues ledger page (search + filters) |
| POST | `/contributions` | Admin | Record/edit a payment or waive a bill |
| GET | `/contributions/summary?month` | Admin | Collection overview for a month |
| GET | `/contributions/settings` | Admin | Current dues amount + due day |
| PUT | `/contributions/settings` | Admin | Update dues amount + due day |
| POST | `/contributions/generate-bills` | Admin | Create missing bills for a month |
| GET | `/contributions/receipts?member&month` | Admin | Receipt + arrears for one member |
| GET | `/contributions/me?limit` | Member | The member's own dues ledger |
| GET | `/contributions/{id}` | Admin | Single contribution record |
| DELETE | `/contributions/{id}` | Admin | Delete a record (corrections only) |

### Members (admin)

The member directory, scoped automatically by the caller's role:

```
GET /api/v1/members?q=&status=&chapter=&limit=&offset=&includeNeophytes=true
Authorization: Bearer <admin token>

→ 200 { "members": [ { "id", "memberId", "fullName", "email", "status",
                      "chapter", "position", "dateElected",
                      "photoUrl", "hasPhoto" } ],
        "pagination": { "total", "limit", "offset", "returned", "hasMore" },
        "countsByStatus": { "Member": 6, "PGP-GS Roxas City Chapter Officer": 8 },
        "scope": { "role", "chapter", "locked" },
        "chapters": ["…"] }
→ 400 bad limit/offset · 401 · 403 chapter outside your scope · 429
```

**Chapter scoping** — `chapter_secretary` / `chapter_treasurer` are pinned to
their `assignedChapter`. Passing a different `?chapter=` returns **403** rather
than silently widening their view; omitting it returns their chapter.
Provincial roles (`provincial_secretary` / `provincial_treasurer`) and full
admins are unscoped — omit `?chapter=` for the whole province or pass one to
filter. `scope.locked` tells the client which mode is active.

Chapter matching strips the `Pi Gamma Phi Gamma Sigma` prefix and ignores case,
so `?chapter=Roxas City Capiz Chapter` also matches members stored as
`Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter`. Neophytes are excluded
unless `includeNeophytes=true`. `limit` defaults to 25, max 100.

### Notes

- **Errors** are always `{ "error": "human readable message" }` with a proper
  HTTP status (`400`, `401`, `404`, `429`, `500`, `503`).
- **Rate limiting**: `POST /auth/login` and `POST /auth/admin-login` allow
  **5 attempts per IP per 5 minutes** (`429` + `Retry-After` header beyond
  that). The limiter is in-memory (per server instance) — swap in a shared
  store (Redis/Upstash) if you deploy serverless/multi-instance.
- **Chat (Knyte)**: the mobile app can call `POST /api/chat` directly — it
  streams the answer as plain text (`text/plain`), so render tokens as they
  arrive. No auth needed.
- **CORS**: native mobile apps are not affected by CORS; nothing to configure.
- `GET /auth/me` payload matches the website's digital ID
  (`/api/member-id/me`): `memberId`, `fullName`, `status`, `chapter`,
  `dateOfBirth`, `placeOfBirth`, `address`, `dateSurvived`, `baptizedName`,
  `photoUrl`, `hasPhoto`, guardian + contact fields, and `qrCode` (data URL).

## Contributions (monthly dues)

All amounts sent in request bodies are **pesos** (e.g. `100` or `"1,200.50"`);
all amounts returned are **integer centavos** (`amountDueCents`,
`amountPaidCents`, …). `month` / `billingMonth` is always `YYYY-MM`.

**List the ledger** (admin) — filters mirror the dashboard:

```
GET /api/v1/contributions?month=2026-10&q=delacruz&status=unpaid&page=1&perPage=20

→ 200 { "month": "2026-10", "q": "delacruz", "status": "unpaid",
        "rows": [ { "id": "…", "memberPk": "…", "billingMonth": "2026-10",
                     "amountDueCents": 10000, "amountPaidCents": 0, "status": "unpaid",
                     "paymentMethod": null, "referenceNumber": null, "note": null,
                     "paidAt": null, "recordedBy": "…",
                     "memberId": "GS-0123", "firstName": "Juan", "middleInitial": null,
                     "lastName": "Dela Cruz" } ],
        "total": 1, "page": 1, "pages": 1, "perPage": 20, "ready": true }
→ 400 invalid month/status · 401 · 503 ledger unavailable (migration pending)
```

**Record a payment** (admin) — creates the bill if the member has none for
that month; re-recording edits it. Waivers clear the bill:

```
POST /api/v1/contributions
{ "memberPk": "<uuid>", "billingMonth": "2026-10", "amountPaid": 100,
  "paymentMethod": "gcash", "referenceNumber": "GC-1234", "note": "partial" }

POST /api/v1/contributions                          # waive instead of pay
{ "memberPk": "<uuid>", "billingMonth": "2026-10", "waived": true }

→ 200 { "success": "Payment of ₱100.00 recorded for October 2026 — fully paid.",
        "bill": { "memberPk": "…", "billingMonth": "2026-10",
                  "amountDueCents": 10000, "amountPaidCents": 10000, "status": "paid" } }
→ 400 missing/invalid fields · 401 · 404 member not found
```

`paymentMethod` ∈ `cash | gcash | maya | bank | other` (optional). Recording
the full amount marks the bill `paid` and stamps `paidAt`; anything less stays
`partial` so arrears carry forward.

**Summary / settings / bills** (admin):

```
GET  /api/v1/contributions/summary?month=2026-10
→ 200 { "month": "2026-10", "billed": 40, "paid": 30, "partial": 4,
        "unpaid": 5, "waived": 1, "collectedCents": 304000,
        "expectedCents": 400000, "rate": 76 }

GET  /api/v1/contributions/settings
→ 200 { "monthlyAmountCents": 10000, "dueDay": 15, "ready": true }

PUT  /api/v1/contributions/settings
{ "monthlyAmount": 150, "dueDay": 15 }
→ 200 { "success": "Monthly dues updated to ₱150.00, due every 15th of the month." }
→ 400 amount must be ₱0–₱100,000 · due day 1–28

POST /api/v1/contributions/generate-bills
{ "billingMonth": "2026-10" }                        # optional — defaults to current month
→ 200 { "success": "Generated 38 bills for October 2026.", "created": 38 }
```

**Receipts & single record** (admin):

```
GET    /api/v1/contributions/receipts?member=<uuid>&month=2026-10
→ 200 { "month": "…", "member": { "id", "memberId", "name", "chapter" },
        "bill": {…} | null, "bills": [...], "arrears": [...],
        "owedCents": 20000, "lifetimeCents": 900000 }
→ 400 bad member/month · 404 no such member · 503

GET    /api/v1/contributions/{id}
→ 200 { "contribution": { …, "member": { "memberId", "firstName", … } } } | 404

DELETE /api/v1/contributions/{id}
→ 200 { "success": "Contribution record deleted." } | 400 invalid id | 404 not found
```

**A member's own dues** (member token) — same data the website digital-ID
portal shows:

```
GET /api/v1/contributions/me?limit=12
→ 200 { "bills": [ { "billingMonth": "2026-10", "amountDueCents": 10000,
                      "amountPaidCents": 10000, "status": "paid",
                      "paymentMethod": "cash", "referenceNumber": null,
                      "paidAt": "2026-10-05T02:11:22.000Z", "recordedBy": "…" } ] }
→ 401
```

All admin endpoints share the implementation used by the dashboard
(`lib/contribution-service.ts`), so the API and the website can never drift:
writes revalidate the dashboard caches automatically.

## Smoke test

With the dev server running:

```
node scripts/api-v1-smoke-test.mjs [baseUrl]
```

Checks every endpoint end-to-end (creates a temporary session in the DB for
the auth checks and revokes it afterwards).

## Adding endpoints later

1. Create `app/api/v1/<resource>/route.ts` (`runtime = "nodejs"`).
2. Reuse queries from `lib/` (Drizzle) — one source of truth for web + API.
3. Protected endpoints: `const session = await getMemberSessionUserFromRequest(request)`.
4. Update this file.
