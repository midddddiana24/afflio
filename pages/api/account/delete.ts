import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") { res.setHeader("Allow", "DELETE"); return res.status(405).json({ error: "Method not allowed." }); }
  if (req.body?.confirmation !== "DELETE") return res.status(400).json({ error: "Type DELETE to confirm account deletion." });
  const supabase = createPagesServerClient(req, res); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "You must be logged in." });
  const service = createServiceRoleClient();
  const { data: campaigns } = await service.from("campaigns").select("image_path").eq("user_id", user.id);
  const paths = (campaigns ?? []).map((campaign: { image_path: string }) => campaign.image_path).filter((path: string) => path.startsWith(`${user.id}/`));
  if (paths.length) await service.storage.from("campaign-images").remove(paths);
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: "Unable to delete the account. Contact support." });
  return res.status(200).json({ ok: true });
}
