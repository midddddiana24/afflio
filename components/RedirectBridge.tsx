"use client";

import { useEffect } from "react";

type RedirectBridgeProps = {
  campaignId: string;
  slug: string;
  destinationUrl: string;
};

export function RedirectBridge({
  campaignId,
  slug,
  destinationUrl,
}: RedirectBridgeProps) {
  useEffect(() => {
    const payload = JSON.stringify({ campaignId, slug });

    fetch("/api/clicks/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => {});

    const redirectTimer = window.setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 40);

    return () => window.clearTimeout(redirectTimer);
  }, [campaignId, destinationUrl, slug]);

  return (
    <main className="redirect-preview wrap">
      <section className="redirect-preview__card">
        <p className="auth-eyebrow">AFFLIO REDIRECT</p>
        <h1>Sending you to the product page.</h1>
        <p className="muted">
          We are logging the click in the background, then handing off to the affiliate destination.
        </p>
        <a className="btn btn-outline" href={destinationUrl}>
          Continue now
        </a>
      </section>
    </main>
  );
}
