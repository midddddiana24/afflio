import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";

const fullProfileSelect =
  "id, display_name, role, token_balance, created_at, suspended_at, suspension_reason";
const legacyProfileSelect = "id, display_name, role, token_balance, created_at";

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: Profile | null; error: string | null }> {
  const primary = await supabase
    .from("profiles")
    .select(fullProfileSelect)
    .eq("id", userId)
    .single();

  if (!primary.error && primary.data) {
    return {
      profile: primary.data as Profile,
      error: null,
    };
  }

  const shouldFallback =
    primary.error?.message?.includes("suspended_at") ||
    primary.error?.message?.includes("suspension_reason") ||
    primary.error?.message?.includes("column");

  if (!shouldFallback) {
    return {
      profile: null,
      error: primary.error?.message || "Failed to load profile.",
    };
  }

  const fallback = await supabase
    .from("profiles")
    .select(legacyProfileSelect)
    .eq("id", userId)
    .single();

  if (fallback.error || !fallback.data) {
    return {
      profile: null,
      error: fallback.error?.message || primary.error?.message || "Failed to load profile.",
    };
  }

  return {
    profile: {
      ...(fallback.data as Profile),
      suspended_at: null,
      suspension_reason: null,
    },
    error: null,
  };
}
