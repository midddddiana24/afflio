# AFFLIO Backend Blueprint

## 1. Product framing

Based on the live `kliklk.com` marketing flow, the core product is:

1. User uploads an image.
2. User adds a destination affiliate URL.
3. System generates a public campaign URL.
4. Social crawlers read Open Graph metadata from that URL.
5. Human visitors click the public URL, the system logs the click, then redirects to the affiliate destination.
6. User views analytics and manages campaigns.
7. Admin manages users, subscriptions, payments, abuse, and support.

That is the right product direction for `AFFLIO`. The backend risk is not the landing page. The backend risk is the public redirect layer, payment state, storage security, and anti-abuse controls.

## 2. Recommended stack

Keep the stack you already started. Do not split this into a separate frontend and backend unless you actually hit scale limits.

### App layer

- `Next.js App Router`
- `TypeScript`
- `Vercel` for deployment
- `Route Handlers` and `Server Actions` for trusted server-side mutations

Why:

- Your product needs SSR for per-campaign Open Graph tags.
- Vercel fits the public redirect route, dashboard SSR, and webhook endpoints well.
- Keeping client, admin, and public campaign routes in one codebase reduces auth and data duplication.

### Backend/data layer

- `Supabase Postgres`
- `Supabase Auth`
- `Supabase Storage`
- `Supabase Row Level Security`
- `Supabase Realtime` only if you want live dashboard counters later

Why:

- Your product is CRUD-heavy, auth-heavy, and analytics-light in the first version.
- Supabase gives you auth, database, storage, and RLS in one system.
- It is a strong fit for a fast SaaS MVP with an admin console.

### Validation/security layer

- `zod` for request validation
- `nanoid` for campaign slugs
- `Arcjet` or `Upstash Redis` rate limiting on public routes
- `sharp` for image validation, resizing, and OG-safe outputs

### Payments

Use a real payment gateway, not manual verification, if you want a subscription SaaS.

Recommended rollout:

1. `Phase 1`: local launch in PH with gateway-backed one-time and recurring billing
2. `Phase 2`: global billing after the product proves retention

Practical options:

- `PayMongo` or `Xendit` if your first paying users are in the Philippines and you want local payment methods.
- `Stripe Billing` if you later want stronger global subscription tooling.

Do not design billing around manual GCash review unless this is only a temporary bootstrap flow.

## 3. Recommended product model

Do not copy `kliklk.com` exactly.

`kliklk.com` appears to use a token mechanic. For `AFFLIO`, a better SaaS model is:

- `Free`: limited campaigns and clicks
- `Pro`: monthly subscription with included campaign credits
- `Agency`: higher limits, team seats, priority support
- `Overages or add-on credits`: optional if users exceed plan quotas

This is better than pure tokens because:

- recurring revenue is easier to forecast,
- users understand plans faster than token wallets,
- you can still keep credits internally for metering expensive actions.

Recommended internal model:

- subscription controls feature access and quotas
- credit ledger controls billable actions such as campaign generation, image processing, or premium analytics

## 4. Architecture

### Public side

Routes:

- `/` marketing site
- `/pricing`
- `/login`
- `/signup`
- `/c/[slug]` public campaign route

Flow:

1. crawler or user hits `/c/[slug]`
2. server resolves active campaign by slug
3. server returns campaign-specific OG metadata
4. if request is from a real visitor, server logs event and redirects

### Client dashboard

Routes:

- `/dashboard`
- `/dashboard/campaigns`
- `/dashboard/campaigns/new`
- `/dashboard/campaigns/[id]`
- `/dashboard/analytics`
- `/dashboard/billing`
- `/dashboard/settings`

Core actions:

- create campaign
- upload image
- edit OG title/caption
- set affiliate destination URL
- pause/archive campaign
- view clicks and top sources
- manage subscription and invoices

### Admin panel

Routes:

- `/admin`
- `/admin/users`
- `/admin/campaigns`
- `/admin/payments`
- `/admin/subscriptions`
- `/admin/flags`
- `/admin/audit-logs`

Core actions:

- suspend abusive users
- review reported destinations
- inspect payment failures/webhooks
- adjust user entitlements
- manage plans
- audit admin actions

## 5. Database design

Your current schema is a solid starter, but it is still MVP-level. Expand it before building the dashboard.

### Keep

- `profiles`
- `campaigns`
- `clicks`
- `token_transactions`
- `payments`

### Add

#### `plans`

Defines commercial plans.

Suggested fields:

- `id`
- `code`
- `name`
- `monthly_price`
- `yearly_price`
- `campaign_limit`
- `monthly_click_limit`
- `included_credits`
- `is_active`

#### `subscriptions`

Tracks customer billing state from your gateway.

Suggested fields:

