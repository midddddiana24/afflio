import type { NextApiRequest, NextApiResponse } from "next";
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
  const plan = await getEffectivePlanForUser(supabase, user.id);
  if (!plan?.analytics_export_enabled) return res.status(403).json({ error: "CSV export is available on paid plans." });

  const { data: campaigns } = await supabase.from("campaigns").select("id, title, slug").eq("user_id", user.id);
  const campaignMap = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign]));
  const ids = [...campaignMap.keys()];
  const { data: clicks } = ids.length ? await supabase.from("clicks")
    .select("campaign_id, clicked_at, is_unique, device_type, country, referrer, bot_score")
    .in("campaign_id", ids).order("clicked_at", { ascending: false }).limit(50000) : { data: [] };
  const rows = [["campaign", "slug", "clicked_at", "unique", "device", "country", "referrer", "bot_score"],
    ...(clicks ?? []).map((click) => {
      const campaign = campaignMap.get(click.campaign_id);
      return [campaign?.title || "Untitled", campaign?.slug || "", click.clicked_at, click.is_unique, click.device_type || "unknown", click.country || "unknown", click.referrer || "direct", click.bot_score];
    })];
  const csv = rows.map((row) => row.map(toCsvCell).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="afflio-clicks-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(csv);
}

function toCsvCell(cell: unknown) {
  let value = String(cell ?? "");
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return `"${value.replace(/"/g, '""')}"`;
}
