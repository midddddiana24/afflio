import type { NextApiResponse } from "next";
import type { createPagesServerClient } from "@/lib/supabase/pages-server";

export async function requireActiveProfile(
  supabase: ReturnType<typeof createPagesServerClient>,
  userId: string,
  res: NextApiResponse
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_at, suspension_reason")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.suspended_at) {
    res.status(403).json({
      error: profile.suspension_reason || "Your account is currently suspended.",
    });
    return null;
  }

  return profile;
}

export async function ensureDomainAllowed(
  supabase: ReturnType<typeof createPagesServerClient>,
  hostname: string
) {
  const { data } = await supabase
    .from("banned_domains")
    .select("domain")
    .eq("is_active", true);

  const blockedDomains = (data ?? []).map((item) => item.domain.toLowerCase());

  return !blockedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}
