"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";

export default function AnalyticsPage() {
  const { loading, profile } = useSessionContext();

  if (loading || !profile) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Analytics | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Click analytics already persist to Supabase; the reporting layer is the next step."
        title="Analytics"
      >
        <section className="app-card">
          <p className="app-topbar__eyebrow">Planned reporting</p>
          <h2>Metrics to build next</h2>
          <ul className="feature-list">
            <li>Unique clicks versus total clicks</li>
            <li>Top referrers and source hosts</li>
            <li>Daily trend charts</li>
            <li>Bot filtering and abuse flags</li>
          </ul>
        </section>
      </AppShell>
    </>
  );
}
