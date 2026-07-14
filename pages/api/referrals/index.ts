import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@/lib/supabase/pages-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authClient = createPagesServerClient(req, res);
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return res.status(401).json({ error: "You must be logged in." });

  const admin = createServiceRoleClient();
  const [{ data: profile }, { data: referrals }, { data: transactions }, { data: subscriptions }] = await Promise.all([
    admin.from("profiles").select("referral_code, token_balance").eq("id", user.id).single(),
    admin.from("referrals").select("id, referred_user_id, status, referrer_reward, created_at, rewarded_at")
      .eq("referrer_id", user.id).order("created_at", { ascending: false }),
    admin.from("token_transactions").select("id, amount, type, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    admin.from("subscriptions").select("status, current_period_end, plan:plans(code, name)")
      .eq("user_id", user.id).in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false, nullsFirst: false }),
  ]);

  if (!profile) return res.status(404).json({ error: "Profile not found." });

  const friendIds = (referrals ?? []).map((item: { referred_user_id: string }) => item.referred_user_id);
  const { data: friends } = friendIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", friendIds)
    : { data: [] };
  const names = new Map((friends ?? []).map((friend: { id: string; display_name: string | null }) => [friend.id, friend.display_name]));
  const paidSubscription = (subscriptions ?? []).find((subscription: {
    current_period_end: string | null;
    plan: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
  }) => {
    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan;
    const periodIsCurrent = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    return Boolean(plan?.code && plan.code !== "free" && periodIsCurrent);
  });
  const paidPlan = paidSubscription
    ? (Array.isArray(paidSubscription.plan) ? paidSubscription.plan[0] : paidSubscription.plan)
    : null;
  const referralEnabled = Boolean(paidPlan);

  return res.status(200).json({
    referralEnabled,
    currentPlan: paidPlan?.name || "Free",
    referralCode: referralEnabled ? profile.referral_code : null,
    tokenBalance: profile.token_balance,
    referrals: (referrals ?? []).map((item: { referred_user_id: string; [key: string]: unknown }) => ({
      ...item,
      friendName: names.get(item.referred_user_id) || "Afflio friend",
    })),
    transactions: transactions ?? [],
  });
}
