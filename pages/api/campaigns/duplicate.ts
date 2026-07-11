import type { NextApiRequest, NextApiResponse } from "next";
import { requireActiveProfile } from "@/lib/account-state";
import { createCampaignSlug } from "@/lib/campaigns";
import { getEffectivePlanForUser } from "@/lib/plans";
import { createPagesServerClient } from "@/lib/supabase/pages-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const supabase = createPagesServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "You must be logged in." });
  if (!(await requireActiveProfile(supabase, user.id, res))) return;

  const campaignId = typeof req.body?.campaignId === "string" ? req.body.campaignId : "";
  const { data: source } = await supabase.from("campaigns").select("*")
    .eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!source) return res.status(404).json({ error: "Campaign not found." });

  const plan = await getEffectivePlanForUser(supabase, user.id);
  if (plan) {
    const { count } = await supabase.from("campaigns").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).neq("status", "archived");
    if ((count ?? 0) >= plan.campaign_limit) {
      return res.status(403).json({ error: `Your ${plan.name} plan campaign limit has been reached.` });
    }
  }

  const { data: duplicate, error } = await supabase.from("campaigns").insert({
    user_id: user.id,
    slug: createCampaignSlug(),
    image_path: source.image_path,
    destination_url: source.destination_url,
    title: `${source.title || "Untitled campaign"} copy`.slice(0, 120),
    caption: source.caption,
    platform_source: source.platform_source,
    status: "draft",
  }).select("*").single();
  if (error || !duplicate) return res.status(500).json({ error: error?.message || "Unable to duplicate campaign." });

  const { data: hotspots } = await supabase.from("campaign_hotspots").select("*")
    .eq("campaign_id", source.id).order("sort_order");
  if (hotspots?.length) {
    await supabase.from("campaign_hotspots").insert(hotspots.map(({ id: _id, created_at: _createdAt, ...hotspot }) => ({
      ...hotspot,
      campaign_id: duplicate.id,
    })));
  }
  return res.status(201).json({ campaign: duplicate });
}
