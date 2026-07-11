"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

type AppShellProps = {
  area: "dashboard" | "admin";
  title: string;
  subtitle: string;
  profile: Profile | null;
  children: React.ReactNode;
};

const dashboardLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/webhooks", label: "Webhooks" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/dashboard", label: "Client view" },
];

export function AppShell({ area, title, subtitle, profile, children }: AppShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const links = area === "admin" ? adminLinks : dashboardLinks;
  const displayName = profile?.display_name || "Afflio user";
  const activeLabel = links.find((link) => router.pathname === link.href)?.label || title;

  async function handleLogout() {
    const supabase = createClient();
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-wrap">
            <Link className="wordmark" href={area === "admin" ? "/admin" : "/dashboard"}>
              AFFLIO
            </Link>
            <span className="app-sidebar__area">
              {area === "admin" ? "Admin" : "Workspace"}
            </span>
          </div>
          <p className="muted">
            {area === "admin"
              ? "Control subscriptions, users, and operations."
              : "Manage campaign cards, sharing, and performance."}
          </p>
        </div>

        <nav className="app-nav" aria-label="Sidebar">
          {links.map((link) => {
            const active = router.pathname === link.href;
            return (
              <Link
                className={`app-nav__link${active ? " is-active" : ""}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
          {area === "dashboard" && profile?.role === "admin" ? (
            <Link className="app-nav__link" href="/admin">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="app-sidebar__footer">
          {area === "dashboard" && profile && profile.token_balance <= 5 ? (
            <div className="upgrade-nudge">
              <span className="upgrade-nudge__label">Running low</span>
              <p>
                {profile.token_balance} credit{profile.token_balance === 1 ? "" : "s"} left — each
                new campaign card uses one.
              </p>
              <div className="token-meter">
                <div
                  className="token-meter__fill"
                  data-tone={profile.token_balance <= 2 ? "low" : undefined}
                  style={{ width: `${Math.min(100, (profile.token_balance / 5) * 100)}%` }}
                />
              </div>
              <Link href="/dashboard/billing">Top up credits &rarr;</Link>
            </div>
          ) : null}

          <div className="app-sidebar__identity">
            <p className="app-sidebar__name">{displayName}</p>
            <p className="muted">
              {profile?.role === "admin" ? "Administrator" : "Client account"}
            </p>
          </div>
          <button
            className="btn btn-outline app-logout"
            onClick={handleLogout}
            type="button"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__copy">
            <p className="app-topbar__eyebrow">
              {area === "admin" ? "Admin panel" : "Dashboard"}
            </p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <div className="app-topbar__meta">
            <div className="app-topbar__pill">
              <span>Section</span>
              <strong>{activeLabel}</strong>
            </div>
            <div className="app-topbar__pill">
              <span>Credits</span>
              <strong>{profile?.token_balance ?? 0}</strong>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
