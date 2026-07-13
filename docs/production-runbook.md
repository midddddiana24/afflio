# Afflio production runbook

## Release gate

Do not enable paid checkout until every item below has an owner and a verified production result.

## Supabase

1. Apply migrations `0001` through `0006` in order.
2. Add the production site URL and `/auth/callback`, `/reset-password` URLs under Authentication URL Configuration.
3. Require email confirmation and configure a branded SMTP sender.
4. Verify Row Level Security remains enabled on every public table.
5. Enable daily backups or Point-in-Time Recovery for the selected Supabase plan.
6. Run a quarterly restore drill into a separate project and record duration and row-count checks.

## Payments

1. Complete PayMongo or Xendit business verification.
2. Create production products/prices matching the `plans` table.
3. Store provider secrets only in Vercel encrypted environment variables.
4. Register `https://<domain>/api/webhooks/<provider>` with the provider.
5. Reject unsigned or stale webhook requests before reading event data.
6. Insert the provider event ID into `webhook_events` before processing; the unique index provides idempotency.
7. Verify success, failed payment, renewal, cancellation, refund, and duplicate-event cases in the provider sandbox.

Checkout remains intentionally disabled until these steps and a real provider integration are complete.

## Queue and rate limiting

1. Provision one durable queue and one distributed rate-limit store through Vercel integrations.
2. Move click inserts behind the queue, retaining campaign/hotspot validation at ingestion and processing.
3. Use per-IP, per-user, and per-campaign keys with bounded expiry.
4. Define retry limits and a dead-letter path; alert when failures exceed the agreed threshold.

## Domain and social previews

1. Add the production domain in Vercel and apply the exact DNS records Vercel provides.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.
3. Update Supabase redirect URLs and payment webhook URLs.
4. Test one active campaign with Facebook Sharing Debugger and refresh its scrape cache.
5. Verify title, description, image, canonical URL, and a successful human click redirect.

## Monitoring

1. Provision an error-monitoring integration and set `SENTRY_DSN` or the selected provider variable.
2. Monitor `/api/health`; alert on non-200 responses and on false payment, queue, or monitoring checks.
3. Alert on webhook failures, click-queue dead letters, elevated 5xx rates, and auth callback errors.
4. Never include passwords, authorization headers, service-role keys, payment secrets, or raw IP addresses in logs.

## Automated release checks

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Install the browser once with `npx.cmd playwright install chromium`. Set the `E2E_*` variables for client and admin coverage. Run tests against a disposable Supabase test project, never production.

## Incident response

1. Disable affected checkout or campaign publishing without deleting evidence.
2. Rotate exposed secrets in the provider first, then Vercel.
3. Review admin audit logs and webhook event history.
4. Notify affected users when required by applicable law.
5. Document cause, timeline, impact, corrective action, and follow-up owner.
