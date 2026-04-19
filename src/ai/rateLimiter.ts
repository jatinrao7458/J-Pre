/**
 * Rate Limiter — Throttled request queue for Gemini API.
 *
 * Gemini free tier: ~15 RPM, ~1M TPM, ~1500 RPD
 * We conservatively limit to 10 RPM with exponential backoff on 429s.
 */

const MAX_RPM = 10;
const MIN_INTERVAL_MS = (60 * 1000) / MAX_RPM; // 6000ms = 6 seconds between calls
const MAX_RETRIES = 3;

let lastCallTime = 0;
let activeQueue: Promise<any> = Promise.resolve();

/**
 * Queue a request to ensure we never exceed the RPM limit.
 * Handles 429 errors with exponential backoff.
 */
export async function rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
  // Chain requests sequentially through the queue
  const result = new Promise<T>((resolve, reject) => {
    activeQueue = activeQueue.then(async () => {
      try {
        const res = await executeWithBackoff(fn);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  });

  return result;
}

/**
 * Execute a function with exponential backoff on 429 errors.
 */
async function executeWithBackoff<T>(
  fn: () => Promise<T>,
  attempt: number = 0
): Promise<T> {
  // Wait to respect rate limit
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }

  lastCallTime = Date.now();

  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.response?.status;

    if (status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      console.warn(`⚠️  Gemini 429 — retrying in ${backoffMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      return executeWithBackoff(fn, attempt + 1);
    }

    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
