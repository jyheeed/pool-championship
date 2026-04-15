type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalStore.__rateLimitStore ?? new Map<string, RateLimitEntry>();
globalStore.__rateLimitStore = store;

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  store.forEach((entry, entryKey) => {
    if (entry.resetAt <= now) {
      store.delete(entryKey);
    }
  });

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
