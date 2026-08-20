const fs = require("fs");
const { spawn } = require("child_process");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      reject(new Error(`${cmd} tidak ditemukan. Pastikan sudah install ${cmd} (lihat README).`));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500) || `${cmd} gagal.`));
    });
  });
}

function convertToMp3(inputPath, outputPath) {
  return convertToAudio(inputPath, outputPath, "mp3");
}

function convertToAudio(inputPath, outputPath, format = "mp3") {
  const args = ["-y", "-i", inputPath, "-vn"];
  if (format === "m4a") {
    args.push("-acodec", "aac", "-b:a", "192k");
  } else if (format === "opus") {
    args.push("-acodec", "libopus", "-b:a", "128k");
  } else {
    args.push("-acodec", "libmp3lame", "-b:a", "192k");
  }
  args.push(outputPath);
  return run("ffmpeg", args);
}

function convertToGif(inputPath, outputPath, { fps = 12, width = 480, maxDurationSec = 15 } = {}) {
  const args = [
    "-y",
    "-t", String(maxDurationSec),
    "-i", inputPath,
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos`,
    "-loop", "0",
    outputPath,
  ];
  return run("ffmpeg", args);
}

function getDurationSec(inputPath) {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    let out = "";
    proc.on("error", () => resolve(null));
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", () => {
      const val = parseFloat(out.trim());
      resolve(Number.isFinite(val) && val > 0 ? val : null);
    });
  });
}

async function compressVideoToTarget(inputPath, outputPath, targetSizeMB) {
  const duration = await getDurationSec(inputPath);
  if (!duration) throw new Error("Gagal baca durasi video buat dikompres.");

  const attempts = [
    { scale: null, audioKbps: 128 },
    { scale: 720, audioKbps: 96 },
    { scale: 480, audioKbps: 96 },
    { scale: 360, audioKbps: 64 },
  ];

  let lastErr;
  for (const attempt of attempts) {
    const targetKbits = ((targetSizeMB * 8192) / duration) * 0.92;
    const videoKbps = Math.max(100, Math.floor(targetKbits - attempt.audioKbps));
    const args = ["-y", "-i", inputPath];
    if (attempt.scale) args.push("-vf", `scale=-2:${attempt.scale}`);
    args.push(
      "-c:v", "libx264",
      "-b:v", `${videoKbps}k`,
      "-maxrate", `${Math.floor(videoKbps * 1.2)}k`,
      "-bufsize", `${videoKbps * 2}k`,
      "-preset", "fast",
      "-c:a", "aac",
      "-b:a", `${attempt.audioKbps}k`,
      "-movflags", "+faststart",
      outputPath
    );
    try {
      await run("ffmpeg", args);
      const sizeMB = fs.statSync(outputPath).size / (1024 * 1024);
      if (sizeMB <= targetSizeMB) return outputPath;
      lastErr = new Error(`Masih ${sizeMB.toFixed(1)}MB setelah dikompres.`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Gagal mengompres video ke ukuran target.");
}

module.exports = {
  convertToMp3,
  convertToAudio,
  convertToGif,
  getDurationSec,
  compressVideoToTarget,
};
