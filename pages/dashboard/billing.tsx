"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";

export default function BillingPage() {
  const { loading, profile, error } = useSessionContext();

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Billing loading error</p>
            <h2>Unable to load billing</h2>
            <p className="muted">{error}</p>
          </section>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <div className="skeleton-stats">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Billing | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Billing schema is now in place; the next step is wiring provider checkout, webhooks, and entitlement enforcement."
        title="Billing"
      >
        <section className="app-card">
          <p className="app-topbar__eyebrow">Phase A complete</p>
          <h2>Billing foundation is ready</h2>
          <p className="muted">
            Supabase now has `plans`, `subscriptions`, and `webhook_events`. The next backend task is connecting this page to PayMongo or Xendit checkout and processing webhook-driven subscription state.
          </p>
        </section>
      </AppShell>
    </>
  );
}
