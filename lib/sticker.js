const { spawn } = require("child_process");

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";

    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", () => {
      reject(new Error("ffmpeg tidak ditemukan. Pastikan sudah install ffmpeg (lihat README)."));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500) || "ffmpeg gagal mengubah jadi stiker."));
    });
  });
}

function imageToWebpSticker(inputPath, outputPath) {
  const args = [
    "-y",
    "-i", inputPath,
    "-vf", "scale=512:512:force_original_aspect_ratio=decrease,format=rgba",
    "-vcodec", "libwebp",
    "-lossless", "0",
    "-quality", "80",
    "-preset", "picture",
    "-an",
    "-vsync", "0",
    outputPath,
  ];
  return runFfmpeg(args);
}

function videoToWebpSticker(inputPath, outputPath, { maxDurationSec = 8, fps = 15 } = {}) {
  const args = [
    "-y",
    "-t", String(maxDurationSec),
    "-i", inputPath,
    "-vf", `scale=512:512:force_original_aspect_ratio=decrease,fps=${fps},format=rgba`,
    "-vcodec", "libwebp",
    "-loop", "0",
    "-lossless", "0",
    "-quality", "70",
    "-preset", "default",
    "-an",
    "-vsync", "0",
    outputPath,
  ];
  return runFfmpeg(args);
}

module.exports = { imageToWebpSticker, videoToWebpSticker };