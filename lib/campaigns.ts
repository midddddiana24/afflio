import { customAlphabet } from "nanoid";

const slugAlphabet = "23456789abcdefghjkmnpqrstuvwxyz";
const generateSlug = customAlphabet(slugAlphabet, 7);

export const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const slugPattern = /^[23456789abcdefghjkmnpqrstuvwxyz-]{4,40}$/;

export type CampaignInput = {
  title?: string;
  caption?: string;
  destinationUrl?: string;
  platformSource?: string;
  imagePath?: string;
};

type ValidatedCampaignInput =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      value: {
        title: string | null;
        caption: string | null;
        platformSource: string | null;
        imagePath: string;
        destinationUrl: string;
        destinationHostname: string;
      };
    };

type DestinationValidation =
  | {
      valid: false;
      error: string;
    }
  | {
      valid: true;
      value: string;
      hostname: string;
    };

export function createCampaignSlug() {
  return generateSlug();
}

export function validateCustomSlug(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false as const, error: "Campaign slug is required." };
  }

  if (!slugPattern.test(trimmed)) {
    return {
      valid: false as const,
      error: "Slug must be 4-40 chars and use only lowercase letters, numbers, or hyphens.",
    };
  }

  return { valid: true as const, value: trimmed };
}

export function normalizeText(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

export function validateDestinationUrl(value: string | undefined): DestinationValidation {
  const trimmed = value?.trim();

  if (!trimmed) {
    return { valid: false, error: "Destination URL is required." };
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Destination URL must be a valid URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only HTTP and HTTPS URLs are allowed." };
  }

  if (blockedHosts.has(parsed.hostname.toLowerCase())) {
    return { valid: false, error: "Localhost-style URLs are not allowed." };
  }

  return {
    valid: true,
    value: parsed.toString(),
    hostname: parsed.hostname.toLowerCase(),
  };
}

export function validateCampaignInput(input: CampaignInput): ValidatedCampaignInput {
  const title = normalizeText(input.title, 120);
  const caption = normalizeText(input.caption, 280);
  const platformSource = normalizeText(input.platformSource, 40);
  const imagePath = input.imagePath?.trim();
  const destination = validateDestinationUrl(input.destinationUrl);

  if (!destination.valid) {
    return { ok: false, error: destination.error };
  }

  if (!imagePath) {
    return { ok: false, error: "An uploaded campaign image is required." };
  }

  return {
    ok: true,
    value: {
      title,
      caption,
      platformSource,
      imagePath,
      destinationUrl: destination.value,
      destinationHostname: destination.hostname,
    },
  };
}

export function createStoragePath(userId: string, fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const safeExtension = String(extension || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${userId}/${Date.now()}-${createCampaignSlug()}.${safeExtension || "bin"}`;
}
