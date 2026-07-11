"use client";

import { useEffect, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type PlanRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price_php: number;
  yearly_price_php: number | null;
  campaign_limit: number;
  monthly_click_limit: number;
  included_credits: number;
  team_seat_limit: number;
  is_active: boolean;
  is_public: boolean;
};

const blankPlan = {
  code: "",
  name: "",
  description: "",
  monthlyPricePhp: "0",
  yearlyPricePhp: "",
  campaignLimit: "0",
  monthlyClickLimit: "0",
  includedCredits: "0",
  teamSeatLimit: "1",
  isActive: true,
  isPublic: true,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPlan, setNewPlan] = useState(blankPlan);

  async function load() {
    const supabase = createClient();
    const result = await supabase.from("plans").select("*").order("monthly_price_php", { ascending: true });
    setPlans((result.data ?? []) as PlanRecord[]);
  }

  useEffect(() => {
    load();
  }, []);

  const selected = plans.find((plan) => plan.id === selectedId) || plans[0] || null;

  async function request(method: "POST" | "PATCH", payload: Record<string, unknown>) {
    setBusy(true);

    const response = await fetch("/api/admin/plans", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Plan action failed.");
      return;
    }

    if (method === "POST") {
      setNewPlan(blankPlan);
    }

    await load();
  }

  return (
    <AdminPageFrame
      title="Plans"
      subtitle="Pricing and entitlement control without hand-editing SQL."
      heroTitle="Adjust SaaS pricing and limits from the admin side"
      heroDescription="Use this page to edit limits, credits, and plan visibility before exposing changes to the public billing surface."
      heroChips={[`${formatNumber(plans.length)} plans`]}
    >
      {() => (
        <>
          <section className="admin-page-grid">
            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Catalog</p>
                  <h2>Plan manager</h2>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Monthly</th>
                      <th>Campaign limit</th>
                      <th>Click limit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr
                        className={selected?.id === plan.id ? "is-selected" : undefined}
                        key={plan.id}
                        onClick={() => setSelectedId(plan.id)}
                      >
                        <td>
                          <strong>{plan.name}</strong>
                          <span className="muted admin-cell-subtle">{plan.code}</span>
                        </td>
                        <td>{formatCurrency(plan.monthly_price_php)}</td>
                        <td>{formatNumber(plan.campaign_limit)}</td>
                        <td>{formatNumber(plan.monthly_click_limit)}</td>
                        <td>
                          <span className={toBadgeClass(plan.is_active ? "active" : "archived")}>
                            {plan.is_active ? "active" : "disabled"}
                          </span>
                        </td>
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
                      <p className="app-topbar__eyebrow">Edit plan</p>
                      <h2>{selected.name}</h2>
                    </div>
                    <span className={toBadgeClass(selected.is_public ? "public" : "archived")}>
                      {selected.is_public ? "public" : "private"}
                    </span>
                  </div>

                  <div className="data-list">
                    <div className="data-list__row">
                      <span className="muted">Monthly price</span>
                      <strong>{formatCurrency(selected.monthly_price_php)}</strong>
                    </div>
                    <div className="data-list__row">
                      <span className="muted">Included credits</span>
                      <strong>{formatNumber(selected.included_credits)}</strong>
                    </div>
                    <div className="data-list__row">
                      <span className="muted">Seats</span>
                      <strong>{formatNumber(selected.team_seat_limit)}</strong>
                    </div>
                  </div>

                  <div className="campaign-card__actions">
                    <button
                      className="btn btn-outline"
                      disabled={busy}
                      onClick={() =>
                        request("PATCH", {
                          planId: selected.id,
                          isActive: !selected.is_active,
                          isPublic: selected.is_public,
                          monthlyPricePhp: selected.monthly_price_php,
                          yearlyPricePhp: selected.yearly_price_php,
                          campaignLimit: selected.campaign_limit,
                          monthlyClickLimit: selected.monthly_click_limit,
                          includedCredits: selected.included_credits,
                          teamSeatLimit: selected.team_seat_limit,
                          name: selected.name,
                          description: selected.description,
                        })
                      }
                      type="button"
                    >
                      {selected.is_active ? "Disable plan" : "Enable plan"}
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        request("PATCH", {
                          planId: selected.id,
                          isActive: selected.is_active,
                          isPublic: !selected.is_public,
                          monthlyPricePhp: selected.monthly_price_php,
                          yearlyPricePhp: selected.yearly_price_php,
                          campaignLimit: selected.campaign_limit,
                          monthlyClickLimit: selected.monthly_click_limit,
                          includedCredits: selected.included_credits,
                          teamSeatLimit: selected.team_seat_limit,
                          name: selected.name,
                          description: selected.description,
                        })
                      }
                      type="button"
                    >
                      {selected.is_public ? "Hide from billing" : "Show publicly"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state admin-empty-state">
                  <div className="empty-state__icon">P</div>
                  <h3>Select a plan</h3>
                  <p>Plan visibility and limit controls will appear here.</p>
                </div>
              )}
            </aside>
          </section>

          <section className="app-card">
            <div className="section-head">
              <div>
                <p className="app-topbar__eyebrow">Create</p>
                <h2>New plan</h2>
              </div>
            </div>

            <div className="admin-form-grid admin-form-grid--three">
              <label className="field">
                <span>Code</span>
                <input
                  className="input"
                  onChange={(event) => setNewPlan((current) => ({ ...current, code: event.target.value }))}
                  value={newPlan.code}
                />
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  className="input"
                  onChange={(event) => setNewPlan((current) => ({ ...current, name: event.target.value }))}
                  value={newPlan.name}
                />
              </label>
              <label className="field">
                <span>Monthly PHP</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setNewPlan((current) => ({ ...current, monthlyPricePhp: event.target.value }))
                  }
                  value={newPlan.monthlyPricePhp}
                />
              </label>
              <label className="field">
                <span>Campaign limit</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setNewPlan((current) => ({ ...current, campaignLimit: event.target.value }))
                  }
                  value={newPlan.campaignLimit}
                />
              </label>
              <label className="field">
                <span>Monthly click limit</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setNewPlan((current) => ({ ...current, monthlyClickLimit: event.target.value }))
                  }
                  value={newPlan.monthlyClickLimit}
                />
              </label>
              <label className="field">
                <span>Included credits</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setNewPlan((current) => ({ ...current, includedCredits: event.target.value }))
                  }
                  value={newPlan.includedCredits}
                />
              </label>
            </div>

            <div className="campaign-card__actions">
              <button
                className="btn"
                disabled={busy || !newPlan.code || !newPlan.name}
                onClick={() =>
                  request("POST", {
                    code: newPlan.code,
                    name: newPlan.name,
                    description: newPlan.description,
                    monthlyPricePhp: newPlan.monthlyPricePhp,
                    yearlyPricePhp: newPlan.yearlyPricePhp,
                    campaignLimit: newPlan.campaignLimit,
                    monthlyClickLimit: newPlan.monthlyClickLimit,
                    includedCredits: newPlan.includedCredits,
                    teamSeatLimit: newPlan.teamSeatLimit,
                    isActive: newPlan.isActive,
                    isPublic: newPlan.isPublic,
                  })
                }
                type="button"
              >
                Create plan
              </button>
            </div>
          </section>
        </>
      )}
    </AdminPageFrame>
  );
}
