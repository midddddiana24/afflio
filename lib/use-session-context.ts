"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

type SessionState = {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
};

export function useSessionContext(options?: { requireAdmin?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    profile: null,
  });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const next = encodeURIComponent(router.asPath || "/dashboard");
        router.replace(`/login?next=${next}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, role, token_balance, created_at")
        .eq("id", user.id)
        .single();

      if (options?.requireAdmin && profile?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setState({
        loading: false,
        user,
        profile: (profile as Profile | null) ?? null,
      });
    }

    load();
  }, [options?.requireAdmin, router]);

  return state;
}
