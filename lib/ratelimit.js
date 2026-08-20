const hits = new Map();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(10 * 60 * 1000), 10);
const MAX_HITS = parseInt(process.env.RATE_LIMIT_MAX || "5", 10);

function checkRateLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  let arr = hits.get(key) || [];
  arr = arr.filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_HITS) {
    const oldest = arr[0];
    const retrySec = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    hits.set(key, arr);
    return { allowed: false, retrySec, remaining: 0, limit: MAX_HITS };
  }
  arr.push(now);
  hits.set(key, arr);
  return { allowed: true, remaining: MAX_HITS - arr.length, limit: MAX_HITS };
}

function getRateLimitStatus(userId) {
  const now = Date.now();
  const key = String(userId);
  let arr = hits.get(key) || [];
  arr = arr.filter((t) => now - t < WINDOW_MS);
  hits.set(key, arr);
  return { used: arr.length, limit: MAX_HITS, remaining: Math.max(0, MAX_HITS - arr.length) };
}

module.exports = { checkRateLimit, getRateLimitStatus, WINDOW_MS, MAX_HITS };