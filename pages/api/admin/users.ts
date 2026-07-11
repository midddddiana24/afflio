import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";

type ApiResponse = { ok: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const context = await requireAdminApi(req, res);
  if (!context) return;

  const { userId, role, suspended, suspensionReason } = req.body ?? {};

  if (typeof userId !== "string") {
    return res.status(400).json({ error: "User id is required." });
  }

  const { data: existing } = await context.supabase
    .from("profiles")
    .select("role, suspended_at, suspension_reason")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ error: "User not found." });
  }

  const updates: Record<string, string | null> = {};

  if (role !== undefined) {
    if (role !== "client" && role !== "admin") {
      return res.status(400).json({ error: "Role is invalid." });
    }
    updates.role = role;
  }

  if (suspended !== undefined) {
    updates.suspended_at = suspended ? new Date().toISOString() : null;
    updates.suspension_reason =
      suspended && typeof suspensionReason === "string" ? suspensionReason.trim() || "Manual suspension" : null;
  }

  const { error } = await context.supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update user." });
  }

  await logAdminAction({
    supabase: context.supabase,
    adminUserId: context.adminUserId,
    action: "admin.users.update",
    entityType: "profile",
    entityId: userId,
    beforeJson: existing,
    afterJson: updates,
  });

  return res.status(200).json({ ok: true });
}
