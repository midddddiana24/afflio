import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { requireActiveProfile } from "@/lib/account-state";
import { getEffectivePlanForUser } from "@/lib/plans";
import { createPagesServerClient } from "@/lib/supabase/pages-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const supabase = createPagesServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "You must be logged in." });
  if (!(await requireActiveProfile(supabase, user.id, res))) return;

  const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : "";
  const { data: campaign } = await supabase.from("campaigns").select("slug")
    .eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  const plan = await getEffectivePlanForUser(supabase, user.id);
  if (!plan?.qr_enabled) return res.status(403).json({ error: "QR codes are available on paid plans." });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || `http://${req.headers.host || "localhost:3000"}`;
  const png = await QRCode.toBuffer(`${origin.replace(/\/$/, "")}/c/${campaign.slug}`, {
    type: "png", width: 640, margin: 2, color: { dark: "#111111", light: "#ffffff" },
  });
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=300");
  return res.status(200).send(png);
}
