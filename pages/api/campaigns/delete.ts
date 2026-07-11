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

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete campaign." });
  }

  if (campaign?.image_path?.startsWith(`${user.id}/`)) {
    const serviceRole = createServiceRoleClient();
    await serviceRole.storage.from("campaign-images").remove([campaign.image_path]);
  }

  return res.status(200).json({ ok: true });
}
