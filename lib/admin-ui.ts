export function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value?: number | string | null) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-PH").format(value ?? 0);
}

export function toBadgeClass(value?: string | null) {
  const normalized = (value || "").toLowerCase();

  if (
    ["active", "approved", "processed", "resolved", "admin", "public", "open"].includes(
      normalized
    )
  ) {
    return "badge badge--active";
  }

  if (
    ["pending", "reviewing", "trialing", "paused", "incomplete", "warning"].includes(
      normalized
    )
  ) {
    return "badge badge--paused";
  }

  return "badge badge--archived";
}

export function extractHostname(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}
