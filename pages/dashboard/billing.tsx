"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useSessionContext } from "@/lib/use-session-context";

type Plan = {
  id: string; code: string; name: string; description: string | null;
  monthly_price_php: number; campaign_limit: number;
  monthly_click_limit: number; hotspot_limit: number;
};
type Subscription = {
  id: string; status: string; current_period_end: string | null;
  provider: string; plan: { name: string; code: string } | null;
};
type Payment = {
  id: string; amount_php: number; status: string; created_at: string;
  gcash_reference_number: string | null;
};

export default function BillingPage() {
  const { loading, profile, error } = useSessionContext();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("plans").select("id, code, name, description, monthly_price_php, campaign_limit, monthly_click_limit, hotspot_limit").eq("is_active", true).eq("is_public", true).order("monthly_price_php"),
      supabase.from("subscriptions").select("id, status, current_period_end, provider, plan:plans(name, code)").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payments").select("id, amount_php, status, created_at, gcash_reference_number").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20),
    ]).then(([planResult, subscriptionResult, paymentResult]) => {
      const loadError = planResult.error || subscriptionResult.error || paymentResult.error;
      if (loadError) setDataError(loadError.message);
      setPlans((planResult.data ?? []) as Plan[]);
      setSubscription(subscriptionResult.data as unknown as Subscription | null);
      setPayments((paymentResult.data ?? []) as Payment[]);
    });
  }, [profile]);

  if (error || dataError) return <div className="app-main"><section className="app-card"><h2>Unable to load billing</h2><p className="muted">{error || dataError}</p></section></div>;
  if (loading || !profile) return <div className="app-main"><div className="skeleton-stats"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></div>;

  const hasPaidAccess = Boolean(subscription && ["active", "trialing"].includes(subscription.status));
  const effectivePlan = hasPaidAccess ? subscription?.plan?.name || "Paid plan" : "Free";

  return <><Head><title>Billing | Afflio</title></Head><AppShell area="dashboard" profile={profile} subtitle="Your effective plan, limits, and manual payment history." title="Billing">
    <section className="app-grid app-grid--two">
      <article className="app-card"><p className="app-topbar__eyebrow">Current plan</p><h2>{effectivePlan}</h2><div className="data-list"><div className="data-list__row"><span className="muted">Status</span><span className={`badge badge--${hasPaidAccess ? "active" : "draft"}`}>{hasPaidAccess ? subscription?.status : "active free access"}</span></div><div className="data-list__row"><span className="muted">Provider</span><strong>{hasPaidAccess ? subscription?.provider : "Included automatically"}</strong></div><div className="data-list__row"><span className="muted">Ends</span><strong>{hasPaidAccess && subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "No expiration"}</strong></div></div></article>
      <article className="app-card"><p className="app-topbar__eyebrow">Manual upgrades</p><h2>Pay through GCash</h2><p className="muted">Contact the Afflio admin with your account email and payment reference. Your paid plan will be activated manually after verification.</p><Link className="btn btn-fill" href="/contact">Payment instructions</Link></article>
    </section>

    <section className="app-card"><div className="section-head"><div><p className="app-topbar__eyebrow">Plans</p><h2>Available capacity</h2></div></div><div className="billing-plan-grid">{plans.map((plan) => {
      const isFree = plan.code === "free";
      const isCurrent = isFree ? !hasPaidAccess : subscription?.plan?.code === plan.code && hasPaidAccess;
      return <article className="billing-plan" key={plan.id}><div><span className="badge badge--active">{plan.code}</span><h3>{plan.name}</h3><p className="muted">{plan.description}</p></div><strong className="billing-plan__price">{plan.monthly_price_php ? `PHP ${plan.monthly_price_php}/mo` : "Free"}</strong><ul><li>{plan.campaign_limit} campaigns</li><li>{plan.monthly_click_limit.toLocaleString()} monthly clicks</li><li>{plan.hotspot_limit} hotspots per campaign</li></ul>{isCurrent ? <span className="btn btn-outline" aria-current="true">Current plan</span> : <Link className="btn btn-outline" href="/contact">Request upgrade</Link>}</article>;
    })}</div></section>

    <section className="app-card"><div className="section-head"><div><p className="app-topbar__eyebrow">Payment history</p><h2>Transactions</h2></div></div>{payments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{new Date(payment.created_at).toLocaleDateString()}</td><td>PHP {payment.amount_php}</td><td>{payment.status}</td><td>{payment.gcash_reference_number || "-"}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No payments yet</h3><p>The Free plan works without a payment. Verified manual payments will appear here.</p></div>}</section>
  </AppShell></>;
}
