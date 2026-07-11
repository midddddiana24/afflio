import { validateDestinationUrl } from "@/lib/campaigns";

export type CampaignHotspotInput = {
  id?: string;
  label: string;
  destinationUrl: string;
  platformSource: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export function validateHotspots(value: unknown) {
  if (!Array.isArray(value)) return { ok: false as const, error: "Hotspots must be a list." };
  if (value.length > 20) return { ok: false as const, error: "A campaign can have up to 20 hotspots." };

  const hotspots: CampaignHotspotInput[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false as const, error: `Hotspot ${index + 1} is invalid.` };
    }
    const item = raw as Record<string, unknown>;
    const label = String(item.label ?? "").trim().slice(0, 80);
    const destination = validateDestinationUrl(String(item.destinationUrl ?? ""));
    const xPercent = Number(item.xPercent);
    const yPercent = Number(item.yPercent);
    const widthPercent = Number(item.widthPercent ?? 16);
    const heightPercent = Number(item.heightPercent ?? 12);

    if (!label) return { ok: false as const, error: `Hotspot ${index + 1} needs a label.` };
    if (!destination.valid) return { ok: false as const, error: `Hotspot ${index + 1}: ${destination.error}` };
    if (![xPercent, yPercent, widthPercent, heightPercent].every(Number.isFinite)) {
      return { ok: false as const, error: `Hotspot ${index + 1} has invalid coordinates.` };
    }
    if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) {
      return { ok: false as const, error: `Hotspot ${index + 1} must stay inside the image.` };
    }
    if (widthPercent < 3 || widthPercent > 100 || heightPercent < 3 || heightPercent > 100) {
      return { ok: false as const, error: `Hotspot ${index + 1} has an invalid size.` };
    }

    hotspots.push({
      id: typeof item.id === "string" ? item.id : undefined,
      label,
      destinationUrl: destination.value,
      platformSource: String(item.platformSource ?? "other").trim().slice(0, 40) || "other",
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
    });
  }

  return { ok: true as const, value: hotspots };
}

export function toHotspotRows(campaignId: string, hotspots: CampaignHotspotInput[]) {
  return hotspots.map((hotspot, index) => ({
    campaign_id: campaignId,
    label: hotspot.label,
    destination_url: hotspot.destinationUrl,
    platform_source: hotspot.platformSource,
    x_percent: hotspot.xPercent,
    y_percent: hotspot.yPercent,
    width_percent: hotspot.widthPercent,
    height_percent: hotspot.heightPercent,
    sort_order: index,
  }));
}
