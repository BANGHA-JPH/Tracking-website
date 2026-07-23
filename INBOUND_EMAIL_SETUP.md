# Inbound Email & Support Inbox Setup Guide

This guide explains how customer email replies to `support@ups-global-shipping.com` are received, parsed, threaded, and displayed live in the Admin Panel inbox.

---

## 1. How It Works (Architecture Overview)

```
[Customer Email Client] (Replies to notification email)
         │
         ▼
[MX Record / Inbound Mail Server] (Cloudflare Email Routing or Resend Inbound)
         │
         ▼
[POST Webhook Endpoint] -> https://www.ups-global-shipping.com/api/inbound-email
         │
         ├── 1. Verifies secret header (x-webhook-secret)
         ├── 2. Parses sender email, subject, clean body (strips quoted history)
         ├── 3. Performs Customer lookup & creates Message in DB
         ├── 4. Broadcasts WebSocket event (type: 'NEW_MESSAGE')
         ▼
[Admin Panel Inbox] -> Live updates, unread badge, threaded reply history
```

---

## 2. Inbound Webhook Configuration Steps

### Option A: Using Resend Inbound Webhook
1. Log into your [Resend Dashboard](https://resend.com).
2. Go to **Webhooks** -> **Create Webhook**.
3. Set **Endpoint URL**: `https://tracking-website-service.onrender.com/api/inbound-email` (or your custom domain URL `https://www.ups-global-shipping.com/api/inbound-email`).
4. Select Event: `email.received` or `inbound.email`.
5. Copy the Signing Secret / Webhook Secret.
6. In **Render Dashboard** -> **Environment**, add:
   - `INBOUND_WEBHOOK_SECRET`: `<your-secret-here>`

### Option B: Cloudflare Email Routing + Worker Forwarder
1. In [Cloudflare Dashboard](https://dash.cloudflare.com) for `ups-global-shipping.com`, go to **Email Routing**.
2. Create a catch-all or specific rule for `support@ups-global-shipping.com`.
3. Set action to **Send to Worker**.
4. Use a Cloudflare Worker script to POST the JSON payload to `https://www.ups-global-shipping.com/api/inbound-email` with header:
   ```http
   x-webhook-secret: <INBOUND_WEBHOOK_SECRET>
   ```

---

## 3. Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/inbound-email` | Webhook endpoint receiving inbound customer emails |
| `GET`  | `/api/messages` | Retrieves customer support message threads (optionally filtered by `?email=`) |
| `POST` | `/api/admin/messages/reply` | Sends an admin reply via Resend with `In-Reply-To` headers & updates thread |
| `PUT`  | `/api/messages/read` | Marks unread customer messages as read for a given email |

---

## 4. Admin Panel Messaging Features
- **Sidebar Tab**: New **Messages** tab with a real-time unread badge count.
- **Threaded History**: Visual timeline of customer inquiries and admin responses.
- **Quote Stripping**: Cleans quoted reply headers (`On ... wrote:`) for clean reading.
- **Real-Time WebSocket**: New messages push to the admin screen instantly without page refresh.
- **Direct Email Reply**: Replying from the admin panel emails the customer directly using Resend while linking email headers (`In-Reply-To`, `References`).
