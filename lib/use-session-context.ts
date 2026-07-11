"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

type SessionState = {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  error: string;
};

export function useSessionContext(options?: { requireAdmin?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    profile: null,
    error: "",
  });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          setState({
            loading: false,
            user: null,
            profile: null,
            error: userError.message,
          });
          return;
        }

        if (!user) {
          const next = encodeURIComponent(router.asPath || "/dashboard");
          router.replace(`/login?next=${next}`);
          return;
        }

        const { profile, error } = await loadProfile(supabase, user.id);

        if (options?.requireAdmin && profile?.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setState({
          loading: false,
          user,
          profile: profile ?? null,
          error: error ?? "",
        });
      } catch (error) {
        setState({
          loading: false,
          user: null,
          profile: null,
          error: error instanceof Error ? error.message : "Failed to load session context.",
        });
      }
    }

    void load();
  }, [options?.requireAdmin, router]);

  return state;
}
