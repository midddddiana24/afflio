import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string | null;
  role: "client" | "admin";
  token_balance: number;
  created_at: string | null;
};

export async function getSessionContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, token_balance, created_at")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
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
