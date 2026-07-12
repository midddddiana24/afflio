import type { SupabaseClient } from "@supabase/supabase-js";

export type EffectivePlan = {
  code: string;
  name: string;
  campaign_limit: number;
  monthly_click_limit: number;
  included_credits: number;
  hotspot_limit: number;
  qr_enabled: boolean;
  analytics_export_enabled: boolean;
  custom_branding_enabled: boolean;
};

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"];

export async function getEffectivePlanForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<EffectivePlan | null> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "status, current_period_end, plan:plans(code, name, campaign_limit, monthly_click_limit, included_credits, hotspot_limit, qr_enabled, analytics_export_enabled, custom_branding_enabled)"
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_SUBSCRIPTION_STATUSES)
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const activePlan = normalizePlan(subscription?.plan);

  if (activePlan) {
    return activePlan;
  }

  const { data: freePlan } = await supabase
    .from("plans")
    .select("code, name, campaign_limit, monthly_click_limit, included_credits, hotspot_limit, qr_enabled, analytics_export_enabled, custom_branding_enabled")
    .eq("code", "free")
    .maybeSingle();

  return normalizePlan(freePlan);
}

function normalizePlan(plan: unknown): EffectivePlan | null {
  if (!plan || Array.isArray(plan) || typeof plan !== "object") {
    return null;
  }

  const candidate = plan as Record<string, unknown>;
  if (
    typeof candidate.code !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.campaign_limit !== "number" ||
    typeof candidate.monthly_click_limit !== "number" ||
    typeof candidate.included_credits !== "number" ||
    typeof candidate.hotspot_limit !== "number" ||
    typeof candidate.qr_enabled !== "boolean" ||
    typeof candidate.analytics_export_enabled !== "boolean" ||
    typeof candidate.custom_branding_enabled !== "boolean"
  ) {
    return null;
  }

  return {
    code: candidate.code,
    name: candidate.name,
    campaign_limit: candidate.campaign_limit,
    monthly_click_limit: candidate.monthly_click_limit,
    included_credits: candidate.included_credits,
    hotspot_limit: candidate.hotspot_limit,
    qr_enabled: candidate.qr_enabled,
    analytics_export_enabled: candidate.analytics_export_enabled,
    custom_branding_enabled: candidate.custom_branding_enabled,
  };
}
