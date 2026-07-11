import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

type ApiResponse = { ok: true } | { error: string };

const allowedStatuses = new Set(["active", "paused", "archived"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const context = await requireAdminApi(req, res);
  if (!context) return;

  if (req.method === "PATCH") {
    const { campaignId, status } = req.body ?? {};

    if (typeof campaignId !== "string") {
      return res.status(400).json({ error: "Campaign id is required." });
    }

    if (typeof status !== "string" || !allowedStatuses.has(status)) {
      return res.status(400).json({ error: "Campaign status is invalid." });
    }

    const { data: existing } = await context.supabase
      .from("campaigns")
      .select("status, user_id, slug, destination_url")
      .eq("id", campaignId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found." });
    }

    const { error } = await context.supabase
      .from("campaigns")
      .update({ status })
      .eq("id", campaignId);

    if (error) {
      return res.status(500).json({ error: error.message || "Failed to update campaign." });
    }

    await logAdminAction({
      supabase: context.supabase,
      adminUserId: context.adminUserId,
      action: "admin.campaigns.update",
      entityType: "campaign",
      entityId: campaignId,
      beforeJson: existing,
      afterJson: { status },
    });

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { campaignId } = req.body ?? {};

    if (typeof campaignId !== "string") {
      return res.status(400).json({ error: "Campaign id is required." });
    }

    const { data: existing } = await context.supabase
      .from("campaigns")
      .select("image_path, slug, destination_url, user_id, status")
      .eq("id", campaignId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found." });
    }

    const { error } = await context.supabase.from("campaigns").delete().eq("id", campaignId);

    if (error) {
      return res.status(500).json({ error: error.message || "Failed to delete campaign." });
    }

    if (existing.image_path) {
      const serviceRole = createServiceRoleClient();
      await serviceRole.storage.from("campaign-images").remove([existing.image_path]);
    }

    await logAdminAction({
      supabase: context.supabase,
      adminUserId: context.adminUserId,
      action: "admin.campaigns.delete",
      entityType: "campaign",
      entityId: campaignId,
      beforeJson: existing,
      afterJson: null,
    });

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}
