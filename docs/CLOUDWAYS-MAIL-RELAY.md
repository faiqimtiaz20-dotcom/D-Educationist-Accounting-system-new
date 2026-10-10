# Cloudways mail relay

When the Nest API host (e.g. Railway) blocks outbound SMTP, CRM Admin can switch platform delivery to the **Cloudways Mail API** (`cloudways-mail-api/`).

## Behaviour

| CRM mode | Path |
|----------|------|
| `direct` (default) | Nest `nodemailer` → tenant SMTP/OAuth |
| `cloudways` | Nest HTTPS → Cloudways PHP → tenant SMTP/OAuth |

Tenant **Settings → Email** is unchanged. Only the send hop changes.

## Setup

1. Deploy `cloudways-mail-api/` on Cloudways (see that folder’s README).
2. Set Nest env (optional if CRM UI stores URL/key):

```bash
CLOUDWAYS_MAIL_URL=https://your-mail-app.example/api/v1/send
CLOUDWAYS_MAIL_API_KEY=same-as-php-API_KEY
```

3. Run migration: `npx prisma migrate deploy` (adds `platform_settings`).
4. Login as CRM Admin → **Email delivery** → mode **Cloudways** → Save → Ping.

## APIs

- `GET /api/v1/crm/mail-delivery`
- `PUT /api/v1/crm/mail-delivery` — `{ mode, url?, apiKey? }`
- `POST /api/v1/crm/mail-delivery/ping`
- `POST /api/v1/crm/mail-delivery/test` — `{ to }` (uses Cloudways server SMTP env)
