import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RedirectBridge } from "@/components/RedirectBridge";
import { validateDestinationUrl } from "@/lib/campaigns";
import { takeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getTrafficContext } from "@/lib/traffic";

type Props = { params: { slug: string } };

export const dynamic = "force-dynamic";

async function getCampaign(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, title, caption, image_path, destination_url, status, platform_source")
    .eq("slug", slug)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await getCampaign(params.slug);
  if (!campaign) return { title: "Afflio" };

  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-images/${campaign.image_path}`;

  return {
    title: campaign.title ?? "Afflio",
    description: campaign.caption ?? undefined,
    openGraph: {
      title: campaign.title ?? "Afflio",
      description: campaign.caption ?? undefined,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.title ?? "Afflio",
      images: [imageUrl],
    },
  };
}

export default async function RedirectPage({ params }: Props) {
  const campaign = await getCampaign(params.slug);

  if (!campaign || campaign.status !== "active") {
    notFound();
  }

  const destination = validateDestinationUrl(campaign.destination_url);

  if (!destination.valid) {
    notFound();
  }

  const traffic = getTrafficContext(headers());
  const rateKey = `c-slug:${params.slug}:${traffic.ip ?? traffic.userAgent.slice(0, 60)}`;
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

  return (
    <RedirectBridge
      campaignId={campaign.id}
      destinationUrl={destination.value}
      slug={params.slug}
    />
  );
}
