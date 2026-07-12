import type { NextApiRequest, NextApiResponse } from "next";
import { requireActiveProfile, ensureDomainAllowed } from "@/lib/account-state";
import { toHotspotRows, validateHotspots } from "@/lib/hotspots";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { getEffectivePlanForUser } from "@/lib/plans";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = createPagesServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "You must be logged in." });
  if (!(await requireActiveProfile(supabase, user.id, res))) return;

  const campaignId = typeof req.body?.campaignId === "string" ? req.body.campaignId : "";
  const parsed = validateHotspots(req.body?.hotspots);
  if (!campaignId || !parsed.ok) {
    return res.status(400).json({ error: parsed.ok ? "Campaign id is required." : parsed.error });
  }

  const plan = await getEffectivePlanForUser(supabase, user.id);
  if (plan && parsed.value.length > plan.hotspot_limit) {
    return res.status(403).json({ error: `${plan.name} allows up to ${plan.hotspot_limit} hotspots per campaign.` });
  }

  const { data: campaign } = await supabase
    .from("campaigns").select("id").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  for (const hotspot of parsed.value) {
    const hostname = new URL(hotspot.destinationUrl).hostname;
    if (!(await ensureDomainAllowed(supabase, hostname))) {
      return res.status(403).json({ error: `${hostname} is blocked by AFFLIO admin.` });
    }
  }

  const { error: deleteError } = await supabase.from("campaign_hotspots").delete().eq("campaign_id", campaignId);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  if (parsed.value.length) {
    const { error } = await supabase.from("campaign_hotspots").insert(toHotspotRows(campaignId, parsed.value));
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ hotspots: parsed.value });
}
