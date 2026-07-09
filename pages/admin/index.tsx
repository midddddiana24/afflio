"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useSessionContext } from "@/lib/use-session-context";

type AdminSummary = {
  users: number;
  campaigns: number;
  pendingPayments: number;
};

export default function AdminHomePage() {
  const { loading, profile } = useSessionContext({ requireAdmin: true });
  const [summary, setSummary] = useState<AdminSummary>({
    users: 0,
    campaigns: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      return;
    }

    const supabase = createClient();

    async function load() {
      const [usersResult, campaignsResult, paymentsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      setSummary({
        users: usersResult.count ?? 0,
        campaigns: campaignsResult.count ?? 0,
        pendingPayments: paymentsResult.count ?? 0,
      });
    }

    load();
  }, [profile]);

  if (loading || !profile || profile.role !== "admin") {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin | Afflio</title>
      </Head>
      <AppShell
        area="admin"
        profile={profile}
        subtitle="Role-gated admin overview backed by the `profiles.role = admin` policy."
        title="Control room"
      >
        <section className="app-grid app-grid--stats">
          <article className="app-card stat-card">
            <p className="stat-card__label">Users</p>
            <strong>{summary.users}</strong>
          </article>
          <article className="app-card stat-card">
            <p className="stat-card__label">Campaigns</p>
            <strong>{summary.campaigns}</strong>
          </article>
          <article className="app-card stat-card">
            <p className="stat-card__label">Pending payments</p>
            <strong>{summary.pendingPayments}</strong>
          </article>
        </section>

        <section className="app-card">
          <p className="app-topbar__eyebrow">Next admin work</p>
          <h2>Finish the real operations layer</h2>
          <ul className="feature-list">
            <li>Payment incident queue with webhook event history</li>
            <li>Manual entitlement changes with audit logs</li>
            <li>Campaign abuse flags and moderation actions</li>
            <li>Plan management and subscription visibility</li>
          </ul>
        </section>
      </AppShell>
    </>
  );
}
