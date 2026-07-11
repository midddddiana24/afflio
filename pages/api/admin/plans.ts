import type { NextApiRequest, NextApiResponse } from "next";
import { logAdminAction, requireAdminApi } from "@/lib/admin";

type ApiResponse = { ok: true; planId?: string } | { error: string };

function parseIntValue(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return Math.trunc(parsed);
}

function parseMoneyValue(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative amount.`);
  }
  return parsed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const context = await requireAdminApi(req, res);
  if (!context) return;

  try {
    if (req.method === "POST") {
      const {
        code,
        name,
        description,
        monthlyPricePhp,
        yearlyPricePhp,
        campaignLimit,
        monthlyClickLimit,
        includedCredits,
        teamSeatLimit,
        isActive,
        isPublic,
      } = req.body ?? {};

      if (typeof code !== "string" || typeof name !== "string") {
        return res.status(400).json({ error: "Plan code and name are required." });
      }

      const payload = {
        code: code.trim().toLowerCase(),
        name: name.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        monthly_price_php: parseMoneyValue(monthlyPricePhp ?? 0, "Monthly price"),
        yearly_price_php:
          yearlyPricePhp === null || yearlyPricePhp === undefined || yearlyPricePhp === ""
            ? null
            : parseMoneyValue(yearlyPricePhp, "Yearly price"),
        campaign_limit: parseIntValue(campaignLimit ?? 0, "Campaign limit"),
        monthly_click_limit: parseIntValue(monthlyClickLimit ?? 0, "Monthly click limit"),
        included_credits: parseIntValue(includedCredits ?? 0, "Included credits"),
        team_seat_limit: Math.max(1, parseIntValue(teamSeatLimit ?? 1, "Team seat limit")),
        is_active: Boolean(isActive),
        is_public: Boolean(isPublic),
      };

      const { data: created, error } = await context.supabase
        .from("plans")
        .insert(payload)
        .select("id")
        .single();

      if (error || !created) {
        return res.status(500).json({ error: error?.message || "Failed to create plan." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.plans.create",
        entityType: "plan",
        entityId: created.id,
        beforeJson: null,
        afterJson: payload,
      });

      return res.status(200).json({ ok: true, planId: created.id });
    }

    if (req.method === "PATCH") {
      const {
        planId,
        name,
        description,
        monthlyPricePhp,
        yearlyPricePhp,
        campaignLimit,
        monthlyClickLimit,
        includedCredits,
        teamSeatLimit,
        isActive,
        isPublic,
      } = req.body ?? {};

      if (typeof planId !== "string") {
        return res.status(400).json({ error: "Plan id is required." });
      }

      const { data: existing } = await context.supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ error: "Plan not found." });
      }

      const updates = {
        name: typeof name === "string" ? name.trim() : existing.name,
        description:
          typeof description === "string" ? description.trim() || null : existing.description,
        monthly_price_php: parseMoneyValue(monthlyPricePhp ?? existing.monthly_price_php, "Monthly price"),
        yearly_price_php:
          yearlyPricePhp === ""
            ? null
            : yearlyPricePhp === undefined
              ? existing.yearly_price_php
              : parseMoneyValue(yearlyPricePhp, "Yearly price"),
        campaign_limit: parseIntValue(campaignLimit ?? existing.campaign_limit, "Campaign limit"),
        monthly_click_limit: parseIntValue(
          monthlyClickLimit ?? existing.monthly_click_limit,
          "Monthly click limit"
        ),
        included_credits: parseIntValue(
          includedCredits ?? existing.included_credits,
          "Included credits"
        ),
        team_seat_limit: Math.max(
          1,
          parseIntValue(teamSeatLimit ?? existing.team_seat_limit, "Team seat limit")
        ),
        is_active: isActive === undefined ? existing.is_active : Boolean(isActive),
        is_public: isPublic === undefined ? existing.is_public : Boolean(isPublic),
      };

      const { error } = await context.supabase.from("plans").update(updates).eq("id", planId);

      if (error) {
        return res.status(500).json({ error: error.message || "Failed to update plan." });
      }

      await logAdminAction({
        supabase: context.supabase,
        adminUserId: context.adminUserId,
        action: "admin.plans.update",
        entityType: "plan",
        entityId: planId,
        beforeJson: existing,
        afterJson: updates,
      });

      return res.status(200).json({ ok: true, planId });
    }

    res.setHeader("Allow", "POST, PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid plan input.",
    });
  }
}
