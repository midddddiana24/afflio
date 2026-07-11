"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  formatDateTime,
  formatNumber,
} from "@/lib/admin-ui";

type AuditLogRecord = {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: unknown;
  after_json: unknown;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [logsResult, profilesResult] = await Promise.all([
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id, display_name"),
      ]);

      setLogs((logsResult.data ?? []) as AuditLogRecord[]);
      setProfiles((profilesResult.data ?? []) as ProfileRecord[]);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) =>
      [log.action, log.entity_type, log.entity_id].join(" ").toLowerCase().includes(term)
    );
  }, [logs, query]);

  const selected = filtered.find((log) => log.id === selectedId) || logs[0] || null;

  return (
    <AdminPageFrame
      title="Audit logs"
      subtitle="Every admin mutation should leave an inspectable trail."
      heroTitle="Admin power without an audit trail is operational risk"
      heroDescription="Use this log to review who changed what, compare before and after values, and debug entitlement or moderation incidents."
      heroChips={[`${formatNumber(logs.length)} recent actions`]}
    >
      {() => (
        <div className="admin-page-grid">
          <section className="app-card">
            <div className="admin-toolbar">
              <div>
                <p className="app-topbar__eyebrow">Change history</p>
                <h2>Audit log stream</h2>
              </div>
              <input
                className="input admin-toolbar__search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search action or entity"
                value={query}
              />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr
                      className={selected?.id === log.id ? "is-selected" : undefined}
                      key={log.id}
                      onClick={() => setSelectedId(log.id)}
                    >
                      <td>{profiles.find((profile) => profile.id === log.admin_user_id)?.display_name || "Admin"}</td>
                      <td>{log.action}</td>
                      <td>
                        <strong>{log.entity_type}</strong>
                        <span className="muted admin-cell-subtle">{log.entity_id}</span>
                      </td>
                      <td>{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="app-card admin-detail-card">
            {selected ? (
              <>
                <div className="section-head">
                  <div>
                    <p className="app-topbar__eyebrow">Selected action</p>
                    <h2>{selected.action}</h2>
                  </div>
                </div>
                <div className="admin-inline-section">
                  <h3>Before</h3>
                  <pre className="admin-json-block">
                    {JSON.stringify(selected.before_json ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="admin-inline-section">
                  <h3>After</h3>
                  <pre className="admin-json-block">
                    {JSON.stringify(selected.after_json ?? {}, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="empty-state admin-empty-state">
                <div className="empty-state__icon">A</div>
                <h3>Select an audit row</h3>
                <p>Before and after values will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </AdminPageFrame>
  );
}
