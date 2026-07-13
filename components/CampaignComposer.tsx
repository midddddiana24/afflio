"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_UPLOAD_LIMIT_BYTES,
  createStoragePath,
} from "@/lib/campaigns";
import type { Profile } from "@/lib/auth";
import type { CampaignHotspotInput } from "@/lib/hotspots";
import { HotspotEditor } from "@/components/HotspotEditor";

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
  campaign_hotspots?: Array<{
    id: string; label: string; destination_url: string; platform_source: string | null;
    x_percent: number; y_percent: number; width_percent: number; height_percent: number; sort_order: number;
  }>;
};

type ClickRow = {
  campaign_id: string;
  is_unique: boolean;
  referrer: string | null;
  clicked_at?: string;
};

type CampaignCard = CampaignRow & {
  imageUrl: string;
  publicUrl: string;
  totalClicks: number;
  uniqueClicks: number;
  topReferrer: string;
  lastClickedAt: string | null;
};

type CampaignComposerProps = {
  profile: Profile;
};

type FilterStatus = "all" | "active" | "paused" | "archived";

const filterOptions: FilterStatus[] = ["all", "active", "paused", "archived"];

export function CampaignComposer({ profile }: CampaignComposerProps) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [platformSource, setPlatformSource] = useState("tiktok");
  const [file, setFile] = useState<File | null>(null);
  const [hotspots, setHotspots] = useState<CampaignHotspotInput[]>([]);
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [manageOpenId, setManageOpenId] = useState("");
  const [shareOpenId, setShareOpenId] = useState("");
  const [qrOpenId, setQrOpenId] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editHotspots, setEditHotspots] = useState<CampaignHotspotInput[]>([]);
  const [editForm, setEditForm] = useState({
    title: "",
    caption: "",
    destinationUrl: "",
    platformSource: "tiktok",
    slug: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState("");

  const selectedFilePreview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const editImagePreview = useMemo(() => (editImageFile ? URL.createObjectURL(editImageFile) : ""), [editImageFile]);

  const platformOptions = useMemo(() => {
    const allPlatforms = new Set(campaigns.map((campaign) => campaign.platform_source || "other"));
    return ["all", ...Array.from(allPlatforms)];
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const statusMatches = selectedStatus === "all" || campaign.status === selectedStatus;
      const platformMatches =
        selectedPlatform === "all" ||
        (campaign.platform_source || "other") === selectedPlatform;

      return statusMatches && platformMatches;
    });
  }, [campaigns, selectedPlatform, selectedStatus]);

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    return () => {
      if (selectedFilePreview) URL.revokeObjectURL(selectedFilePreview);
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    };
  }, [selectedFilePreview, editImagePreview]);

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    const supabase = createClient();

    const { data: campaignRows, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, slug, title, caption, destination_url, image_path, platform_source, status, created_at, campaign_hotspots(id, label, destination_url, platform_source, x_percent, y_percent, width_percent, height_percent, sort_order)")
      .order("created_at", { ascending: false })
      .limit(24);

    if (campaignError || !campaignRows) {
      setCampaigns([]);
      setLoadingCampaigns(false);
      return;
    }

    const campaignIds = campaignRows.map((campaign) => campaign.id);
    let clickRows: ClickRow[] = [];

    if (campaignIds.length) {
      const { data: clicksData } = await supabase
        .from("clicks")
        .select("campaign_id, is_unique, referrer, clicked_at")
        .in("campaign_id", campaignIds);

      clickRows = (clicksData as ClickRow[] | null) ?? [];
    }

    const clickMap = new Map<
      string,
      { total: number; unique: number; referrers: Map<string, number>; lastClickedAt: string | null }
    >();

    for (const click of clickRows) {
      const current =
        clickMap.get(click.campaign_id) ??
        { total: 0, unique: 0, referrers: new Map<string, number>(), lastClickedAt: null };
      current.total += 1;
      if (click.is_unique) current.unique += 1;
      const referrerKey = extractReferrerLabel(click.referrer);
      current.referrers.set(referrerKey, (current.referrers.get(referrerKey) ?? 0) + 1);
      if (click.clicked_at && (!current.lastClickedAt || click.clicked_at > current.lastClickedAt)) {
        current.lastClickedAt = click.clicked_at;
      }
      clickMap.set(click.campaign_id, current);
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const cards = campaignRows.map((campaign) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("campaign-images").getPublicUrl(campaign.image_path);
      const stats = clickMap.get(campaign.id) ?? {
        total: 0,
        unique: 0,
        referrers: new Map<string, number>(),
        lastClickedAt: null,
      };

      const topReferrer =
        Array.from(stats.referrers.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Direct";

      return {
        ...campaign,
        imageUrl: publicUrl,
        publicUrl: `${origin}/c/${campaign.slug}`,
        totalClicks: stats.total,
        uniqueClicks: stats.unique,
        topReferrer,
        lastClickedAt: stats.lastClickedAt,
      };
    });

    setCampaigns(cards);
    setLoadingCampaigns(false);
  }

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

    const uploadedPath = await uploadCampaignImage(profile.id, file);
    if (!uploadedPath) {
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/campaigns/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        caption,
        destinationUrl,
        platformSource,
        imagePath: uploadedPath,
        hotspots,
        publish: publishOnCreate,
      }),
    });

    const payload = (await response.json()) as { error?: string; campaign?: CampaignRow };

    if (!response.ok || !payload.campaign) {
      setSubmitting(false);
      setError(payload.error || "Failed to create campaign.");
      return;
    }

    setTitle("");
    setCaption("");
    setDestinationUrl("");
    setPlatformSource("tiktok");
    setFile(null);
    setHotspots([]);
    setSubmitting(false);
    setSuccess(`Campaign created. Test it at /c/${payload.campaign.slug}`);
    await loadCampaigns();
  }

  async function uploadCampaignImage(userId: string, imageFile: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      return null;
    }

    if (imageFile.size > IMAGE_UPLOAD_LIMIT_BYTES) {
      setError("Images must be 10MB or smaller.");
      return null;
    }

    const supabase = createClient();
    const storagePath = createStoragePath(userId, imageFile.name);
    const uploadResult = await supabase.storage.from("campaign-images").upload(storagePath, imageFile, {
      cacheControl: "3600",
      contentType: imageFile.type,
      upsert: false,
    });

    if (uploadResult.error) {
      setError(uploadResult.error.message);
      return null;
    }

    return storagePath;
  }

  async function patchCampaign(id: string, body: Record<string, string>) {
    const response = await fetch("/api/campaigns/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "Failed to update campaign.");
    }
  }

  function startEdit(campaign: CampaignCard) {
    setEditingId(campaign.id);
    setManageOpenId("");
    setEditImageFile(null);
    setEditHotspots([...(campaign.campaign_hotspots ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((hotspot) => ({
      id: hotspot.id, label: hotspot.label, destinationUrl: hotspot.destination_url,
      platformSource: hotspot.platform_source || "other", xPercent: hotspot.x_percent,
      yPercent: hotspot.y_percent, widthPercent: hotspot.width_percent, heightPercent: hotspot.height_percent,
    })));
    setEditForm({
      title: campaign.title || "",
      caption: campaign.caption || "",
      destinationUrl: campaign.destination_url,
      platformSource: campaign.platform_source || "other",
      slug: campaign.slug,
    });
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    const existing = campaigns.find((campaign) => campaign.id === editingId);
    if (!existing) return;

    setSavingEdit(true);
    setError("");

    try {
      let replacementImagePath = "";

      if (editImageFile) {
        const uploadedPath = await uploadCampaignImage(profile.id, editImageFile);
        if (!uploadedPath) {
          setSavingEdit(false);
          return;
        }
        replacementImagePath = uploadedPath;
      }

      await patchCampaign(editingId, {
        title: editForm.title,
        caption: editForm.caption,
        destinationUrl: editForm.destinationUrl,
        platformSource: editForm.platformSource,
        slug: editForm.slug,
        ...(replacementImagePath
          ? { imagePath: replacementImagePath, oldImagePath: existing.image_path }
          : {}),
      });

      const hotspotResponse = await fetch("/api/campaigns/hotspots", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: editingId, hotspots: editHotspots }),
      });
      const hotspotPayload = await hotspotResponse.json() as { error?: string };
      if (!hotspotResponse.ok) throw new Error(hotspotPayload.error || "Failed to save hotspots.");

      setEditingId("");
      setEditImageFile(null);
      setSuccess("Campaign updated.");
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update campaign.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function changeStatus(campaign: CampaignCard, nextStatus: "active" | "paused" | "archived") {
    setBusyId(`${campaign.id}:${nextStatus}`);
    setManageOpenId("");
    setError("");

    try {
      await patchCampaign(campaign.id, { status: nextStatus });
      setSuccess(`Campaign marked as ${nextStatus}.`);
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change campaign status.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteCampaign(campaign: CampaignCard) {
    const confirmed = window.confirm(`Delete "${campaign.title || campaign.slug}" permanently?`);
    if (!confirmed) return;

    setBusyId(`${campaign.id}:delete`);
    setManageOpenId("");
    setError("");

    try {
      const response = await fetch("/api/campaigns/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaign.id }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to delete campaign (${response.status}).`);
      }
      setSuccess("Campaign deleted.");
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaign.");
    } finally {
      setBusyId("");
    }
  }

  async function duplicateCampaign(campaign: CampaignCard) {
    setBusyId(`${campaign.id}:duplicate`);
    setManageOpenId("");
    setError("");
    const response = await fetch("/api/campaigns/duplicate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) setError(payload.error || "Failed to duplicate campaign.");
    else { setSuccess("Campaign duplicated as a draft."); await loadCampaigns(); }
    setBusyId("");
  }

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1600);
    } catch {
      setError("Unable to copy text to the clipboard.");
    }
  }

  async function nativeShare(campaign: CampaignCard) {
    const shareText = buildShareText(campaign);
    if (!navigator.share) {
      await copyText(shareText, `share-${campaign.id}`);
      return;
    }

    try {
      await navigator.share({
        title: campaign.title || "Afflio campaign",
        text: campaign.caption || "Check this campaign",
        url: campaign.publicUrl,
      });
    } catch {
      // ignore cancel
    }
  }

  return (
    <div className="campaign-layout">
      <section className="app-card campaign-form-card">
        <div className="section-head campaign-form-head">
          <div>
            <p className="app-topbar__eyebrow">Create campaign</p>
            <h2>Build a shareable affiliate card</h2>
          </div>
          <button className="btn btn-outline" onClick={() => void loadCampaigns()} type="button">
            Refresh campaigns
          </button>
        </div>

        <div className="campaign-form-grid">
          <form className="auth-form" id="create-campaign-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Product title</span>
              <input maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Matte tumbler, 500ml" value={title} />
            </label>

            <label className="field" data-invalid={destinationUrl.length > 0 && !isLikelyUrl(destinationUrl)}>
              <span>Destination URL</span>
              <input onChange={(event) => setDestinationUrl(event.target.value)} placeholder="https://shopee.ph/..." required type="url" value={destinationUrl} />
              {destinationUrl.length > 0 && !isLikelyUrl(destinationUrl) ? (
                <span className="field-hint" data-tone="error">Needs to start with https:// — paste the full affiliate link.</span>
              ) : null}
            </label>

            <label className="field">
              <span>Caption</span>
              <textarea className="field-textarea" maxLength={280} onChange={(event) => setCaption(event.target.value)} placeholder="Short sales caption or offer message" rows={4} value={caption} />
            </label>

            <div className="campaign-form-row">
              <label className="field">
                <span>Platform source</span>
                <select className="field-select" onChange={(event) => setPlatformSource(event.target.value)} value={platformSource}>
                  <option value="tiktok">TikTok</option>
                  <option value="shopee">Shopee</option>
                  <option value="lazada">Lazada</option>
                  <option value="facebook">Facebook</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="field">
                <span>Campaign image</span>
                <input accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" />
              </label>
            </div>

            {success ? <p className="auth-message auth-message-success">{success}</p> : null}
            {error ? <p className="auth-message auth-message-error">{error}</p> : null}

            <button className="btn btn-fill auth-submit" disabled={submitting} type="submit">
              {submitting ? "Creating campaign..." : "Create campaign"}
            </button>
          </form>

          <aside className="campaign-preview">
            <p className="app-topbar__eyebrow">Live preview</p>
            <div className="campaign-preview__card">
              <div className="campaign-preview__image">
                {selectedFilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Campaign preview" src={selectedFilePreview} />
                ) : (
                  <div className="campaign-preview__placeholder">Upload an image to preview the card</div>
                )}
              </div>
              <div className="campaign-preview__body">
                <span className="badge badge--active">{platformSource}</span>
                <h3>{title || "Your campaign title will appear here"}</h3>
                <p className="muted">{caption || "Your caption or short promo line will appear here once you type it."}</p>
                <p className="campaign-preview__domain">{destinationUrl || "https://your-destination-link.example"}</p>
              </div>
            </div>
          </aside>
        </div>

        {selectedFilePreview ? (
          <div className="campaign-builder-step">
            <div className="section-head">
              <div>
                <p className="app-topbar__eyebrow">Interactive image</p>
                <h2>Add clickable product areas</h2>
              </div>
              <span className="badge badge--active">{hotspots.length} hotspot{hotspots.length === 1 ? "" : "s"}</span>
            </div>
            <HotspotEditor hotspots={hotspots} imageUrl={selectedFilePreview} onChange={setHotspots} />
            <label className="campaign-publish-toggle">
              <input checked={publishOnCreate} onChange={(event) => setPublishOnCreate(event.target.checked)} type="checkbox" />
              <span><strong>Publish after creating</strong><small>Turn this off to save a private draft for review.</small></span>
            </label>
          </div>
        ) : null}
      </section>

      <section className="app-card">
        <div className="section-head">
          <div>
            <p className="app-topbar__eyebrow">Saved campaigns</p>
            <h2>Tracked campaigns</h2>
          </div>
          <p className="muted campaign-section-note">
            One tracked-link button, one share menu, one manage menu.
          </p>
        </div>

        <div className="campaign-toolbar">
          <div className="filter-chip-row">
            {filterOptions.map((filter) => (
              <button className={`filter-chip${selectedStatus === filter ? " is-active" : ""}`} key={filter} onClick={() => setSelectedStatus(filter)} type="button">
                {filter}
              </button>
            ))}
          </div>

          <select className="field-select campaign-toolbar__select" onChange={(event) => setSelectedPlatform(event.target.value)} value={selectedPlatform}>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>

        {loadingCampaigns ? (
          <div className="skeleton-cards">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        ) : filteredCampaigns.length ? (
          <div className="campaign-cards">
            {filteredCampaigns.map((campaign) => (
              <article className="campaign-card" key={campaign.id}>
                <div className="campaign-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={campaign.title || "Campaign image"} src={campaign.imageUrl} />
                </div>

                <div className="campaign-card__content">
                  <div className="campaign-card__head">
                    <div>
                      <span className={`badge badge--${campaign.status}`}>{campaign.status}</span>
                      <h3>{campaign.title || "Untitled campaign"}</h3>
                    </div>
                    <p className="campaign-card__platform">{campaign.platform_source || "affiliate"}</p>
                  </div>

                  <p className="muted">{campaign.caption || "No campaign caption provided yet."}</p>

                  <div className="campaign-card__metrics">
                    <div className="campaign-metric">
                      <span>Total clicks</span>
                      <strong>{campaign.totalClicks}</strong>
                    </div>
                    <div className="campaign-metric">
                      <span>Unique clicks</span>
                      <strong>{campaign.uniqueClicks}</strong>
                    </div>
                    <div className="campaign-metric">
                      <span>Top source</span>
                      <strong>{campaign.topReferrer}</strong>
                    </div>
                    <div className="campaign-metric">
                      <span>Last click</span>
                      <strong>{formatLastClickedAt(campaign.lastClickedAt)}</strong>
                    </div>
                  </div>

                  <div className="campaign-link-block">
                    <span className="campaign-link-label">Tracked public link</span>
                    <code>{campaign.publicUrl}</code>
                  </div>

                  <div className="campaign-card__actions campaign-card__actions--compact">
                    <div className="menu-shell">
                      <button aria-expanded={shareOpenId === campaign.id} className="btn btn-fill campaign-share-primary" onClick={() => { setManageOpenId(""); setShareOpenId((current) => (current === campaign.id ? "" : campaign.id)); }} type="button">
                        Share
                      </button>
                      {shareOpenId === campaign.id ? (
                        <div aria-label="Share campaign" className="menu-popover" role="menu">
                          <button className="menu-item" onClick={() => void copyText(campaign.publicUrl, `copy-${campaign.id}`)} type="button">
                            {copiedKey === `copy-${campaign.id}` ? "Link copied" : "Copy campaign link"}
                          </button>
                          <button className="menu-item" onClick={() => void nativeShare(campaign)} type="button">
                            {copiedKey === `share-${campaign.id}` ? "Copied share text" : "Native share"}
                          </button>
                          <button className="menu-item" onClick={() => void copyText(buildShareText(campaign), `bio-${campaign.id}`)} type="button">
                            {copiedKey === `bio-${campaign.id}` ? "Copied TikTok text" : "Copy TikTok bio text"}
                          </button>
                          <a className="menu-item" href={buildFacebookShareUrl(campaign.publicUrl)} rel="noreferrer" target="_blank">
                            Share to Facebook
                          </a>
                          <a className="menu-item" href={buildWhatsappShareUrl(campaign)} rel="noreferrer" target="_blank">
                            Share to WhatsApp
                          </a>
                          <a className="menu-item" href={buildTelegramShareUrl(campaign)} rel="noreferrer" target="_blank">
                            Share to Telegram
                          </a>
                          <a className="menu-item" href={buildEmailShareUrl(campaign)} rel="noreferrer" target="_blank">
                            Share by email
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="menu-shell">
                      <button aria-expanded={manageOpenId === campaign.id} className="btn btn-outline" onClick={() => { setShareOpenId(""); setManageOpenId((current) => (current === campaign.id ? "" : campaign.id)); }} type="button">
                        Manage
                      </button>
                      {manageOpenId === campaign.id ? (
                        <div aria-label="Manage campaign" className="menu-popover" role="menu">
                          <a className="menu-item" href={campaign.publicUrl} rel="noreferrer" target="_blank">Preview campaign</a>
                          <button className="menu-item" onClick={() => startEdit(campaign)} type="button">
                            Edit details
                          </button>
                          <button className="menu-item" disabled={busyId === `${campaign.id}:duplicate`} onClick={() => void duplicateCampaign(campaign)} type="button">
                            Duplicate as draft
                          </button>
                          <button className="menu-item" onClick={() => setQrOpenId((current) => (current === campaign.id ? "" : campaign.id))} type="button">
                            {qrOpenId === campaign.id ? "Hide QR code" : "Show QR code"}
                          </button>
                          {campaign.status === "draft" ? (
                            <button className="menu-item" disabled={busyId === `${campaign.id}:active`} onClick={() => void changeStatus(campaign, "active")} type="button">
                              Publish campaign
                            </button>
                          ) : campaign.status !== "paused" ? (
                            <button className="menu-item" disabled={busyId === `${campaign.id}:paused`} onClick={() => void changeStatus(campaign, "paused")} type="button">
                              Pause campaign
                            </button>
                          ) : (
                            <button className="menu-item" disabled={busyId === `${campaign.id}:active`} onClick={() => void changeStatus(campaign, "active")} type="button">
                              Resume campaign
                            </button>
                          )}
                          {campaign.status !== "archived" ? (
                            <button className="menu-item" disabled={busyId === `${campaign.id}:archived`} onClick={() => void changeStatus(campaign, "archived")} type="button">
                              Archive campaign
                            </button>
                          ) : null}
                          <button className="menu-item menu-item--danger" disabled={busyId === `${campaign.id}:delete`} onClick={() => void deleteCampaign(campaign)} type="button">
                            Delete campaign
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {qrOpenId === campaign.id ? (
                    <div className="campaign-qr-panel">
                      <div>
                        <span className="campaign-link-label">QR code</span>
                        <p className="muted">Use this for printouts, packaging inserts, or live selling.</p>
                      </div>
                      <div className="campaign-qr-panel__row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="Campaign QR code" className="campaign-qr-image" src={buildQrCodeUrl(campaign.id)} />
                        <a className="btn btn-outline" href={buildQrCodeUrl(campaign.id)} rel="noreferrer" target="_blank">
                          Open QR image
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {editingId === campaign.id ? (
                    <form className="campaign-edit-form" onSubmit={submitEdit}>
                      <div className="campaign-edit-grid">
                        <label className="field">
                          <span>Title</span>
                          <input onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} value={editForm.title} />
                        </label>
                        <label className="field">
                          <span>Custom slug</span>
                          <input onChange={(event) => setEditForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))} value={editForm.slug} />
                        </label>
                      </div>

                      <label className="field">
                        <span>Destination URL</span>
                        <input onChange={(event) => setEditForm((current) => ({ ...current, destinationUrl: event.target.value }))} value={editForm.destinationUrl} />
                      </label>

                      <label className="field">
                        <span>Caption</span>
                        <textarea className="field-textarea" onChange={(event) => setEditForm((current) => ({ ...current, caption: event.target.value }))} rows={3} value={editForm.caption} />
                      </label>

                      <div className="campaign-edit-grid">
                        <label className="field">
                          <span>Platform</span>
                          <select className="field-select" onChange={(event) => setEditForm((current) => ({ ...current, platformSource: event.target.value }))} value={editForm.platformSource}>
                            <option value="tiktok">TikTok</option>
                            <option value="shopee">Shopee</option>
                            <option value="lazada">Lazada</option>
                            <option value="facebook">Facebook</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Replace image</span>
                          <input accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={(event) => setEditImageFile(event.target.files?.[0] ?? null)} type="file" />
                        </label>
                      </div>

                      {editImagePreview ? (
                        <div className="campaign-replace-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt="Replacement preview" src={editImagePreview} />
                        </div>
                      ) : null}

                      <div className="campaign-builder-step">
                        <div><p className="app-topbar__eyebrow">Interactive image</p><h3>Edit clickable areas</h3></div>
                        <HotspotEditor hotspots={editHotspots} imageUrl={editImagePreview || campaign.imageUrl} onChange={setEditHotspots} />
                      </div>

                      <div className="campaign-card__actions">
                        <button className="btn btn-fill" disabled={savingEdit} type="submit">
                          {savingEdit ? "Saving..." : "Save changes"}
                        </button>
                        <button className="btn btn-outline" onClick={() => { setEditingId(""); setEditImageFile(null); }} type="button">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="campaign-empty-state">
            <div className="campaign-empty-state__sample">
              <div className="campaign-empty-state__image" aria-hidden="true" />
              <p className="app-topbar__eyebrow">No campaigns yet</p>
              <h3>Start with one product card</h3>
              <p className="muted">Upload a product image, paste the affiliate URL, and create your first tracked share card.</p>
              <a className="btn btn-fill" href="#create-campaign-form">
                Create your first campaign
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractReferrerLabel(referrer: string | null) {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 24);
  }
}

function formatLastClickedAt(value: string | null) {
  if (!value) return "No clicks";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildShareText(campaign: CampaignCard) {
  return `${campaign.title || "Check this offer"}\n${campaign.caption || ""}\n${campaign.publicUrl}`.trim();
}

function buildFacebookShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function buildWhatsappShareUrl(campaign: CampaignCard) {
  return `https://wa.me/?text=${encodeURIComponent(buildShareText(campaign))}`;
}

function buildTelegramShareUrl(campaign: CampaignCard) {
  return `https://t.me/share/url?url=${encodeURIComponent(campaign.publicUrl)}&text=${encodeURIComponent(
    `${campaign.title || "Check this offer"} ${campaign.caption || ""}`.trim()
  )}`;
}

function buildEmailShareUrl(campaign: CampaignCard) {
  return `mailto:?subject=${encodeURIComponent(campaign.title || "Afflio campaign")}&body=${encodeURIComponent(buildShareText(campaign))}`;
}

function buildQrCodeUrl(campaignId: string) {
  return `/api/campaigns/qr?campaignId=${encodeURIComponent(campaignId)}`;
}
