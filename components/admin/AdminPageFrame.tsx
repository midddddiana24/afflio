"use client";

import Head from "next/head";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import type { Profile } from "@/lib/auth";
import { useSessionContext } from "@/lib/use-session-context";

type AdminPageFrameProps = {
  title: string;
  subtitle: string;
  heroTitle: string;
  heroDescription: string;
  heroChips?: string[];
  children: (profile: Profile) => ReactNode;
};

export function AdminPageFrame({
  title,
  subtitle,
  heroTitle,
  heroDescription,
  heroChips = [],
  children,
}: AdminPageFrameProps) {
  const { loading, profile, error } = useSessionContext({ requireAdmin: true });

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Admin loading error</p>
            <h2>Unable to load the admin session</h2>
            <p className="muted">{error}</p>
          </section>
        </div>
      </div>
    );
  }

  if (loading || !profile || profile.role !== "admin") {
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
        <title>{title} | Afflio Admin</title>
      </Head>
      <AppShell area="admin" profile={profile} subtitle={subtitle} title={title}>
        <section className="hero-panel hero-panel--compact admin-hero">
          <div className="hero-panel__copy">
            <p className="app-topbar__eyebrow">Operations center</p>
            <h2>{heroTitle}</h2>
            <p className="muted">{heroDescription}</p>
          </div>
          {heroChips.length ? (
            <div className="hero-panel__chips">
              {heroChips.map((chip) => (
                <span className="hero-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {children(profile)}
      </AppShell>
    </>
  );
}
