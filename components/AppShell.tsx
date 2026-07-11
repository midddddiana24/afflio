"use client";

import { useEffect, useState } from "react";
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

type AppNavLink = {
  href: string;
  label: string;
  icon: string;
  group?: "Manage" | "Revenue" | "System";
};

const dashboardLinks: AppNavLink[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: "campaign" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "analytics" },
  { href: "/dashboard/billing", label: "Billing", icon: "billing" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

const adminLinks: AppNavLink[] = [
  { href: "/admin", label: "Overview", icon: "home", group: "Manage" },
  { href: "/admin/users", label: "Users", icon: "users", group: "Manage" },
  { href: "/admin/campaigns", label: "Campaigns", icon: "campaign", group: "Manage" },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "billing", group: "Revenue" },
  { href: "/admin/plans", label: "Plans", icon: "plans", group: "Revenue" },
  { href: "/admin/webhooks", label: "Webhooks", icon: "webhook", group: "System" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics", group: "System" },
  { href: "/admin/flags", label: "Flags", icon: "flag", group: "System" },
  { href: "/admin/audit-logs", label: "Audit logs", icon: "audit", group: "System" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /></>,
    campaign: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m7 16 3.5-4 3 3 2-2 2.5 3" /></>,
    analytics: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    plans: <><path d="M6 3h12l3 5-9 13L3 8l3-5Z" /><path d="M3 8h18M9 3l-2 5 5 13 5-13-2-5" /></>,
    webhook: <><path d="M18 16.5a4 4 0 1 1-3.5-6" /><path d="M6 16.5a4 4 0 1 0 3.5-6" /><path d="M9 7a4 4 0 1 1 6 0l-3 5Z" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 5h11l-1 4 3 3H5" /></>,
    audit: <><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /><path d="M9 3h6v4H9zM9 13l2 2 5-5" /></>,
  };
  return <svg aria-hidden="true" className="app-nav__icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{paths[name]}</svg>;
}

export function AppShell({ area, title, subtitle, profile, children }: AppShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = area === "admin" ? adminLinks : dashboardLinks;
  const displayName = profile?.display_name || "Afflio user";
  const activeLabel = links.find((link) => router.pathname === link.href)?.label || title;

  useEffect(() => {
    setMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    document.body.classList.toggle("app-menu-open", menuOpen);
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("app-menu-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <button aria-label="Close navigation" className={`app-sidebar-overlay${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1} type="button" />
      <aside aria-label={`${area} navigation`} className={`app-sidebar${menuOpen ? " is-open" : ""}`} id="app-navigation">
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

        <nav className="app-nav" aria-label="Primary navigation">
          {links.map((link, index) => {
            const active = router.pathname === link.href;
            return (
              <div className="app-nav__item" key={link.href}>
                {area === "admin" && (index === 0 || link.group !== links[index - 1]?.group) ? <p className="app-nav__group">{link.group}</p> : null}
                <Link aria-current={active ? "page" : undefined} className={`app-nav__link${active ? " is-active" : ""}`} href={link.href}>
                  <NavIcon name={link.icon} /><span>{link.label}</span>
                </Link>
              </div>
            );
          })}
          {area === "dashboard" && profile?.role === "admin" ? (
            <Link className="app-nav__link" href="/admin">
              <NavIcon name="settings" /><span>Admin console</span>
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

      <main className="app-main" id="main-content">
        <div className="app-mobilebar">
          <button aria-controls="app-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"} className="app-menu-button" onClick={() => setMenuOpen((open) => !open)} type="button">
            <span /><span /><span />
          </button>
          <Link className="app-mobilebar__brand" href={area === "admin" ? "/admin" : "/dashboard"}>AFFLIO <span>{area === "admin" ? "Admin" : "Workspace"}</span></Link>
          <div className="app-mobilebar__avatar" aria-label={`${displayName}, ${profile?.token_balance ?? 0} credits`}>{displayName.charAt(0).toUpperCase()}</div>
        </div>
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
