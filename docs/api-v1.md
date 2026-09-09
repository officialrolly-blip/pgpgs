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

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | — | Login, returns bearer token |
| POST | `/auth/logout` | Bearer or cookie | Revoke the current session |
| GET | `/auth/me` | Bearer or cookie | Digital-ID profile incl. QR code |
| GET | `/news?limit=10&offset=0` | — | Published news (summary list) |
| GET | `/news/{slug}` | — | Full single news post |
| GET | `/chapters` | — | Published chapters |
| GET | `/officers` | — | Current Roxas City officers |

### Notes

- **Errors** are always `{ "error": "human readable message" }` with a proper
  HTTP status (`400`, `401`, `404`, `429`, `500`).
- **Rate limiting**: `POST /auth/login` allows **5 attempts per IP per 5
  minutes** (`429` + `Retry-After` header beyond that). The limiter is
  in-memory (per server instance) — swap in a shared store (Redis/Upstash) if
  you deploy serverless/multi-instance.
- **Chat (Knyte)**: the mobile app can call `POST /api/chat` directly — it
  streams the answer as plain text (`text/plain`), so render tokens as they
  arrive. No auth needed.
- **CORS**: native mobile apps are not affected by CORS; nothing to configure.
- `GET /auth/me` payload matches the website's digital ID
  (`/api/member-id/me`): `memberId`, `fullName`, `status`, `chapter`,
  `dateOfBirth`, `placeOfBirth`, `address`, `dateSurvived`, `baptizedName`,
  `photoUrl`, `hasPhoto`, guardian + contact fields, and `qrCode` (data URL).

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
