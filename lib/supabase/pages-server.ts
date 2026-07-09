import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createPagesServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookie = serializeCookie(name, value, options);
          const existing = res.getHeader("Set-Cookie");
          const nextCookies = Array.isArray(existing)
            ? [...existing, cookie]
            : existing
              ? [String(existing), cookie]
              : [cookie];
          res.setHeader("Set-Cookie", nextCookies);
        },
        remove(name: string, options: CookieOptions) {
          const cookie = serializeCookie(name, "", { ...options, maxAge: 0 });
          const existing = res.getHeader("Set-Cookie");
          const nextCookies = Array.isArray(existing)
            ? [...existing, cookie]
            : existing
              ? [String(existing), cookie]
              : [cookie];
          res.setHeader("Set-Cookie", nextCookies);
        },
      },
    }
  );
}

function serializeCookie(name: string, value: string, options: CookieOptions) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${options.maxAge}`);
  }

  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  if (options.path) {
    segments.push(`Path=${options.path}`);
  }

  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    segments.push("Secure");
  }

  return segments.join("; ");
}
