"use client";

import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const { error: updateError } = await createClient().auth.updateUser({ password }); if (updateError) { setError(updateError.message); setBusy(false); return; } router.replace("/dashboard/settings?password=updated"); }
  return <><Head><title>Choose New Password | Afflio</title></Head><section className="auth-shell wrap"><div className="auth-panel auth-panel--centered"><div className="auth-copy"><p className="auth-eyebrow">AFFLIO SECURITY</p><h1>Choose a new password.</h1><p className="muted">Use at least eight characters and avoid a password used elsewhere.</p></div><form className="auth-form" onSubmit={submit}><label className="field"><span>New password</span><input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>{error ? <p className="auth-message auth-message-error">{error}</p> : null}<button className="btn btn-fill" disabled={busy} type="submit">{busy ? "Updating..." : "Update password"}</button></form></div></section></>;
}
