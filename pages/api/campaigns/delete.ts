import type { NextApiRequest, NextApiResponse } from "next";
import { requireActiveProfile } from "@/lib/account-state";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

type ApiResponse = { ok: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = createPagesServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "You must be logged in to delete a campaign." });
  }

  const activeProfile = await requireActiveProfile(supabase, user.id, res);
  if (!activeProfile) {
    return;
  }

  const { id } = req.body ?? {};

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Campaign id is required." });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (campaignError) {
    return res.status(500).json({ error: campaignError.message || "Unable to load campaign." });
  }

  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found or you do not own it." });
  }

  const { data: deleted, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete campaign." });
  }

  if (!deleted) {
    return res.status(409).json({ error: "Supabase did not delete the campaign. Check the campaigns RLS delete policy." });
  }

  if (campaign?.image_path?.startsWith(`${user.id}/`)) {
    try {
      const serviceRole = createServiceRoleClient();
      const { count: remainingReferences } = await serviceRole
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("image_path", campaign.image_path);

      if ((remainingReferences ?? 0) === 0) {
        await serviceRole.storage.from("campaign-images").remove([campaign.image_path]);
      }
    } catch {
      // The campaign is already deleted. A stale image is safer than reporting
      // a false deletion failure or breaking another duplicated campaign.
    }
  }

  return res.status(200).json({ ok: true });
}
