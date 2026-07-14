import { createHmac } from "crypto";

export function hashIp(ip: string | null) {
  const secret = process.env.CLICK_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!ip || !secret) {
    return null;
  }

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function sanitizeUserAgent(userAgent: string) {
  const trimmed = userAgent.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

export function sanitizeReferrer(referrer: string | null) {
  if (!referrer) {
    return null;
  }

  return referrer.slice(0, 500);
}
