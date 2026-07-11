"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";

export default function SettingsPage() {
  const { loading, profile, error } = useSessionContext();

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Settings loading error</p>
            <h2>Unable to load settings</h2>
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
        <title>Settings | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Account profile, password resets, team access, and API preferences can live here."
        title="Settings"
      >
        <section className="app-card">
          <p className="app-topbar__eyebrow">Current data</p>
          <h2>Profile record</h2>
          <div className="data-list">
            <div className="data-list__row">
              <span className="muted">Display name</span>
              <strong>{profile.display_name || "Not set"}</strong>
            </div>
            <div className="data-list__row">
              <span className="muted">Role</span>
              <strong>{profile.role}</strong>
            </div>
            <div className="data-list__row">
              <span className="muted">Credits</span>
              <strong>{profile.token_balance}</strong>
            </div>
          </div>
        </section>
      </AppShell>
    </>
  );
}
