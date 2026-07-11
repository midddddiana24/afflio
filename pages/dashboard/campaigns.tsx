"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { CampaignComposer } from "@/components/CampaignComposer";
import { useSessionContext } from "@/lib/use-session-context";

export default function CampaignsPage() {
  const { loading, profile, error } = useSessionContext();

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Campaign loading error</p>
            <h2>Unable to load campaigns</h2>
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
        <title>Campaigns | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Create campaigns through a validated API route backed by Supabase Storage and authenticated inserts."
        title="Campaign management"
      >
        <CampaignComposer profile={profile} />
      </AppShell>
    </>
  );
}
