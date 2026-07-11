import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";

type ApiResponse = { ok: true; subscriptionId?: string } | { error: string };

const allowedStatuses = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

const allowedIntervals = new Set(["monthly", "yearly", "one_time"]);

function parseDateValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return "__invalid__";
  }

  return date.toISOString();
}

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

  const {
    subscriptionId,
    userId,
    planId,
    status,
    billingInterval,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = req.body ?? {};

  if (typeof planId !== "string") {
    return res.status(400).json({ error: "Plan id is required." });
  }

  if (typeof status !== "string" || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Subscription status is invalid." });
  }

  const interval =
    typeof billingInterval === "string" && allowedIntervals.has(billingInterval)
      ? billingInterval
      : "monthly";

  const parsedTrialEndsAt = parseDateValue(trialEndsAt);
  const parsedCurrentPeriodEnd = parseDateValue(currentPeriodEnd);

  if (parsedTrialEndsAt === "__invalid__" || parsedCurrentPeriodEnd === "__invalid__") {
    return res.status(400).json({ error: "One of the provided dates is invalid." });
  }

  if (typeof subscriptionId === "string") {
    const { data: existing } = await context.supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, status, billing_interval, trial_ends_at, current_period_end, cancel_at_period_end")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const updates = {
      plan_id: planId,
      status,
      billing_interval: interval,
      trial_ends_at: parsedTrialEndsAt,
      current_period_end: parsedCurrentPeriodEnd,
      cancel_at_period_end: Boolean(cancelAtPeriodEnd),
      canceled_at: status === "canceled" ? new Date().toISOString() : null,
    };

    const { error } = await context.supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", subscriptionId);

    if (error) {
      return res.status(500).json({ error: error.message || "Failed to update subscription." });
    }

    await logAdminAction({
      supabase: context.supabase,
      adminUserId: context.adminUserId,
      action: "admin.subscriptions.update",
      entityType: "subscription",
      entityId: subscriptionId,
      beforeJson: existing,
      afterJson: updates,
    });

    return res.status(200).json({ ok: true, subscriptionId });
  }

  if (typeof userId !== "string") {
    return res.status(400).json({ error: "User id is required when creating a subscription." });
  }

  const payload = {
    user_id: userId,
    plan_id: planId,
    provider: "manual" as const,
    status,
    billing_interval: interval,
    current_period_start: new Date().toISOString(),
    current_period_end: parsedCurrentPeriodEnd,
    trial_ends_at: parsedTrialEndsAt,
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),
    metadata: { source: "admin_manual_adjustment" },
  };

  const { data: created, error } = await context.supabase
    .from("subscriptions")
    .insert(payload)
    .select("id")
    .single();

  if (error || !created) {
    return res.status(500).json({ error: error?.message || "Failed to create subscription." });
  }

  await logAdminAction({
    supabase: context.supabase,
    adminUserId: context.adminUserId,
    action: "admin.subscriptions.create",
    entityType: "subscription",
    entityId: created.id,
    beforeJson: null,
    afterJson: payload,
  });

  return res.status(200).json({ ok: true, subscriptionId: created.id });
}
