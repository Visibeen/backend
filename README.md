# backend

## WhatsApp Cloud API Integration

This backend exposes minimal WhatsApp Cloud API endpoints under ` /api/whatsapp `:

- `GET /api/whatsapp/webhook` — Webhook verification endpoint used by Meta when setting up the webhook. It expects the `hub.verify_token` to match `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/whatsapp/webhook` — Receives incoming WhatsApp messages/events from Meta and currently echoes a simple reply.
- `POST /api/whatsapp/send` — Server-initiated text message sender. Body: `{ "to": "+<E164 or WA ID>", "message": "Your text" }`.

### Environment Variables

Add the following to your `backend/.env` file:

```
WHATSAPP_ACCESS_TOKEN=EAAB...  # From Meta for Developers > WhatsApp > API Setup
WHATSAPP_PHONE_NUMBER_ID=123456789012345  # From Meta > WhatsApp > Phone numbers
WHATSAPP_VERIFY_TOKEN=your-secure-random-string  # You define this and also enter it during webhook setup
```

### Webhook URL to configure in Meta

When configuring the webhook in Meta (App Dashboard > WhatsApp > Configuration):

- Callback URL: `https://www.visibeen.com/api/whatsapp/webhook`
- Verify Token: must be exactly the same as `WHATSAPP_VERIFY_TOKEN` in your env.
- Subscribe to: messages, message template status, etc. as needed.

### Testing send endpoint

Request:

```
POST /api/whatsapp/send
Content-Type: application/json

{
  "to": "+15555555555",
  "message": "Hello from Visibeen!"
}
```

The server uses `https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` under the hood with your `WHATSAPP_ACCESS_TOKEN`.

### Notes

- Ensure your server is publicly reachable over HTTPS so Meta can reach ` /api/whatsapp/webhook `.
- If you want to verify signatures, enable `X-Hub-Signature-256` validation on the webhook route and keep your app secret available. This is optional and not required for basic operation.

