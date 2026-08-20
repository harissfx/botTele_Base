function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "-";
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function formatSize(bytes) {
  if (!bytes || isNaN(bytes)) return "tidak diketahui";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function progressBar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

const BOLD_UPPER_BASE = 0x1d400; // 𝐀
const BOLD_LOWER_BASE = 0x1d41a; // 𝐚
const BOLD_DIGIT_BASE = 0x1d7ce; // 𝟎

function toBoldUnicode(str) {
  return String(str)
    .split("")
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(BOLD_UPPER_BASE + (code - 65)); // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(BOLD_LOWER_BASE + (code - 97)); // a-z
      if (code >= 48 && code <= 57) return String.fromCodePoint(BOLD_DIGIT_BASE + (code - 48)); // 0-9
      return ch;
    })
    .join("");
}

function formatCount(n) {
  if (n === null || n === undefined || isNaN(n)) return null;
  n = Number(n);
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}rb`.replace(".0rb", "rb");
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`.replace(".0jt", "jt");
  return `${(n / 1_000_000_000).toFixed(1)}M`.replace(".0M", "M");
}

function extractHashtags(text, limit = 12) {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  const seen = new Set();
  const result = [];
  for (const tag of matches) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= limit) break;
  }
  return result;
}

module.exports = {
  escapeHtml,
  formatDuration,
  formatSize,
  formatDate,
  progressBar,
  toBoldUnicode,
  formatCount,
  extractHashtags,
};