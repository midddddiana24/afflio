"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";
import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { loading, user, profile, error } = useSessionContext();
  const router = useRouter(); const [confirmation, setConfirmation] = useState(""); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState(""); const [notice, setNotice] = useState("");

  async function resendVerification() { if (!user?.email) return; setBusy(true); setNotice(""); await createClient().auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } }); setNotice("If verification is still required, a new email has been sent."); setBusy(false); }

  async function deleteAccount() {
    if (confirmation !== "DELETE" || !window.confirm("Permanently delete your Afflio account and campaigns?")) return;
    setBusy(true); setActionError("");
    const response = await fetch("/api/account/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setActionError(data.error || "Account deletion failed."); setBusy(false); return; }
    await createClient().auth.signOut(); router.replace("/?account=deleted");
  }

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
            <div className="data-list__row"><span className="muted">Email verification</span><strong>{user?.email_confirmed_at ? "Verified" : "Pending"}</strong></div>
          </div>
          {!user?.email_confirmed_at ? <button className="btn btn-outline" disabled={busy} onClick={resendVerification} type="button">Resend verification email</button> : null}{notice ? <p className="auth-message auth-message-success">{notice}</p> : null}
        </section>
        <section className="app-card danger-zone"><p className="app-topbar__eyebrow">Danger zone</p><h2>Delete account</h2><p className="muted">Permanently removes your campaigns, clicks, subscriptions, and uploaded campaign images. This cannot be undone.</p><label className="field"><span>Type DELETE to confirm</span><input onChange={(event) => setConfirmation(event.target.value)} value={confirmation} /></label>{actionError ? <p className="auth-message auth-message-error">{actionError}</p> : null}<button className="btn btn-danger" disabled={busy || confirmation !== "DELETE"} onClick={deleteAccount} type="button">{busy ? "Deleting..." : "Delete my account"}</button></section>
      </AppShell>
    </>
  );
}
