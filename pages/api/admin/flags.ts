import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";

type ApiResponse = { ok: true; id?: string } | { error: string };

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const context = await requireAdminApi(req, res);
  if (!context) return;

  if (req.method === "POST") {
    const { type } = req.body ?? {};

    if (type === "banned_domain") {
      const { domain, reason } = req.body ?? {};

      if (typeof domain !== "string") {
        return res.status(400).json({ error: "Domain is required." });
      }

      const payload = {
        domain: normalizeDomain(domain),
        reason: typeof reason === "string" ? reason.trim() || null : null,
        is_active: true,
        created_by: context.adminUserId,
      };

      const { data: created, error } = await context.supabase
        .from("banned_domains")
        .insert(payload)
        .select("id")
        .single();

      if (error || !created) {
        return res.status(500).json({ error: error?.message || "Failed to ban domain." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.flags.banned_domain.create",
        entityType: "banned_domain",
        entityId: created.id,
        beforeJson: null,
        afterJson: payload,
      });

      return res.status(200).json({ ok: true, id: created.id });
    }

    if (type === "abuse_report") {
      const { campaignId, reason, notes } = req.body ?? {};

      if (typeof campaignId !== "string" || typeof reason !== "string") {
        return res.status(400).json({ error: "Campaign and reason are required." });
      }

      const payload = {
        campaign_id: campaignId,
        reported_by: context.adminUserId,
        reason: reason.trim(),
        notes: typeof notes === "string" ? notes.trim() || null : null,
      };

      const { data: created, error } = await context.supabase
        .from("abuse_reports")
        .insert(payload)
        .select("id")
        .single();

      if (error || !created) {
        return res.status(500).json({ error: error?.message || "Failed to create report." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.flags.abuse_report.create",
        entityType: "abuse_report",
        entityId: created.id,
        beforeJson: null,
        afterJson: payload,
      });

      return res.status(200).json({ ok: true, id: created.id });
    }

    return res.status(400).json({ error: "Flag type is invalid." });
  }

  if (req.method === "PATCH") {
    const { type } = req.body ?? {};

    if (type === "abuse_report") {
      const { reportId, status, notes } = req.body ?? {};

      if (typeof reportId !== "string" || typeof status !== "string") {
        return res.status(400).json({ error: "Report id and status are required." });
      }

      const { data: existing } = await context.supabase
        .from("abuse_reports")
        .select("status, notes, reviewed_by, reviewed_at")
        .eq("id", reportId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ error: "Abuse report not found." });
      }

      const updates = {
        status,
        notes: typeof notes === "string" ? notes.trim() || null : existing.notes,
        reviewed_by: context.adminUserId,
        reviewed_at: new Date().toISOString(),
      };

      const { error } = await context.supabase
        .from("abuse_reports")
        .update(updates)
        .eq("id", reportId);

      if (error) {
        return res.status(500).json({ error: error.message || "Failed to update report." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.flags.abuse_report.update",
        entityType: "abuse_report",
        entityId: reportId,
        beforeJson: existing,
        afterJson: updates,
      });

      return res.status(200).json({ ok: true, id: reportId });
    }

    if (type === "banned_domain") {
      const { domainId, isActive, reason } = req.body ?? {};

      if (typeof domainId !== "string") {
        return res.status(400).json({ error: "Domain id is required." });
      }

      const { data: existing } = await context.supabase
        .from("banned_domains")
        .select("is_active, reason, domain")
        .eq("id", domainId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ error: "Banned domain record not found." });
      }

      const updates = {
        is_active: isActive === undefined ? existing.is_active : Boolean(isActive),
        reason: typeof reason === "string" ? reason.trim() || null : existing.reason,
      };

      const { error } = await context.supabase
        .from("banned_domains")
        .update(updates)
        .eq("id", domainId);

      if (error) {
        return res.status(500).json({ error: error.message || "Failed to update domain." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.flags.banned_domain.update",
        entityType: "banned_domain",
        entityId: domainId,
        beforeJson: existing,
        afterJson: updates,
      });

      return res.status(200).json({ ok: true, id: domainId });
    }

    return res.status(400).json({ error: "Flag type is invalid." });
  }

  res.setHeader("Allow", "POST, PATCH");
  return res.status(405).json({ error: "Method not allowed." });
}
