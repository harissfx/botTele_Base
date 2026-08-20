const { spawn } = require("child_process");


function downloadPhotos(url, destDir, { timeoutMs = 45000, cookiesFile, range } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-D", destDir, "--no-mtime"];
    if (cookiesFile) args.push("--cookies", cookiesFile);
    if (range) args.push("--range", range);
    args.push(url);

    const proc = spawn("gallery-dl", args);
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch (_) {}
      }, 5000);
      reject(new Error("Timeout mengambil foto. Coba lagi."));
    }, timeoutMs);

    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      clearTimeout(timer);
      reject(new Error("gallery-dl tidak ditemukan. Install dulu: pip install gallery-dl (lihat README)."));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) resolve();
      else {
        const msg = stderr.slice(-500) || "gallery-dl gagal ambil foto.";
        if (/login|authentication required|401|403/i.test(msg)) {
          reject(
            new Error(
              "Postingan ini minta login buat diakses. " +
                (cookiesFile
                  ? "Cookies yang dipakai kemungkinan udah kadaluarsa, coba export ulang."
                  : "Set GALLERY_DL_COOKIES_FILE di .env biar bot bisa pakai cookies akun kamu.")
            )
          );
        } else {
          reject(new Error(msg));
        }
      }
    });
  });
}

const PHOTO_FALLBACK_HOSTS = ["x.com", "twitter.com", "instagram.com"];

function isPhotoFallbackSite(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return PHOTO_FALLBACK_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch (e) {
    return false;
  }
}

module.exports = { downloadPhotos, isPhotoFallbackSite };