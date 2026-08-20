const { spawn } = require("child_process");
const readline = require("readline");

function fetchInfo(url, { timeoutMs = 25000 } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["--dump-json", "--no-playlist", "--no-warnings", url];
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Timeout mengambil info video. Coba lagi."));
    }, timeoutMs);

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      clearTimeout(timer);
      reject(new Error("yt-dlp tidak ditemukan. Pastikan sudah install yt-dlp (lihat README)."));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.slice(-500) || "Gagal mengambil info video (link tidak didukung / private)."));
        return;
      }
      try {
        const firstLine = stdout.trim().split("\n")[0];
        const info = JSON.parse(firstLine);
        resolve(info);
      } catch (e) {
        reject(new Error("Gagal membaca info video (format respons tidak dikenali)."));
      }
    });
  });
}

function buildFormatSelector(quality) {
  switch (quality) {
    case "360":
      return "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]";
    case "720":
      return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]";
    case "1080":
      return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]";
    case "best":
    default:
      return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  }
}

function downloadVideoWithProgress(url, outputTemplate, quality, maxSizeMB, onProgress, onProcess) {
  const formatSelector = buildFormatSelector(quality);
  const args = [
    "-f",
    `${formatSelector}[filesize<${maxSizeMB}M]/${formatSelector}`,
    "--no-playlist",
    "--merge-output-format",
    "mp4",
    "--newline",
    "-o",
    outputTemplate,
    url,
  ];
  return runWithProgress(args, onProgress, onProcess);
}

function downloadAudioWithProgress(url, outputTemplate, format, onProgress, onProcess) {
  const audioFormat = ["mp3", "m4a", "opus"].includes(format) ? format : "mp3";
  const args = [
    "-x",
    "--audio-format",
    audioFormat,
    "--no-playlist",
    "--newline",
    "-o",
    outputTemplate,
    url,
  ];
  return runWithProgress(args, onProgress, onProcess);
}

function isPlaylistUrl(url) {
  try {
    const u = new URL(url);
    return /(^|&)list=/.test(u.search.replace(/^\?/, "")) && /(^|\.)youtube\.com$|youtu\.be$/.test(u.hostname);
  } catch (e) {
    return false;
  }
}

function fetchPlaylistInfo(url, { limit = 50, timeoutMs = 25000 } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["--flat-playlist", "--dump-single-json", "--no-warnings", "--playlist-end", String(limit), url];
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Timeout mengambil info playlist."));
    }, timeoutMs);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      clearTimeout(timer);
      reject(new Error("yt-dlp tidak ditemukan."));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.slice(-500) || "Gagal mengambil info playlist."));
        return;
      }
      try {
        const data = JSON.parse(stdout.trim());
        resolve(data); // { title, entries: [...] }
      } catch (e) {
        reject(new Error("Gagal membaca info playlist."));
      }
    });
  });
}

function downloadPlaylistWithProgress(url, outputTemplate, limit, quality, onProgress, onProcess) {
  const formatSelector = buildFormatSelector(quality);
  const args = [
    "--yes-playlist",
    "--playlist-end",
    String(limit),
    "-f",
    formatSelector,
    "--merge-output-format",
    "mp4",
    "--newline",
    "-o",
    outputTemplate,
    url,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    if (onProcess) onProcess(proc);
    let stderr = "";
    const rl = readline.createInterface({ input: proc.stdout });
    let currentItem = 0;
    let totalItems = limit;

    rl.on("line", (line) => {
      const itemMatch = line.match(/Downloading item (\d+) of (\d+)/);
      if (itemMatch) {
        currentItem = parseInt(itemMatch[1], 10);
        totalItems = parseInt(itemMatch[2], 10);
      }
      const match = line.match(/\[download\]\s+(\d{1,3}\.\d)%.*?(?:at\s+([\d.]+\w+\/s))?.*?(?:ETA\s+([\d:]+))?/);
      if (match && onProgress) {
        const percent = parseFloat(match[1]);
        onProgress(percent, { speed: match[2] || null, eta: match[3] || null, currentItem, totalItems });
      }
    });

    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      reject(new Error("yt-dlp tidak ditemukan. Pastikan sudah install yt-dlp (lihat README)."));
    });
    proc.on("close", (code) => {
      rl.close();
      if (code === 0) resolve();
      else if (proc.killed) reject(new Error("__CANCELLED__"));
      else reject(new Error(stderr.slice(-500) || "yt-dlp gagal, coba lagi."));
    });
  });
}

function listFormats(url, { timeoutMs = 25000 } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-F", "--no-warnings", url];
    const proc = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Timeout mengambil daftar format."));
    }, timeoutMs);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      clearTimeout(timer);
      reject(new Error("yt-dlp tidak ditemukan. Pastikan sudah install yt-dlp (lihat README)."));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.slice(-500) || "Gagal mengambil daftar format (link tidak didukung / private)."));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function runWithProgress(args, onProgress, onProcess) {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    if (onProcess) onProcess(proc);
    let stderr = "";
    const rl = readline.createInterface({ input: proc.stdout });

    rl.on("line", (line) => {
      const match = line.match(/\[download\]\s+(\d{1,3}\.\d)%.*?(?:at\s+([\d.]+\w+\/s))?.*?(?:ETA\s+([\d:]+))?/);
      if (match && onProgress) {
        const percent = parseFloat(match[1]);
        onProgress(percent, { speed: match[2] || null, eta: match[3] || null });
      }
    });

    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      reject(new Error("yt-dlp tidak ditemukan. Pastikan sudah install yt-dlp (lihat README)."));
    });
    proc.on("close", (code) => {
      rl.close();
      if (code === 0) resolve();
      else if (proc.killed) reject(new Error("__CANCELLED__"));
      else reject(new Error(stderr.slice(-500) || "yt-dlp gagal, coba lagi."));
    });
  });
}

module.exports = {
  fetchInfo,
  buildFormatSelector,
  downloadVideoWithProgress,
  downloadAudioWithProgress,
  isPlaylistUrl,
  fetchPlaylistInfo,
  downloadPlaylistWithProgress,
  listFormats,
};
