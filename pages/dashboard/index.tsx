"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useSessionContext } from "@/lib/use-session-context";

type CampaignSummary = {
  id: string;
  slug: string;
  title: string | null;
  image_path: string;
  status: string;
  totalClicks: number;
  uniqueClicks: number;
  publicUrl: string;
  imageUrl: string;
};

type Summary = {
  totalCampaigns: number;
  activeCampaigns: number;
  totalClicks: number;
  uniqueClicks: number;
  recentCampaigns: CampaignSummary[];
};

export default function DashboardHomePage() {
  const { loading, profile, error } = useSessionContext();
  const [summary, setSummary] = useState<Summary>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalClicks: 0,
    uniqueClicks: 0,
    recentCampaigns: [],
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    const supabase = createClient();
    const profileId = profile.id;

    async function load() {
      const [campaignsResult, activeResult, recentResult] = await Promise.all([
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("user_id", profileId),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profileId)
          .eq("status", "active"),
        supabase
          .from("campaigns")
          .select("id, slug, title, image_path, status")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const campaignIds = (recentResult.data ?? []).map((campaign) => campaign.id);
      let clickRows: Array<{ campaign_id: string; is_unique: boolean }> = [];

      if (campaignIds.length) {
        const { data } = await supabase
          .from("clicks")
          .select("campaign_id, is_unique")
          .in("campaign_id", campaignIds);

        clickRows = data ?? [];
      }

      const { data: allClicks } = await supabase.from("clicks").select("campaign_id, is_unique");

      const globalTotalClicks = allClicks?.length ?? 0;
      const globalUniqueClicks = allClicks?.filter((click) => click.is_unique).length ?? 0;

      const recentCampaigns = (recentResult.data ?? []).map((campaign) => {
        const {
          data: { publicUrl: imageUrl },
        } = supabase.storage.from("campaign-images").getPublicUrl(campaign.image_path);

        const campaignClicks = clickRows.filter((click) => click.campaign_id === campaign.id);

        return {
          ...campaign,
          totalClicks: campaignClicks.length,
          uniqueClicks: campaignClicks.filter((click) => click.is_unique).length,
          publicUrl: `${window.location.origin}/c/${campaign.slug}`,
          imageUrl,
        };
      });

      setSummary({
        totalCampaigns: campaignsResult.count ?? 0,
        activeCampaigns: activeResult.count ?? 0,
        totalClicks: globalTotalClicks,
        uniqueClicks: globalUniqueClicks,
        recentCampaigns,
      });
    }

    void load();
  }, [profile]);

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Dashboard loading error</p>
            <h2>Unable to load your workspace</h2>
            <p className="muted">{error}</p>
          </section>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
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
        <title>Dashboard | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="See your campaign inventory, tracked clicks, and the latest public links in one place."
        title="Workspace overview"
      >
        <section className="hero-panel">
          <div className="hero-panel__copy">
            <p className="app-topbar__eyebrow">Today</p>
            <h2>Publish faster and see what is actually getting clicks.</h2>
            <p className="muted">
              AFFLIO now puts your latest campaign cards, click totals, and quick test links into one cleaner operating view instead of spreading them across multiple screens.
            </p>
          </div>
          <div className="hero-panel__chips">
            <span className="hero-chip">Campaigns {summary.totalCampaigns}</span>
            <span className="hero-chip">Active {summary.activeCampaigns}</span>
            <span className="hero-chip">Unique clicks {summary.uniqueClicks}</span>
          </div>
        </section>

        <section className="app-grid app-grid--stats">
          <article className="stat-card">
            <p className="stat-card__label">Total campaigns</p>
            <strong>{summary.totalCampaigns}</strong>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Tracked clicks</p>
            <strong>{summary.totalClicks}</strong>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Unique clicks</p>
            <strong>{summary.uniqueClicks}</strong>
          </article>
        </section>

        <section className="app-grid app-grid--two">
          <article className="app-card">
            <div className="section-head">
              <div>
                <p className="app-topbar__eyebrow">Recent campaigns</p>
                <h2>Latest tracked cards</h2>
              </div>
              <Link className="btn btn-outline" href="/dashboard/campaigns">
                Open campaigns
              </Link>
            </div>

            {summary.recentCampaigns.length ? (
              <div className="campaign-mini-grid">
                {summary.recentCampaigns.map((campaign) => (
                  <article className="campaign-mini-card" key={campaign.id}>
                    <div className="campaign-mini-card__image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={campaign.title || "Campaign image"} src={campaign.imageUrl} />
                    </div>
                    <div className="campaign-mini-card__body">
                      <strong>{campaign.title || "Untitled campaign"}</strong>
                      <p className="muted">/c/{campaign.slug}</p>
                      <div className="campaign-mini-card__stats">
                        <span>{campaign.totalClicks} total</span>
                        <span>{campaign.uniqueClicks} unique</span>
                      </div>
                      <a className="btn btn-outline" href={campaign.publicUrl} rel="noreferrer" target="_blank">
                        Test link
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <h3>No campaigns yet</h3>
                <p>Upload a product photo and paste your affiliate link — your first trackable card takes about a minute.</p>
                <Link className="btn btn-fill" href="/dashboard/campaigns">
                  Create your first campaign
                </Link>
              </div>
            )}
          </article>

          <article className="app-card">
            <p className="app-topbar__eyebrow">Platform status</p>
            <h2>What is working now</h2>
            <ul className="feature-list">
              <li>Authenticated campaign creation with Supabase Storage uploads</li>
              <li>Public `/c/[slug]` tracked-link flow</li>
              <li>Bot-aware click logging with unique-click tracking</li>
              <li>Client and admin protected dashboard access</li>
              <li>{summary.activeCampaigns} active campaigns currently published</li>
            </ul>
          </article>
        </section>
      </AppShell>
    </>
  );
}
