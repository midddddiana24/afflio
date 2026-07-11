"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  extractHostname,
  formatDate,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type CampaignRecord = {
  id: string;
  user_id: string;
  slug: string;
  title: string | null;
  destination_url: string;
  platform_source: string | null;
  status: string;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
};

type ClickRecord = {
  campaign_id: string;
  is_unique: boolean;
  bot_score: number;
  clicked_at: string;
};

type ReportRecord = {
  id: string;
  campaign_id: string | null;
  status: string;
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [clicks, setClicks] = useState<ClickRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [campaignsResult, profilesResult, clicksResult, reportsResult] = await Promise.all([
      supabase.from("campaigns").select("id, user_id, slug, title, destination_url, platform_source, status, created_at"),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("clicks").select("campaign_id, is_unique, bot_score, clicked_at"),
      supabase.from("abuse_reports").select("id, campaign_id, status"),
    ]);

    setCampaigns((campaignsResult.data ?? []) as CampaignRecord[]);
    setProfiles((profilesResult.data ?? []) as ProfileRecord[]);
    setClicks((clicksResult.data ?? []) as ClickRecord[]);
    setReports((reportsResult.data ?? []) as ReportRecord[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredCampaigns = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return campaigns;

    return campaigns.filter((campaign) => {
      const owner = profiles.find((profile) => profile.id === campaign.user_id)?.display_name || "";
      return [
        campaign.slug,
        campaign.title || "",
        campaign.platform_source || "",
        campaign.destination_url,
        extractHostname(campaign.destination_url),
        owner,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [campaigns, profiles, query]);

  const selectedCampaign =
    filteredCampaigns.find((campaign) => campaign.id === selectedId) || campaigns[0] || null;

  const campaignMetrics = useMemo(() => {
    const map = new Map<
      string,
      { total: number; unique: number; avgBotScore: number; flagCount: number }
    >();

    for (const campaign of campaigns) {
      const campaignClicks = clicks.filter((click) => click.campaign_id === campaign.id);
      const total = campaignClicks.length;
      const unique = campaignClicks.filter((click) => click.is_unique).length;
      const avgBotScore = total
        ? Math.round(
            campaignClicks.reduce((sum, click) => sum + (click.bot_score || 0), 0) / total
          )
        : 0;
      const flagCount = reports.filter(
        (report) => report.campaign_id === campaign.id && ["open", "reviewing"].includes(report.status)
      ).length;

      map.set(campaign.id, { total, unique, avgBotScore, flagCount });
    }

    return map;
  }, [campaigns, clicks, reports]);

  async function mutateCampaign(
    campaignId: string,
    method: "PATCH" | "DELETE",
    payload?: Record<string, unknown>
  ) {
    setBusyKey(campaignId);

    const response = await fetch("/api/admin/campaigns", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...payload }),
    });

    setBusyKey(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Campaign action failed.");
      return;
    }

    await load();
  }

  async function flagCampaign(campaignId: string) {
    const response = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "abuse_report",
        campaignId,
        reason: "Manual admin review",
        notes: "Flagged from admin campaigns table.",
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to flag campaign.");
      return;
    }

    await load();
  }

  return (
    <AdminPageFrame
      title="Campaigns"
      subtitle="Platform-level campaign moderation with traffic context and domain visibility."
      heroTitle="Moderate the live card inventory before abuse spreads"
      heroDescription="Search by slug, owner, platform, or destination domain, then pause, archive, flag, or remove campaigns with one admin action."
      heroChips={[`${formatNumber(campaigns.length)} campaigns`, `${formatNumber(filteredCampaigns.length)} visible`]}
    >
      {() => (
        <div className="admin-page-grid">
          <section className="app-card">
            <div className="admin-toolbar">
              <div>
                <p className="app-topbar__eyebrow">Moderation</p>
                <h2>Campaign inventory</h2>
              </div>
              <input
                className="input admin-toolbar__search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search slug, owner, domain, or platform"
                value={query}
              />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Owner</th>
                    <th>Domain</th>
                    <th>Clicks</th>
                    <th>Bot score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => {
                    const owner = profiles.find((profile) => profile.id === campaign.user_id)?.display_name;
                    const metrics = campaignMetrics.get(campaign.id) || {
                      total: 0,
                      unique: 0,
                      avgBotScore: 0,
                      flagCount: 0,
                    };

                    return (
                      <tr
                        className={selectedCampaign?.id === campaign.id ? "is-selected" : undefined}
                        key={campaign.id}
                        onClick={() => setSelectedId(campaign.id)}
                      >
                        <td>
                          <strong>{campaign.title || campaign.slug}</strong>
                          <span className="muted admin-cell-subtle">/{campaign.slug}</span>
                        </td>
                        <td>{owner || "Unknown"}</td>
                        <td>{extractHostname(campaign.destination_url)}</td>
                        <td>{formatNumber(metrics.total)}</td>
                        <td>{metrics.avgBotScore}</td>
                        <td>
                          <span className={toBadgeClass(campaign.status)}>{campaign.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="app-card admin-detail-card">
            {selectedCampaign ? (
              <>
                <div className="section-head">
                  <div>
                    <p className="app-topbar__eyebrow">Campaign detail</p>
                    <h2>{selectedCampaign.title || selectedCampaign.slug}</h2>
                  </div>
                  <span className={toBadgeClass(selectedCampaign.status)}>
                    {selectedCampaign.status}
                  </span>
                </div>

                <div className="data-list">
                  <div className="data-list__row">
                    <span className="muted">Slug</span>
                    <strong>/{selectedCampaign.slug}</strong>
                  </div>
                  <div className="data-list__row">
                    <span className="muted">Domain</span>
                    <strong>{extractHostname(selectedCampaign.destination_url)}</strong>
                  </div>
                  <div className="data-list__row">
                    <span className="muted">Created</span>
                    <strong>{formatDate(selectedCampaign.created_at)}</strong>
                  </div>
                  <div className="data-list__row">
                    <span className="muted">Suspicion</span>
                    <strong>
                      {(campaignMetrics.get(selectedCampaign.id)?.avgBotScore || 0) >= 60
                        ? "High"
                        : "Normal"}
                    </strong>
                  </div>
                </div>

                <div className="campaign-card__actions">
                  <button
                    className="btn btn-outline"
                    disabled={busyKey === selectedCampaign.id}
                    onClick={() =>
                      mutateCampaign(selectedCampaign.id, "PATCH", {
                        status:
                          selectedCampaign.status === "active" ? "paused" : "active",
                      })
                    }
                    type="button"
                  >
                    {selectedCampaign.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={busyKey === selectedCampaign.id}
                    onClick={() =>
                      mutateCampaign(selectedCampaign.id, "PATCH", { status: "archived" })
                    }
                    type="button"
                  >
                    Archive
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => flagCampaign(selectedCampaign.id)}
                    type="button"
                  >
                    Flag
                  </button>
                  <button
                    className="btn"
                    disabled={busyKey === selectedCampaign.id}
                    onClick={() => mutateCampaign(selectedCampaign.id, "DELETE")}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state admin-empty-state">
                <div className="empty-state__icon">C</div>
                <h3>Select a campaign</h3>
                <p>Moderation actions and anomaly context will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </AdminPageFrame>
  );
}
