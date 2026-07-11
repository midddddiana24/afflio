"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type UserRecord = {
  id: string;
  display_name: string | null;
  role: "client" | "admin";
  token_balance: number;
  created_at: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
};

type CampaignSummary = {
  id: string;
  user_id: string;
  title: string | null;
  slug: string;
  status: string;
  created_at: string;
};

type SubscriptionSummary = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
};

type PaymentSummary = {
  id: string;
  user_id: string;
  amount_php: number;
  status: string;
  created_at: string | null;
};

type PlanRecord = {
  id: string;
  code: string;
  name: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [usersResult, campaignsResult, subscriptionsResult, paymentsResult, plansResult] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("id, user_id, title, slug, status, created_at"),
        supabase.from("subscriptions").select("id, user_id, plan_id, status, current_period_end"),
        supabase.from("payments").select("id, user_id, amount_php, status, created_at"),
        supabase.from("plans").select("id, code, name"),
      ]);

    setUsers((usersResult.data ?? []) as UserRecord[]);
    setCampaigns((campaignsResult.data ?? []) as CampaignSummary[]);
    setSubscriptions((subscriptionsResult.data ?? []) as SubscriptionSummary[]);
    setPayments((paymentsResult.data ?? []) as PaymentSummary[]);
    setPlans((plansResult.data ?? []) as PlanRecord[]);
  }

  useEffect(() => {
    load();
  }, []);

  const activePlanByUser = useMemo(() => {
    const map = new Map<string, string>();

    for (const subscription of subscriptions) {
      if (!["active", "trialing"].includes(subscription.status)) continue;
      if (map.has(subscription.user_id)) continue;

      const plan = plans.find((entry) => entry.id === subscription.plan_id);
      map.set(subscription.user_id, plan?.name || "Unknown");
    }

    return map;
  }, [plans, subscriptions]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const haystack = [
        user.display_name || "",
        user.id,
        user.role,
        activePlanByUser.get(user.id) || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [activePlanByUser, query, users]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) || users[0] || null;
  const selectedUserCampaigns = campaigns.filter((item) => item.user_id === selectedUser?.id);
  const selectedUserSubscriptions = subscriptions.filter((item) => item.user_id === selectedUser?.id);
  const selectedUserPayments = payments.filter((item) => item.user_id === selectedUser?.id);

  async function updateUser(input: {
    userId: string;
    role?: "client" | "admin";
    suspended?: boolean;
    suspensionReason?: string;
  }) {
    setBusyKey(input.userId);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    setBusyKey(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(payload?.error || "Failed to update user.");
      return;
    }

    await load();
  }

  return (
    <AdminPageFrame
      title="Users"
      subtitle="Account control, support context, and entitlement visibility for AFFLIO operators."
      heroTitle="Search accounts and act without leaving the admin workspace"
      heroDescription="Use this table to inspect plan state, control abusive accounts, and open the user context you need for support cases."
      heroChips={[`${formatNumber(users.length)} users`, `${formatNumber(filteredUsers.length)} visible`]}
    >
      {() => (
        <div className="admin-page-grid">
          <section className="app-card">
            <div className="admin-toolbar">
              <div>
                <p className="app-topbar__eyebrow">Directory</p>
                <h2>User management</h2>
              </div>
              <input
                className="input admin-toolbar__search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, role, user id, or plan"
                value={query}
              />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Role</th>
                    <th>Credits</th>
                    <th>Campaigns</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const campaignCount = campaigns.filter((item) => item.user_id === user.id).length;
                    const currentPlan = activePlanByUser.get(user.id) || "Free";
                    const suspended = Boolean(user.suspended_at);

                    return (
                      <tr
                        className={selectedUser?.id === user.id ? "is-selected" : undefined}
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <td>
                          <strong>{user.display_name || "Unnamed user"}</strong>
                          <span className="muted admin-cell-subtle">{user.id.slice(0, 8)}</span>
                        </td>
                        <td>{currentPlan}</td>
                        <td>
                          <span className={toBadgeClass(user.role)}>{user.role}</span>
                        </td>
                        <td>{formatNumber(user.token_balance)}</td>
                        <td>{formatNumber(campaignCount)}</td>
                        <td>
                          <span className={toBadgeClass(suspended ? "suspended" : "active")}>
                            {suspended ? "suspended" : "active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="app-card admin-detail-card">
            {selectedUser ? (
              <>
                <div className="section-head">
                  <div>
                    <p className="app-topbar__eyebrow">User detail</p>
                    <h2>{selectedUser.display_name || "Unnamed user"}</h2>
                  </div>
                  <span className={toBadgeClass(selectedUser.role)}>{selectedUser.role}</span>
                </div>

                <div className="data-list">
                  <div className="data-list__row">
                    <span className="muted">Created</span>
                    <strong>{formatDate(selectedUser.created_at)}</strong>
                  </div>
                  <div className="data-list__row">
                    <span className="muted">Credits</span>
                    <strong>{formatNumber(selectedUser.token_balance)}</strong>
                  </div>
                  <div className="data-list__row">
                    <span className="muted">Plan</span>
                    <strong>{activePlanByUser.get(selectedUser.id) || "Free"}</strong>
                  </div>
                </div>

                <div className="campaign-card__actions">
                  <button
                    className="btn btn-outline"
                    disabled={busyKey === selectedUser.id}
                    onClick={() =>
                      updateUser({
                        userId: selectedUser.id,
                        role: selectedUser.role === "admin" ? "client" : "admin",
                      })
                    }
                    type="button"
                  >
                    {selectedUser.role === "admin" ? "Demote admin" : "Promote admin"}
                  </button>
                  <button
                    className="btn"
                    disabled={busyKey === selectedUser.id}
                    onClick={() =>
                      updateUser({
                        userId: selectedUser.id,
                        suspended: !selectedUser.suspended_at,
                        suspensionReason: "Admin moderation",
                      })
                    }
                    type="button"
                  >
                    {selectedUser.suspended_at ? "Reactivate user" : "Suspend user"}
                  </button>
                </div>

                <div className="admin-inline-section">
                  <h3>Campaigns</h3>
                  <div className="admin-mini-list">
                    {selectedUserCampaigns.slice(0, 5).map((campaign) => (
                      <div className="admin-mini-list__item" key={campaign.id}>
                        <strong>{campaign.title || campaign.slug}</strong>
                        <span className={toBadgeClass(campaign.status)}>{campaign.status}</span>
                      </div>
                    ))}
                    {selectedUserCampaigns.length === 0 ? (
                      <p className="muted">No campaigns yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="admin-inline-section">
                  <h3>Billing history</h3>
                  <div className="admin-mini-list">
                    {selectedUserSubscriptions.slice(0, 4).map((subscription) => (
                      <div className="admin-mini-list__item" key={subscription.id}>
                        <strong>{plans.find((plan) => plan.id === subscription.plan_id)?.name || "Plan"}</strong>
                        <span className={toBadgeClass(subscription.status)}>{subscription.status}</span>
                      </div>
                    ))}
                    {selectedUserPayments.slice(0, 4).map((payment) => (
                      <div className="admin-mini-list__item" key={payment.id}>
                        <strong>{formatCurrency(payment.amount_php)}</strong>
                        <span className={toBadgeClass(payment.status)}>{payment.status}</span>
                      </div>
                    ))}
                    {selectedUserSubscriptions.length === 0 && selectedUserPayments.length === 0 ? (
                      <p className="muted">No billing events yet.</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state admin-empty-state">
                <div className="empty-state__icon">U</div>
                <h3>Select a user</h3>
                <p>Detailed campaigns and billing history will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </AdminPageFrame>
  );
}
