type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const bucketStore = globalThis as typeof globalThis & {
  __afflioRateLimitBuckets?: Map<string, Bucket>;
};

function getBucketMap() {
  if (!bucketStore.__afflioRateLimitBuckets) {
    bucketStore.__afflioRateLimitBuckets = new Map<string, Bucket>();
  }

  return bucketStore.__afflioRateLimitBuckets;
}

export function takeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const buckets = getBucketMap();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    pruneBuckets(buckets, now);

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function pruneBuckets(buckets: Map<string, Bucket>, now: number) {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
