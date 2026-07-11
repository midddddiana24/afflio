import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@/lib/supabase/pages-server";

export type AdminContext = {
  supabase: ReturnType<typeof createPagesServerClient>;
  adminUserId: string;
};

export async function requireAdminApi(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminContext | null> {
  const supabase = createPagesServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    res.status(401).json({ error: "You must be logged in." });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }

  return {
    supabase,
    adminUserId: user.id,
  };
}

export async function logAdminAction(input: {
  supabase: ReturnType<typeof createPagesServerClient>;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}) {
  await input.supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_json: input.beforeJson ?? null,
    after_json: input.afterJson ?? null,
  });
}
