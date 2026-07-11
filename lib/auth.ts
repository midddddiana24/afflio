import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string | null;
  role: "client" | "admin";
  token_balance: number;
  created_at: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
};

export async function getSessionContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { profile } = await loadProfile(supabase, user.id);

  return {
    supabase,
    user,
    profile,
  };
}

export async function requireUser() {
  const context = await getSessionContext();

  if (!context.user) {
    redirect("/login");
  }

  return context;
}

export async function requireAdmin() {
  const context = await requireUser();

  if (context.profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return context;
}
