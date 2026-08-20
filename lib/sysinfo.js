const os = require("os");
const { spawn } = require("child_process");

function formatUptime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d} hari`);
  if (h) parts.push(`${h} jam`);
  if (m) parts.push(`${m} menit`);
  if (!d && !h) parts.push(`${s} detik`);
  return parts.join(" ");
}

function cpuUsagePercent(sampleMs = 250) {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      let idleDiff = 0;
      let totalDiff = 0;
      for (let i = 0; i < start.length; i++) {
        const s = start[i].times;
        const e = end[i].times;
        const sTotal = s.user + s.nice + s.sys + s.idle + s.irq;
        const eTotal = e.user + e.nice + e.sys + e.idle + e.irq;
        idleDiff += e.idle - s.idle;
        totalDiff += eTotal - sTotal;
      }
      const usage = totalDiff > 0 ? 100 * (1 - idleDiff / totalDiff) : 0;
      resolve(Math.min(100, Math.max(0, usage)));
    }, sampleMs);
  });
}

function diskUsage(dirPath) {
  return new Promise((resolve) => {
    const proc = spawn("df", ["-kP", dirPath]);
    let out = "";
    proc.on("error", () => resolve(null));
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return resolve(null);
      try {
        const lines = out.trim().split("\n");
        const parts = lines[lines.length - 1].trim().split(/\s+/);
        const totalKB = parseInt(parts[1], 10);
        const usedKB = parseInt(parts[2], 10);
        const availKB = parseInt(parts[3], 10);
        const usePercent = parts[4];
        if (Number.isNaN(totalKB) || Number.isNaN(usedKB)) return resolve(null);
        resolve({ totalKB, usedKB, availKB, usePercent });
      } catch (e) {
        resolve(null);
      }
    });
  });
}

function getYtdlpVersion() {
  return new Promise((resolve) => {
    const proc = spawn("yt-dlp", ["--version"]);
    let out = "";
    proc.on("error", () => resolve("tidak ditemukan"));
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", () => resolve(out.trim() || "tidak diketahui"));
  });
}

module.exports = { formatUptime, cpuUsagePercent, diskUsage, getYtdlpVersion };