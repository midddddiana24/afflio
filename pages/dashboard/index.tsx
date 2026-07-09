"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useSessionContext } from "@/lib/use-session-context";

type Summary = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalClicks: number;
  recentCampaigns: Array<{
    id: string;
    slug: string;
    title: string | null;
    status: string;
    created_at: string;
  }>;
};

export default function DashboardHomePage() {
  const { loading, profile } = useSessionContext();
  const [summary, setSummary] = useState<Summary>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalClicks: 0,
    recentCampaigns: [],
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supabase = createClient();

    async function load() {
      const [
        campaignsResult,
        activeResult,
        clicksResult,
        recentResult,
      ] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("clicks").select("*", { count: "exact", head: true }),
        supabase
          .from("campaigns")
          .select("id, slug, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setSummary({
        totalCampaigns: campaignsResult.count ?? 0,
        activeCampaigns: activeResult.count ?? 0,
        totalClicks: clicksResult.count ?? 0,
        recentCampaigns: recentResult.data ?? [],
      });
    }

    load();
  }, [profile]);

  if (loading || !profile) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Protected overview wired to Supabase Auth, profiles, campaigns, and click analytics."
        title="Workspace overview"
      >
        <section className="app-grid app-grid--stats">
          <article className="app-card stat-card">
            <p className="stat-card__label">Total campaigns</p>
            <strong>{summary.totalCampaigns}</strong>
          </article>
          <article className="app-card stat-card">
            <p className="stat-card__label">Active campaigns</p>
            <strong>{summary.activeCampaigns}</strong>
          </article>
          <article className="app-card stat-card">
            <p className="stat-card__label">Tracked clicks</p>
            <strong>{summary.totalClicks}</strong>
          </article>
        </section>

        <section className="app-grid app-grid--two">
          <article className="app-card">
            <div className="section-head">
              <div>
                <p className="app-topbar__eyebrow">Recent campaigns</p>
                <h2>Latest cards</h2>
              </div>
              <Link className="btn btn-outline" href="/dashboard/campaigns">
                Open campaigns
              </Link>
            </div>

            <div className="data-list">
              {summary.recentCampaigns.length ? (
                summary.recentCampaigns.map((campaign) => (
                  <div className="data-list__row" key={campaign.id}>
                    <div>
                      <strong>{campaign.title || "Untitled campaign"}</strong>
                      <p className="muted">/c/{campaign.slug}</p>
                    </div>
                    <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
                  </div>
                ))
              ) : (
                <p className="muted">No campaigns yet. The next backend step is the secure create flow.</p>
              )}
            </div>
          </article>

          <article className="app-card">
            <p className="app-topbar__eyebrow">Backend progress</p>
            <h2>What is ready now</h2>
            <ul className="feature-list">
              <li>Supabase Auth login and signup flow</li>
              <li>Protected client dashboard routes</li>
              <li>Admin-aware navigation</li>
              <li>Database-backed overview metrics</li>
            </ul>
          </article>
        </section>
      </AppShell>
    </>
  );
}
