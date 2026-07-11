"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  status: string;
  billing_interval: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
};

type PlanRecord = {
  id: string;
  code: string;
  name: string;
};

const statusOptions = [
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
];

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("");

  async function load() {
    const supabase = createClient();
    const [subscriptionsResult, profilesResult, plansResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, user_id, plan_id, provider, status, billing_interval, current_period_end, trial_ends_at, cancel_at_period_end")
        .order("current_period_end", { ascending: false, nullsFirst: false }),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("plans").select("id, code, name"),
    ]);

    setSubscriptions((subscriptionsResult.data ?? []) as SubscriptionRecord[]);
    setProfiles((profilesResult.data ?? []) as ProfileRecord[]);
    const plansData = (plansResult.data ?? []) as PlanRecord[];
    setPlans(plansData);
    if (!grantPlanId && plansData[0]) {
      setGrantPlanId(plansData[0].id);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return subscriptions;

    return subscriptions.filter((subscription) => {
      const user = profiles.find((item) => item.id === subscription.user_id)?.display_name || "";
      const plan = plans.find((item) => item.id === subscription.plan_id)?.name || "";
      return [subscription.provider, subscription.status, user, plan]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [plans, profiles, query, subscriptions]);

  const selected =
    filtered.find((subscription) => subscription.id === selectedId) || subscriptions[0] || null;

  async function saveSubscription(payload: Record<string, unknown>) {
    setBusy(true);

    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to update subscription.");
      return;
    }

    await load();
  }

  return (
    <AdminPageFrame
      title="Subscriptions"
      subtitle="Billing visibility, emergency entitlement overrides, and trial grants."
      heroTitle="Keep SaaS revenue visible and recoverable"
      heroDescription="Review active and failed subscription states, then manually adjust plans or grant emergency access without editing records in SQL."
      heroChips={[`${formatNumber(subscriptions.length)} subscriptions`, `${formatNumber(filtered.length)} visible`]}
    >
      {() => (
        <>
          <section className="admin-page-grid">
            <article className="app-card">
              <div className="admin-toolbar">
                <div>
                  <p className="app-topbar__eyebrow">Billing state</p>
                  <h2>Subscriptions</h2>
                </div>
                <input
                  className="input admin-toolbar__search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search user, plan, provider, or status"
                  value={query}
                />
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Provider</th>
                      <th>Ends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((subscription) => (
                      <tr
                        className={selected?.id === subscription.id ? "is-selected" : undefined}
                        key={subscription.id}
                        onClick={() => setSelectedId(subscription.id)}
                      >
                        <td>{profiles.find((item) => item.id === subscription.user_id)?.display_name || "User"}</td>
                        <td>{plans.find((item) => item.id === subscription.plan_id)?.name || "Plan"}</td>
                        <td>
                          <span className={toBadgeClass(subscription.status)}>
                            {subscription.status}
                          </span>
                        </td>
                        <td>{subscription.provider}</td>
                        <td>{formatDate(subscription.current_period_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="app-card admin-detail-card">
              {selected ? (
                <>
                  <div className="section-head">
                    <div>
                      <p className="app-topbar__eyebrow">Selected subscription</p>
                      <h2>{profiles.find((item) => item.id === selected.user_id)?.display_name || "User"}</h2>
                    </div>
                    <span className={toBadgeClass(selected.status)}>{selected.status}</span>
                  </div>

                  <label className="field">
                    <span>Plan</span>
                    <select
                      className="input"
                      defaultValue={selected.plan_id}
                      onChange={(event) =>
                        setSubscriptions((current) =>
                          current.map((item) =>
                            item.id === selected.id ? { ...item, plan_id: event.target.value } : item
                          )
                        )
                      }
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Status</span>
                    <select
                      className="input"
                      defaultValue={selected.status}
                      onChange={(event) =>
                        setSubscriptions((current) =>
                          current.map((item) =>
                            item.id === selected.id ? { ...item, status: event.target.value } : item
                          )
                        )
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="campaign-card__actions">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => {
                        const current = subscriptions.find((item) => item.id === selected.id);
                        if (!current) return;
                        saveSubscription({
                          subscriptionId: current.id,
                          planId: current.plan_id,
                          status: current.status,
                          billingInterval: current.billing_interval,
                          currentPeriodEnd: current.current_period_end,
                          trialEndsAt: current.trial_ends_at,
                          cancelAtPeriodEnd: current.cancel_at_period_end,
                        });
                      }}
                      type="button"
                    >
                      Save subscription
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state admin-empty-state">
                  <div className="empty-state__icon">S</div>
                  <h3>Select a subscription</h3>
                  <p>Manual plan changes and status edits will appear here.</p>
                </div>
              )}
            </aside>
          </section>

          <section className="app-card">
            <div className="section-head">
              <div>
                <p className="app-topbar__eyebrow">Emergency tool</p>
                <h2>Grant manual access</h2>
              </div>
            </div>

            <div className="admin-form-grid">
              <label className="field">
                <span>User</span>
                <select
                  className="input"
                  onChange={(event) => setGrantUserId(event.target.value)}
                  value={grantUserId}
                >
                  <option value="">Select user</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.display_name || profile.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Plan</span>
                <select
                  className="input"
                  onChange={(event) => setGrantPlanId(event.target.value)}
                  value={grantPlanId}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="btn"
                disabled={busy || !grantUserId || !grantPlanId}
                onClick={() =>
                  saveSubscription({
                    userId: grantUserId,
                    planId: grantPlanId,
                    status: "trialing",
                    billingInterval: "monthly",
                    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  })
                }
                type="button"
              >
                Grant 7-day trial
              </button>
            </div>
          </section>
        </>
      )}
    </AdminPageFrame>
  );
}
