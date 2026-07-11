"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/admin-ui";

type AdminSummary = {
  users: number;
  activeSubscriptions: number;
  platformClicks: number;
  uniqueClicks: number;
  openFlags: number;
  failedWebhooks: number;
};

type OverviewAlert = {
  id: string;
  label: string;
  meta: string;
  href: string;
};

const quickLinks = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Search users, change roles, suspend abusive accounts, and inspect support context.",
  },
  {
    href: "/admin/campaigns",
    title: "Campaigns",
    description: "Moderate published cards, inspect domains, and act on suspicious traffic patterns.",
  },
  {
    href: "/admin/subscriptions",
    title: "Subscriptions",
    description: "Review plan state, manual overrides, and payment-side entitlement incidents.",
  },
  {
    href: "/admin/webhooks",
    title: "Webhooks",
    description: "Monitor failed billing events and retry processing without touching SQL manually.",
  },
];

export default function AdminHomePage() {
  const [summary, setSummary] = useState<AdminSummary>({
    users: 0,
    activeSubscriptions: 0,
    platformClicks: 0,
    uniqueClicks: 0,
    openFlags: 0,
    failedWebhooks: 0,
  });
  const [alerts, setAlerts] = useState<OverviewAlert[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        profilesResult,
        subscriptionsResult,
        clicksResult,
        flagsResult,
        webhooksResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("clicks").select("id, is_unique"),
        supabase.from("abuse_reports").select("id, status"),
        supabase
          .from("webhook_events")
          .select("id, provider, event_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const subscriptions = (subscriptionsResult.data ?? []) as Array<{ status: string }>;
      const clicks = (clicksResult.data ?? []) as Array<{ is_unique: boolean }>;
      const flags = (flagsResult.data ?? []) as Array<{ status: string }>;
      const webhooks = (webhooksResult.data ?? []) as Array<{
        id: string;
        provider: string;
        event_type: string;
        status: string;
        created_at: string;
      }>;

      setSummary({
        users: profilesResult.data?.length ?? 0,
        activeSubscriptions: subscriptions.filter((item) =>
          ["active", "trialing"].includes(item.status)
        ).length,
        platformClicks: clicks.length,
        uniqueClicks: clicks.filter((item) => item.is_unique).length,
        openFlags: flags.filter((item) => ["open", "reviewing"].includes(item.status)).length,
        failedWebhooks: webhooks.filter((item) => item.status === "failed").length,
      });

      setAlerts([
        ...webhooks
          .filter((item) => item.status === "failed")
          .slice(0, 3)
          .map((item) => ({
            id: item.id,
            label: `${item.provider} webhook failed`,
            meta: item.event_type,
            href: "/admin/webhooks",
          })),
        ...flags
          .filter((item) => ["open", "reviewing"].includes(item.status))
          .slice(0, 3)
          .map((item, index) => ({
            id: `flag-${index}`,
            label: "Campaign flag waiting for review",
            meta: item.status,
            href: "/admin/flags",
          })),
      ]);
    }

    load();
  }, []);

  const heroChips = useMemo(
    () => [
      `${formatNumber(summary.users)} users`,
      `${formatNumber(summary.platformClicks)} clicks`,
      `${formatNumber(summary.failedWebhooks)} failed webhooks`,
    ],
    [summary]
  );

  return (
    <AdminPageFrame
      title="Control room"
      subtitle="AFFLIO admin is the operational layer for users, plans, campaigns, and billing incidents."
      heroTitle="Platform-wide visibility without jumping between SQL tables"
      heroDescription="This view prioritizes urgent operational signals first: account control, moderation, billing failures, and traffic quality."
      heroChips={heroChips}
    >
      {() => (
        <>
          <section className="app-grid app-grid--stats">
            <article className="stat-card">
              <p className="stat-card__label">Users</p>
              <strong>{formatNumber(summary.users)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Active subscriptions</p>
              <strong>{formatNumber(summary.activeSubscriptions)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Platform clicks</p>
              <strong>{formatNumber(summary.platformClicks)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Unique clicks</p>
              <strong>{formatNumber(summary.uniqueClicks)}</strong>
            </article>
          </section>

          <section className="admin-ops-grid">
            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Urgent queue</p>
                  <h2>Operational alerts</h2>
                </div>
                <span className="badge badge--paused">{formatNumber(alerts.length)} open</span>
              </div>
              <div className="admin-list">
                {alerts.length ? (
                  alerts.map((alert) => (
                    <Link className="admin-list__item" href={alert.href} key={alert.id}>
                      <strong>{alert.label}</strong>
                      <span className="muted">{alert.meta}</span>
                    </Link>
                  ))
                ) : (
                  <div className="empty-state admin-empty-state">
                    <div className="empty-state__icon">OK</div>
                    <h3>No urgent admin incidents</h3>
                    <p>Webhook failures and open abuse flags will surface here as they appear.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Fast navigation</p>
                  <h2>Core admin workspaces</h2>
                </div>
              </div>
              <div className="admin-quick-links">
                {quickLinks.map((link) => (
                  <Link className="admin-quick-link" href={link.href} key={link.href}>
                    <strong>{link.title}</strong>
                    <p className="muted">{link.description}</p>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </AdminPageFrame>
  );
}
