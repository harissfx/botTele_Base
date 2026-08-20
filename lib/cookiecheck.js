const fs = require("fs");
const os = require("os");
const path = require("path");
const { downloadPhotos } = require("./gallery");
const logger = require("./logger");
const TEST_URL = "https://www.instagram.com/instagram/";

async function checkInstagramCookies(cookiesFile, timeoutMs = 60000) {
  if (!cookiesFile || !fs.existsSync(cookiesFile)) {
    return { ok: false, skipped: true, reason: "GALLERY_DL_COOKIES_FILE belum diset / file tidak ketemu." };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cookiecheck-"));
  try {
    await downloadPhotos(TEST_URL, tmpDir, { cookiesFile, timeoutMs, range: "1-1" });
    return { ok: true };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const expired = /login|authentication|401|403|cookies/i.test(msg);
    const timeout = !expired && /timeout/i.test(msg);
    return { ok: false, skipped: false, expired, timeout, reason: msg };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function scheduleInstagramCookieCheck(cookiesFile, notifyOwner, intervalMs = 24 * 60 * 60 * 1000) {
  async function run() {
    const result = await checkInstagramCookies(cookiesFile);
    if (result.ok || result.skipped) return;

    if (result.timeout) {
      logger.warn("Cek cookies Instagram timeout (kemungkinan cuma koneksi lambat/rate-limit, bukan cookies invalid):", result.reason);
      return;
    }

    logger.warn("Cookies Instagram kemungkinan bermasalah:", result.reason);
    notifyOwner(
      "Cookies Instagram (GALLERY_DL_COOKIES_FILE) kemungkinan sudah expired/invalid.\n" +
        `Detail: ${result.reason}\n\n` +
        "Export ulang cookies.txt dari browser yang udah login, lalu update file-nya."
    );
  }
  run();
  const interval = setInterval(run, intervalMs);
  interval.unref();
  return interval;
}

module.exports = { checkInstagramCookies, scheduleInstagramCookieCheck };