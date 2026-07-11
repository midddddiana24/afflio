"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  extractHostname,
  formatNumber,
} from "@/lib/admin-ui";

type ProfileRecord = { created_at: string | null };
type CampaignRecord = { id: string; title: string | null; destination_url: string; created_at: string };
type ClickRecord = { campaign_id: string; is_unique: boolean; bot_score: number; clicked_at: string };

function dayKey(value: string | null) {
  if (!value) return "unknown";
  return value.slice(0, 10);
}

export default function AdminAnalyticsPage() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [clicks, setClicks] = useState<ClickRecord[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [profilesResult, campaignsResult, clicksResult] = await Promise.all([
        supabase.from("profiles").select("created_at"),
        supabase.from("campaigns").select("id, title, destination_url, created_at"),
        supabase.from("clicks").select("campaign_id, is_unique, bot_score, clicked_at"),
      ]);

      setProfiles((profilesResult.data ?? []) as ProfileRecord[]);
      setCampaigns((campaignsResult.data ?? []) as CampaignRecord[]);
      setClicks((clicksResult.data ?? []) as ClickRecord[]);
    }

    load();
  }, []);

  const topDomains = useMemo(() => {
    const counts = new Map<string, number>();
    for (const campaign of campaigns) {
      const domain = extractHostname(campaign.destination_url);
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [campaigns]);

  const topCampaigns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const click of clicks) {
      counts.set(click.campaign_id, (counts.get(click.campaign_id) || 0) + 1);
    }
    return campaigns
      .map((campaign) => ({
        id: campaign.id,
        title: campaign.title || extractHostname(campaign.destination_url),
        clicks: counts.get(campaign.id) || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
  }, [campaigns, clicks]);

  const suspiciousCampaigns = useMemo(() => {
    return campaigns
      .map((campaign) => {
        const campaignClicks = clicks.filter((click) => click.campaign_id === campaign.id);
        const avgBotScore = campaignClicks.length
          ? Math.round(
              campaignClicks.reduce((sum, click) => sum + (click.bot_score || 0), 0) /
                campaignClicks.length
            )
          : 0;
        return {
          id: campaign.id,
          title: campaign.title || extractHostname(campaign.destination_url),
          avgBotScore,
          clicks: campaignClicks.length,
        };
      })
      .filter((campaign) => campaign.clicks > 0)
      .sort((a, b) => b.avgBotScore - a.avgBotScore)
      .slice(0, 5);
  }, [campaigns, clicks]);

  const signupTrend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const profile of profiles) {
      const key = dayKey(profile.created_at);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  }, [profiles]);

  const campaignTrend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const campaign of campaigns) {
      const key = dayKey(campaign.created_at);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  }, [campaigns]);

  return (
    <AdminPageFrame
      title="Analytics"
      subtitle="Platform-level traffic health, signup trends, and anomaly visibility."
      heroTitle="See how the platform is performing beyond one user dashboard"
      heroDescription="This view focuses on platform-wide trends, suspicious traffic clusters, and the domains driving the most affiliate activity."
      heroChips={[
        `${formatNumber(clicks.length)} total clicks`,
        `${formatNumber(clicks.filter((item) => item.is_unique).length)} unique`,
      ]}
    >
      {() => (
        <>
          <section className="app-grid app-grid--stats">
            <article className="stat-card">
              <p className="stat-card__label">Platform clicks</p>
              <strong>{formatNumber(clicks.length)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Unique clicks</p>
              <strong>{formatNumber(clicks.filter((item) => item.is_unique).length)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Campaigns</p>
              <strong>{formatNumber(campaigns.length)}</strong>
            </article>
            <article className="stat-card">
              <p className="stat-card__label">Signups</p>
              <strong>{formatNumber(profiles.length)}</strong>
            </article>
          </section>

          <section className="admin-ops-grid">
            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Top domains</p>
                  <h2>Destination mix</h2>
                </div>
              </div>
              <div className="admin-mini-list">
                {topDomains.map(([domain, count]) => (
                  <div className="admin-mini-list__item" key={domain}>
                    <strong>{domain}</strong>
                    <span>{formatNumber(count)} campaigns</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Top campaigns</p>
                  <h2>Click leaders</h2>
                </div>
              </div>
              <div className="admin-mini-list">
                {topCampaigns.map((campaign) => (
                  <div className="admin-mini-list__item" key={campaign.id}>
                    <strong>{campaign.title}</strong>
                    <span>{formatNumber(campaign.clicks)} clicks</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Suspicious traffic</p>
                  <h2>Bot-heavy campaigns</h2>
                </div>
              </div>
              <div className="admin-mini-list">
                {suspiciousCampaigns.map((campaign) => (
                  <div className="admin-mini-list__item" key={campaign.id}>
                    <strong>{campaign.title}</strong>
                    <span>Bot score {campaign.avgBotScore}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Trends</p>
                  <h2>Daily creation</h2>
                </div>
              </div>
              <div className="admin-mini-list">
                {signupTrend.map(([day, count]) => (
                  <div className="admin-mini-list__item" key={`signup-${day}`}>
                    <strong>{day}</strong>
                    <span>{formatNumber(count)} signups</span>
                  </div>
                ))}
                {campaignTrend.map(([day, count]) => (
                  <div className="admin-mini-list__item" key={`campaign-${day}`}>
                    <strong>{day}</strong>
                    <span>{formatNumber(count)} campaigns</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </AdminPageFrame>
  );
}
