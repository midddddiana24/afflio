"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Head from "next/head";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError =
      (typeof router.query.error_description === "string" ? router.query.error_description : "") ||
      hashParams.get("error_description") ||
      (typeof router.query.error === "string" ? router.query.error : "") ||
      hashParams.get("error");

    if (authError) {
      setError(authError.replaceAll("+", " "));
      return;
    }

    const codeParam = router.query.code;
    const nextPath =
      typeof router.query.next === "string" && router.query.next.startsWith("/")
        ? router.query.next
        : "/dashboard";

    if (typeof codeParam !== "string") {
      router.replace("/login");
      return;
    }

    const code = codeParam;

    const supabase = createClient();

    async function exchange() {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      router.replace(nextPath);
    }

    exchange();
  }, [router]);

  return (
    <>
      <Head>
        <title>Confirming Account | Afflio</title>
      </Head>
      <section className="auth-shell wrap">
        <div className="auth-panel auth-panel--centered">
          <div className="auth-copy">
            <p className="auth-eyebrow">AFFLIO</p>
            <h1>Confirming your account.</h1>
            <p className="muted">
              {error || "We are finishing the secure sign-in handshake with Supabase."}
            </p>
            {error ? (
              <Link className="btn btn-outline" href="/signup?verification=expired">
                Request a new verification email
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
