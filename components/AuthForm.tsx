"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

function getNextPath(nextParam: string | string[] | undefined) {
  if (typeof nextParam !== "string" || !nextParam.startsWith("/")) {
    return "/dashboard";
  }

  return nextParam;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";
  const nextPath = getNextPath(router.query.next);

  useEffect(() => {
    if (typeof router.query.ref === "string") {
      setReferralCode(router.query.ref.trim().toLowerCase().slice(0, 32));
    }
  }, [router.query.ref]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setStatus("loading");
    setError("");
    setNotice("");

    if (isSignup) {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, referral_code: referralCode || undefined },
          emailRedirectTo: callbackUrl,
        },
      });

      if (signUpError) {
        setStatus("idle");
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        return;
      }

      setStatus("success");
      setNotice("Account created. Check your email to verify the account before logging in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setStatus("idle");
      setError(signInError.message);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <section className="auth-shell wrap">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="auth-eyebrow">AFFLIO</p>
          <h1>{isSignup ? "Create your affiliate workspace." : "Log back into your workspace."}</h1>
          <p className="muted">
            {isSignup
              ? "Start with the secure backend foundation: account, profile, protected dashboard, and admin-ready access control."
              : "Your campaigns, analytics, billing, and admin-approved access live behind this login."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="field">
              <span>Full name</span>
              <input
                autoComplete="name"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Juan Dela Cruz"
                required
                value={fullName}
              />
            </label>
          ) : null}

          {isSignup ? (
            <label className="field">
              <span>Friend referral code <small className="muted">(optional)</small></span>
              <input
                autoComplete="off"
                maxLength={32}
                name="referralCode"
                onChange={(event) => setReferralCode(event.target.value.trim().toLowerCase())}
                placeholder="Invite code"
                value={referralCode}
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {router.query.confirmed === "1" ? (
            <p className="auth-message auth-message-success">
              Email verified. You can log in now.
            </p>
          ) : null}

          {notice ? <p className="auth-message auth-message-success">{notice}</p> : null}
          {error ? <p className="auth-message auth-message-error">{error}</p> : null}

          <button className="btn btn-fill auth-submit" data-state={status} type="submit">
            <span className="spinner" />
            <span className="btn-label">
              {isSignup ? "Create account" : "Log in"}
            </span>
          </button>

          {!isSignup ? <Link className="auth-secondary-link" href="/forgot-password">Forgot password?</Link> : null}

          <p className="auth-switch muted">
            {isSignup ? "Already have an account?" : "Need an account?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Log in" : "Create one"}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
