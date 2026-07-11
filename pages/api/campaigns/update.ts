import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDomainAllowed, requireActiveProfile } from "@/lib/account-state";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  normalizeText,
  validateCustomSlug,
  validateDestinationUrl,
} from "@/lib/campaigns";

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

const allowedStatuses = new Set(["active", "paused", "archived"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = createPagesServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "You must be logged in to update a campaign." });
  }

  const activeProfile = await requireActiveProfile(supabase, user.id, res);
  if (!activeProfile) {
    return;
  }

  const { id, title, caption, destinationUrl, platformSource, status, slug, imagePath, oldImagePath } = req.body ?? {};

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Campaign id is required." });
  }

  const updates: Record<string, string | null> = {};

  if (title !== undefined) {
    updates.title = normalizeText(String(title), 120);
  }

  if (caption !== undefined) {
    updates.caption = normalizeText(String(caption), 280);
  }

  if (platformSource !== undefined) {
    updates.platform_source = normalizeText(String(platformSource), 40);
  }

  if (destinationUrl !== undefined) {
    const destination = validateDestinationUrl(String(destinationUrl));
    if (!destination.valid) {
      return res.status(400).json({ error: destination.error });
    }
    const domainAllowed = await ensureDomainAllowed(supabase, destination.hostname);
    if (!domainAllowed) {
      return res.status(403).json({ error: "That destination domain is blocked by AFFLIO admin." });
    }
    updates.destination_url = destination.value;
  }

  if (status !== undefined) {
    if (typeof status !== "string" || !allowedStatuses.has(status)) {
      return res.status(400).json({ error: "Campaign status is invalid." });
    }
    updates.status = status;
  }

  if (slug !== undefined) {
    const parsedSlug = validateCustomSlug(String(slug));
    if (!parsedSlug.valid) {
      return res.status(400).json({ error: parsedSlug.error });
    }

    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("slug", parsedSlug.value)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "That custom slug is already in use." });
    }

    updates.slug = parsedSlug.value;
  }

  if (imagePath !== undefined) {
    if (typeof imagePath !== "string" || !imagePath.startsWith(`${user.id}/`)) {
      return res.status(400).json({ error: "Replacement image path is invalid." });
    }

    updates.image_path = imagePath;
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, slug, title, caption, destination_url, image_path, platform_source, status, created_at")
    .single();

  if (error || !campaign) {
    return res.status(500).json({ error: error?.message || "Failed to update campaign." });
  }

  if (
    typeof imagePath === "string" &&
    typeof oldImagePath === "string" &&
    oldImagePath !== imagePath &&
    oldImagePath.startsWith(`${user.id}/`)
  ) {
    const serviceRole = createServiceRoleClient();
    await serviceRole.storage.from("campaign-images").remove([oldImagePath]);
  }

  return res.status(200).json({ campaign });
}