- `id`
- `user_id`
- `plan_id`
- `provider`
- `provider_customer_id`
- `provider_subscription_id`
- `status`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`

#### `campaign_assets`

Separate uploaded assets from campaigns so users can reuse images and you can track image processing versions.

Suggested fields:

- `id`
- `user_id`
- `original_path`
- `optimized_path`
- `mime_type`
- `width`
- `height`
- `file_size_bytes`
- `created_at`

#### `campaign_click_events`

Your current `clicks` table is fine for MVP. Rename or evolve it if you later need richer analytics.

Suggested additional fields:

- `ip_hash`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `referer_host`
- `bot_score`
- `is_unique`

Do not store raw IP long-term if you can avoid it. Hash or truncate it.

#### `webhook_events`

Stores payment gateway webhooks for idempotency and troubleshooting.

Suggested fields:

- `id`
- `provider`
- `event_type`
- `provider_event_id`
- `payload`
- `processed_at`
- `status`

#### `admin_audit_logs`

Required if you are the admin and will modify accounts, credits, or billing manually.

Suggested fields:

- `id`
- `admin_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before_json`
- `after_json`
- `created_at`

#### `abuse_reports`

For flagged destinations, phishing, malware, or banned affiliate links.

Suggested fields:

- `id`
- `campaign_id`
- `reported_by`
- `reason`
- `status`
- `reviewed_by`
- `reviewed_at`

## 6. Security rules

This part matters more than visual polish.

### Auth

- Use Supabase Auth for signup/signin/password reset.
- Require email verification before campaign publishing.
- Require MFA for admin accounts.

### Authorization

- Keep RLS on every business table.
- Never trust client-submitted `user_id`, `role`, `token_balance`, or payment status.
- All billing changes must happen in trusted server code or webhook handlers.

### Redirect safety

This is mandatory for your product:

- validate `destination_url`
- block dangerous protocols such as `javascript:`
- allow only `http` and `https`
- store parsed hostname
- optionally block known bad domains

### Upload safety

- restrict mime types
- restrict file size
- re-encode images server-side
- strip metadata when possible
- generate safe optimized outputs for OG previews

### Abuse prevention

- rate limit `/c/[slug]`
- rate limit signup, login, and image upload routes
- record suspicious click bursts
- mark likely bot traffic
- auto-pause clearly abusive campaigns

### Secrets

- never expose `SUPABASE_SERVICE_ROLE_KEY` to client code
- keep gateway webhook secrets only in Vercel env vars
- use separate env vars for local, preview, and production

## 7. Payment design

If you want subscription revenue, your source of truth must be webhook-driven billing state.

### Recommended billing flow

1. user selects plan
2. server creates checkout session or payment intent
3. gateway completes payment
4. gateway sends webhook
5. webhook handler verifies signature
6. backend updates `subscriptions`, `payments`, and entitlement state
7. dashboard reflects active plan

### Do not do this

- do not unlock paid features from the frontend callback alone
- do not trust query-string payment status
- do not let admins manually edit balances without audit logs

### Subscription strategy

Use subscriptions for access, not only wallet balances.

Examples:

- active subscription => can publish up to plan limit
- expired subscription => published campaigns remain paused or view-limited based on policy
- add-on credits => allow extra campaign generations or premium usage beyond plan quota

## 8. Backend build order

Build in this order.

### Phase 1: auth and access

- signup/login/logout
- profile bootstrap
- protected dashboard routes
- admin route guard

### Phase 2: campaign publishing

- image upload endpoint
- image optimization pipeline
- campaign create/update/archive
- slug generation with collision check
- public `/c/[slug]` resolution and redirect

### Phase 3: analytics

- click event logging
- deduped unique clicks
- dashboard metrics
- basic filtering by date/platform

### Phase 4: billing

- plans
- subscriptions
- payment webhooks
- billing UI
- entitlement enforcement

### Phase 5: admin tooling

- user management
- campaign review
- abuse controls
- audit logs
- payment incident inspection

## 9. Gaps in the current starter

Your current repo already points in the right direction, but these gaps should be addressed next:

1. The redirect route currently logs clicks without awaiting or queueing them. That is acceptable for a stub, but the production version needs a more reliable event write strategy.
2. `campaigns.destination_url` is not yet protected by strict URL validation.
3. Storage upload rules need a server-side upload path, not only bucket policies.
4. The schema has token mechanics but not true subscription tables yet.
5. There is no webhook event table or billing state sync yet.
6. Admin actions need audit logging before payment or balance changes are introduced.
7. Click analytics need bot filtering and uniqueness rules, otherwise numbers will be noisy and easy to abuse.

## 10. Final recommendation

For `AFFLIO`, the best stack is:

- `Next.js` on `Vercel`
- `Supabase` for database, auth, storage, and RLS
- `PayMongo` or `Xendit` first if PH-local payments matter most
- `Stripe Billing` later if you expand globally

Do not rebuild from scratch. Your current repo is already the correct foundation.

The next coding milestone should be:

1. auth flows
2. protected dashboard shell
3. campaign create flow with validated image upload
4. production-safe `/c/[slug]` route
5. subscription tables and webhook handlers
