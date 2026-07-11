"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useSessionContext } from "@/lib/use-session-context";

type CampaignRow = {
  id: string;
  slug: string;
  title: string | null;
  platform_source: string | null;
  status: string;
  created_at: string;
};

type ClickRow = {
  campaign_id: string;
  is_unique: boolean;
  referrer: string | null;
  device_type: string | null;
  clicked_at: string;
};

type CampaignAnalytics = CampaignRow & {
  totalClicks: number;
  uniqueClicks: number;
  topReferrer: string;
  deviceMix: string;
};

export default function AnalyticsPage() {
  const { loading, profile, error } = useSessionContext();
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!profile) return;
    void loadAnalytics();
  }, [profile]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const platformMatches =
        platformFilter === "all"
          ? true
          : (campaign.platform_source || "other") === platformFilter;
      const statusMatches = statusFilter === "all" ? true : campaign.status === statusFilter;

      return platformMatches && statusMatches;
    });
  }, [campaigns, platformFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalClicks = filteredCampaigns.reduce((sum, campaign) => sum + campaign.totalClicks, 0);
    const uniqueClicks = filteredCampaigns.reduce((sum, campaign) => sum + campaign.uniqueClicks, 0);
    const referrerMap = new Map<string, number>();

    for (const click of clicks) {
      const label = extractReferrerLabel(click.referrer);
      referrerMap.set(label, (referrerMap.get(label) ?? 0) + 1);
    }

    const topReferrer = Array.from(referrerMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";

    return {
      totalClicks,
      uniqueClicks,
      topReferrer,
    };
  }, [clicks, filteredCampaigns]);

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main" style={{ gridColumn: "1 / -1", padding: "2rem" }}>
          <section className="app-card">
            <p className="app-topbar__eyebrow">Analytics loading error</p>
            <h2>Unable to load analytics</h2>
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
        <title>Analytics | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Campaign performance, top sources, and click mix across your tracked public links."
        title="Analytics"
      >
        <section className="hero-panel hero-panel--compact">
          <div className="hero-panel__copy">
            <p className="app-topbar__eyebrow">Performance</p>
            <h2>Read the story behind your shared links.</h2>
            <p className="muted">
              Filter by platform or status, then compare which campaigns are actually driving real traffic instead of just sitting live.
            </p>
          </div>
        </section>

        <section className="app-grid app-grid--stats">
          <article className="stat-card">
            <p className="stat-card__label">Total clicks</p>
            <strong>{summary.totalClicks}</strong>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Unique clicks</p>
            <strong>{summary.uniqueClicks}</strong>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Top source</p>
            <strong>{summary.topReferrer}</strong>
          </article>
        </section>

        <section className="app-card">
          <div className="section-head">
            <div>
              <p className="app-topbar__eyebrow">Filters</p>
              <h2>Campaign breakdown</h2>
            </div>
            <div className="campaign-toolbar">
              <select
                className="field-select campaign-toolbar__select"
                onChange={(event) => setPlatformFilter(event.target.value)}
                value={platformFilter}
              >
                <option value="all">all platforms</option>
                <option value="tiktok">tiktok</option>
                <option value="shopee">shopee</option>
                <option value="lazada">lazada</option>
                <option value="facebook">facebook</option>
                <option value="other">other</option>
              </select>
              <select
                className="field-select campaign-toolbar__select"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">all statuses</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          {filteredCampaigns.length ? (
            <div className="analytics-table">
              {filteredCampaigns.map((campaign) => (
                <div className="analytics-table__row" key={campaign.id}>
                  <div>
                    <strong>{campaign.title || "Untitled campaign"}</strong>
                    <p className="muted">/c/{campaign.slug}</p>
                  </div>
                  <div>
                    <span className="campaign-link-label">Clicks</span>
                    <strong>{campaign.totalClicks}</strong>
                  </div>
                  <div>
                    <span className="campaign-link-label">Unique</span>
                    <strong>{campaign.uniqueClicks}</strong>
                  </div>
                  <div>
                    <span className="campaign-link-label">Top source</span>
                    <strong>{campaign.topReferrer}</strong>
                  </div>
                  <div>
                    <span className="campaign-link-label">Devices</span>
                    <strong>{campaign.deviceMix}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No analytics data matches the current filters.</p>
          )}
        </section>
      </AppShell>
    </>
  );

  async function loadAnalytics() {
    const supabase = createClient();
    const [campaignsResult, clicksResult] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, slug, title, platform_source, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("clicks").select("campaign_id, is_unique, referrer, device_type, clicked_at"),
    ]);

    const clickRows = (clicksResult.data as ClickRow[] | null) ?? [];
    const campaignRows = (campaignsResult.data as CampaignRow[] | null) ?? [];

    setClicks(clickRows);

    const analytics = campaignRows.map((campaign) => {
      const scopedClicks = clickRows.filter((click) => click.campaign_id === campaign.id);
      const deviceMap = new Map<string, number>();

      for (const click of scopedClicks) {
        deviceMap.set(click.device_type || "unknown", (deviceMap.get(click.device_type || "unknown") ?? 0) + 1);
      }

      const topReferrer = getTopReferrer(scopedClicks);
      const topDevice = Array.from(deviceMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No device data";

      return {
        ...campaign,
        totalClicks: scopedClicks.length,
        uniqueClicks: scopedClicks.filter((click) => click.is_unique).length,
        topReferrer,
        deviceMix: topDevice,
      };
    });

    setCampaigns(analytics);
  }
}

function extractReferrerLabel(referrer: string | null) {
  if (!referrer) return "Direct";

  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 24);
  }
}

function getTopReferrer(clicks: ClickRow[]) {
  const referrerMap = new Map<string, number>();

  for (const click of clicks) {
    const label = extractReferrerLabel(click.referrer);
    referrerMap.set(label, (referrerMap.get(label) ?? 0) + 1);
  }

  return Array.from(referrerMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";
}
