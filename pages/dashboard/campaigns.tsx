"use client";

import Head from "next/head";
import { AppShell } from "@/components/AppShell";
import { CampaignComposer } from "@/components/CampaignComposer";
import { useSessionContext } from "@/lib/use-session-context";

export default function CampaignsPage() {
  const { loading, profile } = useSessionContext();

  if (loading || !profile) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Campaigns | Afflio</title>
      </Head>
      <AppShell
        area="dashboard"
        profile={profile}
        subtitle="Create campaigns through a validated API route backed by Supabase Storage and authenticated inserts."
        title="Campaign management"
      >
        <CampaignComposer profile={profile} />
      </AppShell>
    </>
  );
}
