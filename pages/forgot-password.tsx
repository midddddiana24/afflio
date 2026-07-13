"use client";

import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setMessage("If that email exists, a secure reset link has been sent."); setBusy(false);
  }

  return <><Head><title>Reset Password | Afflio</title></Head><section className="auth-shell wrap"><div className="auth-panel auth-panel--centered"><div className="auth-copy"><p className="auth-eyebrow">AFFLIO SECURITY</p><h1>Reset your password.</h1><p className="muted">We will email a one-time recovery link.</p></div><form className="auth-form" onSubmit={submit}><label className="field"><span>Email</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>{message ? <p className="auth-message auth-message-success">{message}</p> : null}<button className="btn btn-fill" disabled={busy} type="submit">{busy ? "Sending..." : "Send reset link"}</button><Link className="auth-secondary-link" href="/login">Back to login</Link></form></div></section></>;
}
