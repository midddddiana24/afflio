"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSessionContext } from "@/lib/use-session-context";

type Referral = { id: string; friendName: string; status: string; referrer_reward: number; created_at: string };
type Transaction = { id: string; amount: number; type: string; created_at: string };
type ReferralData = { referralEnabled: boolean; currentPlan: string; referralCode: string | null; tokenBalance: number; referrals: Referral[]; transactions: Transaction[] };

export default function ReferralsPage() {
  const { loading: sessionLoading, profile, error: sessionError } = useSessionContext();
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetch("/api/referrals")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load referrals.");
        setData(payload);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, [profile]);

  const inviteUrl = data?.referralEnabled && data.referralCode && typeof window !== "undefined"
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(data.referralCode)}`
    : "";

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareInvite() {
    if (navigator.share) {
      await navigator.share({ title: "Join me on Afflio", text: "Create clickable affiliate campaigns with Afflio.", url: inviteUrl });
      return;
    }
    await copyInvite();
  }

  if (sessionLoading || !profile) {
    return <div className="app-main"><div className="skeleton-stats"><div className="skeleton" /><div className="skeleton" /></div></div>;
  }

  return (
    <>
      <Head><title>Refer friends | Afflio</title></Head>
      <AppShell area="dashboard" profile={{ ...profile, token_balance: data?.tokenBalance ?? profile.token_balance }} title="Refer friends" subtitle="Friend referrals are available on active paid and trial plans.">
        {(sessionError || error) ? <section className="app-card"><p className="auth-message auth-message-error">{sessionError || error}</p></section> : null}
        <section className="referral-hero app-card">
          <div>
            <p className="app-topbar__eyebrow">{data?.referralEnabled ? "Your invite link" : "Paid plan feature"}</p>
            <h2>{data?.referralEnabled ? "Give 5 credits. Get 5 credits." : "Upgrade to unlock friend referrals."}</h2>
            <p className="muted">{data?.referralEnabled ? "Your friend must sign up through this link and verify their email. Rewards are issued once per new account." : "Activate any paid or trial plan to generate your personal referral link and earn campaign credits from verified friends."}</p>
          </div>
          <div className="referral-link-box">
            <code>{data?.referralEnabled ? inviteUrl || "Loading invite link..." : "Referral link locked on Free"}</code>
            <div className="campaign-card__actions">
              {data?.referralEnabled ? <><button className="btn btn-fill" disabled={!inviteUrl} onClick={copyInvite} type="button">{copied ? "Copied" : "Copy link"}</button><button className="btn btn-outline" disabled={!inviteUrl} onClick={shareInvite} type="button">Share</button></> : <Link className="btn btn-fill" href="/dashboard/billing">View upgrade plans</Link>}
            </div>
          </div>
        </section>

        <section className="app-grid app-grid--stats">
          <article className="stat-card"><p className="stat-card__label">Available credits</p><strong>{data?.tokenBalance ?? profile.token_balance}</strong></article>
          <article className="stat-card"><p className="stat-card__label">Friends invited</p><strong>{data?.referrals.length ?? 0}</strong></article>
          <article className="stat-card"><p className="stat-card__label">Rewards earned</p><strong>{data?.referrals.filter((item) => item.status === "rewarded").reduce((sum, item) => sum + item.referrer_reward, 0) ?? 0}</strong></article>
        </section>

        <section className="app-grid app-grid--two">
          <article className="app-card"><div className="section-head"><div><p className="app-topbar__eyebrow">Friend status</p><h2>Your referrals</h2></div></div><div className="data-list">{data?.referrals.length ? data.referrals.map((item) => <div className="data-list__row" key={item.id}><div><strong>{item.friendName}</strong><p className="muted">Joined {new Date(item.created_at).toLocaleDateString()}</p></div><span className={`status-badge status-badge--${item.status === "rewarded" ? "active" : "pending"}`}>{item.status}</span></div>) : <p className="muted">No friends invited yet. Share your personal link to begin.</p>}</div></article>
          <article className="app-card"><div className="section-head"><div><p className="app-topbar__eyebrow">Credit ledger</p><h2>Recent activity</h2></div></div><div className="data-list">{data?.transactions.map((item) => <div className="data-list__row" key={item.id}><div><strong>{formatTransaction(item.type)}</strong><p className="muted">{new Date(item.created_at).toLocaleDateString()}</p></div><strong className={item.amount > 0 ? "credit-positive" : ""}>{item.amount > 0 ? "+" : ""}{item.amount}</strong></div>)}</div></article>
        </section>
      </AppShell>
    </>
  );
}

function formatTransaction(type: string) {
  return ({ starter_bonus: "Starter credits", referral_bonus: "Referral reward", campaign_spend: "Campaign created", purchase: "Credit purchase", admin_adjustment: "Admin adjustment", refund: "Credit refund" } as Record<string, string>)[type] || type.replaceAll("_", " ");
}
