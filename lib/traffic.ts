const crawlerPattern =
  /(bot|crawler|spider|slurp|facebookexternalhit|meta-externalagent|linkedinbot|twitterbot|whatsapp|slackbot|discordbot|telegrambot|skypeuripreview|pinterest|googlebot|bingbot|embedly|quora link preview|vkshare|facebot|outbrain|applebot)/i;

const mobilePattern =
  /(android|iphone|ipad|ipod|mobile|phone|opera mini|iemobile|blackberry|webos)/i;

const tabletPattern = /(ipad|tablet|kindle|playbook|silk)/i;

type TrafficContext = {
  referrer: string | null;
  userAgent: string;
  country: string | null;
  ip: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  isBot: boolean;
  isPrefetch: boolean;
  botScore: number;
};

export function getTrafficContext(headerBag: Pick<Headers, "get">): TrafficContext {
  const userAgent = headerBag.get("user-agent") || "";
  const referrer =
    headerBag.get("referer") ||
    headerBag.get("referrer") ||
    headerBag.get("x-forwarded-host") ||
    null;
  const country =
    headerBag.get("x-vercel-ip-country") ||
    headerBag.get("cf-ipcountry") ||
    null;
  const forwardedFor = headerBag.get("x-forwarded-for") || headerBag.get("x-real-ip") || "";
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() || null : null;
  const purpose = headerBag.get("purpose") || headerBag.get("x-purpose") || "";
  const secPurpose = headerBag.get("sec-purpose") || "";
  const secFetchMode = headerBag.get("sec-fetch-mode") || "";
  const isBot = crawlerPattern.test(userAgent);
  const isPrefetch =
    /prefetch|preview/i.test(purpose) ||
    /prefetch|preview/i.test(secPurpose) ||
    secFetchMode === "prefetch";
  const botScore = getBotScore({
    userAgent,
    isBot,
    isPrefetch,
    referrer,
  });

  return {
    referrer,
    userAgent,
    country,
    ip,
    deviceType: getDeviceType(userAgent, isBot),
    isBot,
    isPrefetch,
    botScore,
  };
}

export function getBotScore(input: {
  userAgent: string;
  isBot: boolean;
  isPrefetch: boolean;
  referrer: string | null;
}) {
  let score = 0;

  if (input.isBot) score += 85;
  if (input.isPrefetch) score += 15;
  if (!input.userAgent) score += 25;
  if (/headless|phantom|selenium|playwright|puppeteer|curl|wget|python|axios|node-fetch/i.test(input.userAgent)) {
    score += 40;
  }
  if (!input.referrer) score += 5;

  return Math.min(100, score);
}

function getDeviceType(userAgent: string, isBot: boolean) {
  if (!userAgent) return "unknown" as const;
  if (isBot) return "bot" as const;
  if (tabletPattern.test(userAgent)) return "tablet" as const;
  if (mobilePattern.test(userAgent)) return "mobile" as const;
  return "desktop" as const;
}
