"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";

export default function SettingsPage() {
  const { loading, profile } = useSessionContext();

  if (loading || !profile) {
    return null;
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
