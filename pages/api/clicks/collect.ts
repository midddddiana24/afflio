import type { NextApiRequest, NextApiResponse } from "next";
import { sanitizeReferrer, sanitizeUserAgent, hashIp } from "@/lib/clicks";
import { takeRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTrafficContext } from "@/lib/traffic";

type ApiResponse = { ok: true } | { error: string };

const UNIQUE_WINDOW_HOURS = 24;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { campaignId, slug } = req.body ?? {};

  if (typeof campaignId !== "string" || typeof slug !== "string") {
    return res.status(400).json({ error: "Campaign payload is invalid." });
  }

  const headersAdapter = {
    get(name: string) {
      const value = req.headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] ?? null : value ?? null;
    },
  };

  const traffic = getTrafficContext(headersAdapter);
  const rateKey = `api-click:${slug}:${traffic.ip ?? traffic.userAgent.slice(0, 60)}`;
  const rateLimit = takeRateLimit(rateKey, 25, 60_000);

  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));

  if (!rateLimit.allowed) {
    return res.status(202).json({ ok: true });
  }

  const supabase = createServiceRoleClient();
  const ipHash = hashIp(traffic.ip);
  const uniqueSince = new Date(Date.now() - UNIQUE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let isUnique = true;

  if (ipHash) {
    const { data: priorClick } = await supabase
      .from("clicks")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("ip_hash", ipHash)
      .gte("clicked_at", uniqueSince)
      .limit(1)
      .maybeSingle();

    isUnique = !priorClick;
  }

  await supabase.from("clicks").insert({
    campaign_id: campaignId,
    referrer: sanitizeReferrer(traffic.referrer),
    user_agent: sanitizeUserAgent(traffic.userAgent),
    country: traffic.country,
    device_type: traffic.deviceType,
    ip_hash: ipHash,
    bot_score: traffic.botScore,
    is_unique: isUnique,
  });

  return res.status(202).json({ ok: true });
}
