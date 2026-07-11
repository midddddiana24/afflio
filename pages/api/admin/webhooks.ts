import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";

type ApiResponse = { ok: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const context = await requireAdminApi(req, res);
  if (!context) return;

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { webhookId, action } = req.body ?? {};

  if (typeof webhookId !== "string" || typeof action !== "string") {
    return res.status(400).json({ error: "Webhook id and action are required." });
  }

  const { data: existing } = await context.supabase
    .from("webhook_events")
    .select("status, error_message, processed_at, provider, event_type")
    .eq("id", webhookId)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ error: "Webhook event not found." });
  }

  let updates: Record<string, string | null>;

  if (action === "retry") {
    updates = {
      status: "pending",
      error_message: null,
      processed_at: null,
    };
  } else if (action === "markProcessed") {
    updates = {
      status: "processed",
      error_message: null,
      processed_at: new Date().toISOString(),
    };
  } else if (action === "markIgnored") {
    updates = {
      status: "ignored",
      processed_at: new Date().toISOString(),
      error_message: existing.error_message,
    };
  } else {
    return res.status(400).json({ error: "Webhook action is invalid." });
  }

  const { error } = await context.supabase
    .from("webhook_events")
    .update(updates)
    .eq("id", webhookId);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update webhook." });
  }

  await logAdminAction({
    supabase: context.supabase,
    adminUserId: context.adminUserId,
    action: `admin.webhooks.${action}`,
    entityType: "webhook_event",
    entityId: webhookId,
    beforeJson: existing,
    afterJson: updates,
  });

  return res.status(200).json({ ok: true });
}
