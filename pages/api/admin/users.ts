import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

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

  const { userId, role, suspended, suspensionReason, creditDelta } = req.body ?? {};

  if (typeof userId !== "string") {
    return res.status(400).json({ error: "User id is required." });
  }

  const { data: existing } = await context.supabase
    .from("profiles")
    .select("role, suspended_at, suspension_reason, token_balance")
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

  if (creditDelta !== undefined) {
    if (!Number.isInteger(creditDelta) || creditDelta === 0 || Math.abs(creditDelta) > 10000) {
      return res.status(400).json({ error: "Credit adjustment must be a non-zero whole number up to 10,000." });
    }
    const serviceClient = createServiceRoleClient();
    const { data: balance, error: creditError } = await serviceClient.rpc("adjust_user_credits", {
      p_user_id: userId,
      p_amount: creditDelta,
    });
    if (creditError) {
      return res.status(400).json({ error: "Credit adjustment would create an invalid balance." });
    }
    await logAdminAction({
      supabase: context.supabase,
      adminUserId: context.adminUserId,
      action: "admin.users.credits.adjust",
      entityType: "profile",
      entityId: userId,
      beforeJson: { token_balance: existing.token_balance },
      afterJson: { token_balance: balance, adjustment: creditDelta },
    });
  }

  const { error } = Object.keys(updates).length
    ? await context.supabase.from("profiles").update(updates).eq("id", userId)
    : { error: null };

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update user." });
  }

  if (Object.keys(updates).length) {
    await logAdminAction({
      supabase: context.supabase,
      adminUserId: context.adminUserId,
      action: "admin.users.update",
      entityType: "profile",
      entityId: userId,
      beforeJson: existing,
      afterJson: updates,
    });
  }

  return res.status(200).json({ ok: true });
}
