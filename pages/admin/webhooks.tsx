"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "@/components/admin/AdminPageFrame";
import { createClient } from "@/lib/supabase/client";
import {
  formatDateTime,
  formatNumber,
  toBadgeClass,
} from "@/lib/admin-ui";

type WebhookRecord = {
  id: string;
  provider: string;
  event_type: string;
  provider_event_id: string;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
};

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const result = await supabase
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    setEvents((result.data ?? []) as WebhookRecord[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return events;

    return events.filter((event) =>
      [event.provider, event.event_type, event.status, event.provider_event_id]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [events, query]);

  const selected = filtered.find((event) => event.id === selectedId) || events[0] || null;

  async function mutate(webhookId: string, action: "retry" | "markProcessed" | "markIgnored") {
    setBusyId(webhookId);

    const response = await fetch("/api/admin/webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, action }),
    });

    setBusyId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(data?.error || "Failed to update webhook.");
      return;
    }

    await load();
  }

  return (
    <AdminPageFrame
      title="Webhooks"
      subtitle="Inspect provider delivery issues and control retry state from the admin side."
      heroTitle="Webhook visibility is the difference between billing confidence and guesswork"
      heroDescription="Every incoming event should be searchable, status-tagged, and recoverable when provider delivery or processing fails."
      heroChips={[`${formatNumber(events.length)} events`, `${formatNumber(events.filter((item) => item.status === "failed").length)} failed`]}
    >
      {() => (
        <div className="admin-page-grid">
          <section className="app-card">
            <div className="admin-toolbar">
              <div>
                <p className="app-topbar__eyebrow">Event stream</p>
                <h2>Webhook history</h2>
              </div>
              <input
                className="input admin-toolbar__search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search provider, event type, or status"
                value={query}
              />
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event) => (
                    <tr
                      className={selected?.id === event.id ? "is-selected" : undefined}
                      key={event.id}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <td>{event.provider}</td>
                      <td>
                        <strong>{event.event_type}</strong>
                        <span className="muted admin-cell-subtle">{event.provider_event_id}</span>
                      </td>
                      <td>
                        <span className={toBadgeClass(event.status)}>{event.status}</span>
                      </td>
                      <td>{formatDateTime(event.created_at)}</td>
                      <td>{event.error_message || "—"}</td>
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
                    <p className="app-topbar__eyebrow">Event detail</p>
                    <h2>{selected.event_type}</h2>
                  </div>
                  <span className={toBadgeClass(selected.status)}>{selected.status}</span>
                </div>

                <div className="campaign-card__actions">
                  <button
                    className="btn btn-outline"
                    disabled={busyId === selected.id}
                    onClick={() => mutate(selected.id, "retry")}
                    type="button"
                  >
                    Retry
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={busyId === selected.id}
                    onClick={() => mutate(selected.id, "markProcessed")}
                    type="button"
                  >
                    Mark processed
                  </button>
                  <button
                    className="btn"
                    disabled={busyId === selected.id}
                    onClick={() => mutate(selected.id, "markIgnored")}
                    type="button"
                  >
                    Ignore
                  </button>
                </div>

                <pre className="admin-json-block">
                  {JSON.stringify(selected.payload || {}, null, 2)}
                </pre>
              </>
            ) : (
              <div className="empty-state admin-empty-state">
                <div className="empty-state__icon">W</div>
                <h3>Select a webhook event</h3>
                <p>Payload detail and retry actions will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </AdminPageFrame>
  );
}
