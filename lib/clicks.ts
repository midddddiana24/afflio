import { createHash } from "crypto";

export function hashIp(ip: string | null) {
  if (!ip) {
    return null;
  }

  return createHash("sha256").update(ip).digest("hex");
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
