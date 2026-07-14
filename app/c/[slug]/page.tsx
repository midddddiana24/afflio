import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicCampaign } from "@/components/PublicCampaign";
import { validateDestinationUrl } from "@/lib/campaigns";
import { takeRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTrafficContext } from "@/lib/traffic";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

const getCampaign = cache(async (slug: string) => {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, title, caption, image_path, destination_url, status, platform_source, campaign_hotspots(id, label, destination_url, platform_source, x_percent, y_percent, width_percent, height_percent, sort_order)")
    .eq("slug", slug)
    .maybeSingle();

  return data;
});

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  return new URL(
    configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) return { title: "Afflio" };

  const title = campaign.title?.trim() || "Affiliate campaign";
  const description =
    campaign.caption?.trim() ||
    `View ${title} on Afflio and continue to the affiliate offer.`;
  const canonicalUrl = new URL(`/c/${encodeURIComponent(slug)}`, getSiteUrl());
  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-images/${campaign.image_path}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "Afflio",
      locale: "en_PH",
      title,
      description,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt: title }],
    },
  };
}

export default async function RedirectPage({ params }: Props) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);

  if (!campaign || campaign.status !== "active") {
    notFound();
  }

  const destination = validateDestinationUrl(campaign.destination_url);

  if (!destination.valid) {
    notFound();
  }

  const traffic = getTrafficContext(await headers());
  const rateKey = `c-slug:${slug}:${traffic.ip ?? traffic.userAgent.slice(0, 60)}`;
  const rateLimit = takeRateLimit(rateKey, 20, 60_000);

  if (!rateLimit.allowed) {
    return (
      <main className="redirect-preview wrap">
        <section className="redirect-preview__card">
          <p className="auth-eyebrow">AFFLIO RATE LIMIT</p>
          <h1>Too many requests for this campaign link.</h1>
          <p className="muted">
            Wait about {rateLimit.retryAfterSeconds} seconds, then try again. This protects affiliates from traffic loops and abuse bursts.
          </p>
        </section>
      </main>
    );
  }

  if (traffic.isBot || traffic.isPrefetch) {
    return (
      <main className="redirect-preview wrap">
        <section className="redirect-preview__card">
          <p className="auth-eyebrow">AFFLIO PREVIEW</p>
          <h1>{campaign.title ?? "Affiliate campaign"}</h1>
          <p className="muted">
            {campaign.caption ??
              "Trackable campaign preview generated for social crawlers and safe link previews."}
          </p>
          <div className="redirect-preview__meta">
            <span className="badge badge--active">
              {campaign.platform_source ?? "affiliate"}
            </span>
            <span className="muted">{destination.hostname}</span>
          </div>
          <Link className="btn btn-outline" href={destination.value}>
            Continue to destination
          </Link>
        </section>
      </main>
    );
  }

  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-images/${campaign.image_path}`;
  const hotspots = [...(campaign.campaign_hotspots ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return <PublicCampaign campaignId={campaign.id} caption={campaign.caption} destinationUrl={destination.value}
    hotspots={hotspots} imageUrl={imageUrl} platform={campaign.platform_source ?? "affiliate"}
    slug={slug} title={campaign.title ?? "Affiliate campaign"} />;
}
