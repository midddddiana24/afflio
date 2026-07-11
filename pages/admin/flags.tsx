"use client";

import { useEffect, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  extractHostname,
  formatDateTime,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type ReportRecord = {
  id: string;
  campaign_id: string | null;
  reason: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type DomainRecord = {
  id: string;
  domain: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
};

type CampaignRecord = {
  id: string;
  title: string | null;
  destination_url: string;
};

export default function AdminFlagsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [reportsResult, domainsResult, campaignsResult] = await Promise.all([
      supabase.from("abuse_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("banned_domains").select("*").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, title, destination_url"),
    ]);

    setReports((reportsResult.data ?? []) as ReportRecord[]);
    setDomains((domainsResult.data ?? []) as DomainRecord[]);
    setCampaigns((campaignsResult.data ?? []) as CampaignRecord[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateReport(reportId: string, status: string) {
    setBusyId(reportId);

    const response = await fetch("/api/admin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "abuse_report", reportId, status }),
    });

    setBusyId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to update report.");
      return;
    }

    await load();
  }

  async function toggleDomain(domainId: string, isActive: boolean) {
    setBusyId(domainId);

    const response = await fetch("/api/admin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "banned_domain", domainId, isActive }),
    });

    setBusyId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to update domain.");
      return;
    }

    await load();
  }

  async function addDomain() {
    const response = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "banned_domain", domain: newDomain, reason: "Manual admin block" }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to add domain.");
      return;
    }

    setNewDomain("");
    await load();
  }

  return (
    <AdminPageFrame
      title="Flags"
      subtitle="Abuse review queue and banned destination domain control."
      heroTitle="Protect platform trust before unsafe campaigns spread"
      heroDescription="Use the review queue to resolve suspicious campaigns quickly and maintain a blocklist for repeat or unsafe destination domains."
      heroChips={[`${formatNumber(reports.length)} reports`, `${formatNumber(domains.filter((item) => item.is_active).length)} active domain blocks`]}
    >
      {() => (
        <>
          <section className="admin-ops-grid">
            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Review queue</p>
                  <h2>Abuse reports</h2>
                </div>
              </div>

              <div className="admin-mini-list">
                {reports.map((report) => {
                  const campaign = campaigns.find((item) => item.id === report.campaign_id);
                  return (
                    <div className="admin-mini-list__item admin-mini-list__item--stacked" key={report.id}>
                      <div>
                        <strong>{campaign?.title || extractHostname(campaign?.destination_url)}</strong>
                        <p className="muted">{report.reason}</p>
                      </div>
                      <div className="campaign-card__actions">
                        <span className={toBadgeClass(report.status)}>{report.status}</span>
                        <button
                          className="btn btn-outline"
                          disabled={busyId === report.id}
                          onClick={() => updateReport(report.id, "reviewing")}
                          type="button"
                        >
                          Review
                        </button>
                        <button
                          className="btn btn-outline"
                          disabled={busyId === report.id}
                          onClick={() => updateReport(report.id, "resolved")}
                          type="button"
                        >
                          Resolve
                        </button>
                        <button
                          className="btn"
                          disabled={busyId === report.id}
                          onClick={() => updateReport(report.id, "dismissed")}
                          type="button"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="app-card">
              <div className="section-head">
                <div>
                  <p className="app-topbar__eyebrow">Blocklist</p>
                  <h2>Banned domains</h2>
                </div>
              </div>

              <div className="admin-form-grid">
                <input
                  className="input"
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="example.com"
                  value={newDomain}
                />
                <button className="btn" onClick={addDomain} type="button">
                  Add domain block
                </button>
              </div>

              <div className="admin-mini-list">
                {domains.map((domain) => (
                  <div className="admin-mini-list__item" key={domain.id}>
                    <div>
                      <strong>{domain.domain}</strong>
                      <p className="muted">{domain.reason || formatDateTime(domain.created_at)}</p>
                    </div>
                    <button
                      className="btn btn-outline"
                      disabled={busyId === domain.id}
                      onClick={() => toggleDomain(domain.id, !domain.is_active)}
                      type="button"
                    >
                      {domain.is_active ? "Disable block" : "Enable block"}
                    </button>
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
