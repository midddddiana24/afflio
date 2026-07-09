"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_UPLOAD_LIMIT_BYTES,
  createStoragePath,
} from "@/lib/campaigns";
import type { Profile } from "@/lib/auth";

type CampaignRow = {
  id: string;
  slug: string;
  title: string | null;
  caption: string | null;
  destination_url: string;
  image_path: string;
  platform_source: string | null;
  status: string;
  created_at: string;
};

type CampaignComposerProps = {
  profile: Profile;
};

export function CampaignComposer({ profile }: CampaignComposerProps) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [platformSource, setPlatformSource] = useState("tiktok");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadCampaigns() {
      const { data } = await supabase
        .from("campaigns")
        .select("id, slug, title, caption, destination_url, image_path, platform_source, status, created_at")
        .order("created_at", { ascending: false })
        .limit(12);

      setCampaigns(data ?? []);
      setLoadingCampaigns(false);
    }

    loadCampaigns();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!file) {
      setSubmitting(false);
      setError("Select a JPG, PNG, or WebP image before creating the campaign.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSubmitting(false);
      setError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) {
      setSubmitting(false);
      setError("Images must be 10MB or smaller.");
      return;
    }

    const supabase = createClient();
    const storagePath = createStoragePath(profile.id, file.name);

    const uploadResult = await supabase.storage
      .from("campaign-images")
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      setSubmitting(false);
      setError(uploadResult.error.message);
      return;
    }

    const response = await fetch("/api/campaigns/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        caption,
        destinationUrl,
        platformSource,
        imagePath: storagePath,
      }),
    });

    const payload = (await response.json()) as { error?: string; campaign?: CampaignRow };

    if (!response.ok || !payload.campaign) {
      setSubmitting(false);
      setError(payload.error || "Failed to create campaign.");
      return;
    }

    setCampaigns((current) => [payload.campaign!, ...current]);
    setTitle("");
    setCaption("");
    setDestinationUrl("");
    setPlatformSource("tiktok");
    setFile(null);
    setSubmitting(false);
    setSuccess(`Campaign created at /c/${payload.campaign.slug}`);
  }

  return (
    <div className="app-grid app-grid--two">
      <section className="app-card">
        <p className="app-topbar__eyebrow">Create campaign</p>
        <h2>Publish a clickable affiliate card</h2>
        <p className="muted">
          This flow uploads the image into Supabase Storage first, then creates the campaign through an authenticated API route.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Product title</span>
            <input
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Matte tumbler, 500ml"
              value={title}
            />
          </label>

          <label className="field">
            <span>Destination URL</span>
            <input
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder="https://shopee.ph/..."
              required
              type="url"
              value={destinationUrl}
            />
          </label>

          <label className="field">
            <span>Caption</span>
            <input
              maxLength={280}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Your short campaign message"
              value={caption}
            />
          </label>

          <label className="field">
            <span>Platform source</span>
            <select
              className="field-select"
              onChange={(event) => setPlatformSource(event.target.value)}
              value={platformSource}
            >
              <option value="tiktok">TikTok</option>
              <option value="shopee">Shopee</option>
              <option value="lazada">Lazada</option>
              <option value="facebook">Facebook</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="field">
            <span>Campaign image</span>
            <input
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
          </label>

          {success ? <p className="auth-message auth-message-success">{success}</p> : null}
          {error ? <p className="auth-message auth-message-error">{error}</p> : null}

          <button className="btn btn-fill auth-submit" disabled={submitting} type="submit">
            {submitting ? "Creating campaign..." : "Create campaign"}
          </button>
        </form>
      </section>

      <section className="app-card">
        <p className="app-topbar__eyebrow">Saved campaigns</p>
        <h2>Recent campaign records</h2>
        {loadingCampaigns ? (
          <p className="muted">Loading campaigns...</p>
        ) : campaigns.length ? (
          <div className="data-list">
            {campaigns.map((campaign) => (
              <div className="data-list__row data-list__row--stacked" key={campaign.id}>
                <div>
                  <strong>{campaign.title || "Untitled campaign"}</strong>
                  <p className="muted">{campaign.destination_url}</p>
                  <p className="muted">/c/{campaign.slug}</p>
                </div>
                <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No campaigns yet.</p>
        )}
      </section>
    </div>
  );
}
