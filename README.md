# CCI Wishlist

Modern Next.js app for the CCI DMV building move wish list. Public visitors can browse items, confirm purchases, or contribute funds. Admins manage items via a one-time code emailed to approved addresses.

## Features
- Public landing with live progress and filters.
- Item detail pages with confirmation and contribution flows.
- Rate-limited submissions and email notifications for confirmations/contributions.
- Admin dashboard to create, update, delete items, and review confirmations/contributions.
- Email-based admin access (no user accounts or passwords).

## Stack
- Next.js 14 (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS + Radix UI + Lucide Icons
- Resend for transactional email

## Getting Started
1) Install dependencies:
```bash
npm install
```
2) Configure environment (`env.example` -> `.env`):
- `DATABASE_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`
- Optional: `DISABLE_EMAIL_NOTIFICATIONS=true` to skip sending emails locally.
3) Set up the database:
```bash
npm run db:generate
npm run db:push
npm run db:dmv-seed   # seed sample wishlist items
```
4) Run the app:
```bash
npm run dev
```

## Data Model
- `WishlistItem`: title, description, category, priceCents, quantityNeeded, priority, isActive, allowContributions, imageUrl, purchaseUrl.
- `WishlistConfirmation`: quantity, donor info, note, ipHash, userAgent.
- `WishlistContribution`: amountCents, donor info, note, ipHash, userAgent.

## API Overview
- `GET /api/dmv/wishlist` — public list with progress totals.
- `POST /api/dmv/wishlist/:id/confirm` — record a purchase confirmation.
- `POST /api/dmv/wishlist/:id/contribute` — record a monetary contribution.
- `POST /api/admin/wishlist/access-code` — send a one-time admin code to allowed emails.
- `POST /api/admin/wishlist/verify-code` — exchange code for a short-lived access cookie.
- `GET | POST /api/admin/wishlist` — list or create items (admin only).
- `PUT | DELETE /api/admin/wishlist/[id]` — update or delete an item (admin only).
- `GET /api/admin/wishlist/[id]/confirmations` — view confirmations for an item (admin only).
- `GET /api/admin/wishlist/[id]/contributions` — view contributions for an item (admin only).

## Admin Access
- Allowed emails are configured in `src/lib/auth.ts` (`WISHLIST_ALLOWED_EMAILS`).
- Admins request a code via the admin page, check their email, and enter the code to receive a temporary access cookie.

## Useful Scripts
- `npm run db:dmv-seed` — seed sample wishlist items.
- `npm run db:dmv-unseed` — remove the sample items.
