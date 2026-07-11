import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDomainAllowed, requireActiveProfile } from "@/lib/account-state";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { createCampaignSlug, validateCampaignInput } from "@/lib/campaigns";
import { getEffectivePlanForUser } from "@/lib/plans";

type ApiResponse =
  | { error: string }
  | {
      campaign: {
        id: string;
        slug: string;
        title: string | null;
        caption: string | null;
        destination_url: string;
        image_path: string;
        platform_source: string | null;
        status: string;
        created_at: string;
      };
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = createPagesServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "You must be logged in to create a campaign." });
  }

  const activeProfile = await requireActiveProfile(supabase, user.id, res);
  if (!activeProfile) {
    return;
  }

  if (!user.email_confirmed_at) {
    return res.status(403).json({ error: "Verify your email before publishing campaigns." });
  }

  const parsed = validateCampaignInput(req.body ?? {});

  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  if (!parsed.value.imagePath.startsWith(`${user.id}/`)) {
    return res.status(400).json({ error: "Uploaded image path is invalid for this user." });
  }

  const domainAllowed = await ensureDomainAllowed(supabase, parsed.value.destinationHostname);
  if (!domainAllowed) {
    return res.status(403).json({ error: "That destination domain is blocked by AFFLIO admin." });
  }

  const plan = await getEffectivePlanForUser(supabase, user.id);

  if (plan) {
    const { count: campaignCount } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived");

    if ((campaignCount ?? 0) >= plan.campaign_limit) {
      return res.status(403).json({
        error: `Your ${plan.name} plan allows up to ${plan.campaign_limit} active or paused campaigns.`,
      });
    }
  }

  let slug = "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = createCampaignSlug();
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existing) {
      slug = candidate;
      break;
    }
  }

  if (!slug) {
    return res.status(500).json({ error: "Unable to generate a unique campaign slug." });
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      slug,
      image_path: parsed.value.imagePath,
      destination_url: parsed.value.destinationUrl,
      title: parsed.value.title,
      caption: parsed.value.caption,
      platform_source: parsed.value.platformSource,
      status: "active",
    })
    .select("id, slug, title, caption, destination_url, image_path, platform_source, status, created_at")
    .single();

  if (error || !campaign) {
    return res.status(500).json({ error: error?.message || "Failed to create campaign." });
  }

  return res.status(201).json({ campaign });
}
