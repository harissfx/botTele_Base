const { Markup } = require("telegraf");
const { escapeHtml, formatDuration, formatSize } = require("../lib/format");
const { getPrefs } = require("../lib/prefs");
const { PLAYLIST_LIMIT } = require("../config");

function infoKeyboard(id, data) {
  const prefs = getPrefs(data.userId);
  const qLabel =
    prefs.quality && prefs.quality !== "best"
      ? `🎥 Video (${prefs.quality}p, default kamu)`
      : "🎥 Video (Terbaik)";

  const rows = [
    [Markup.button.callback(qLabel, `dlv:${id}`)],
    [Markup.button.callback("🎵 Audio (MP3)", `dla:${id}`), Markup.button.callback("🎼 Format Audio Lain", `dlaf:${id}`)],
    [Markup.button.callback("⚙️ Pilih Kualitas", `dlq:${id}`)],
  ];

  if (data.playlistCount && data.playlistCount > 1) {
    const n = Math.min(data.playlistCount, PLAYLIST_LIMIT);
    rows.push([Markup.button.callback(`📃 Download Playlist (${n} video)`, `dlpl:${id}`)]);
  }

  return Markup.inlineKeyboard(rows);
}

function qualityKeyboard(id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("360p", `dlqs:${id}:360`),
      Markup.button.callback("720p", `dlqs:${id}:720`),
      Markup.button.callback("1080p", `dlqs:${id}:1080`),
    ],
    [Markup.button.callback("⬅️ Kembali", `dlqback:${id}`)],
  ]);
}

function audioFormatKeyboard(id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("MP3", `dlafs:${id}:mp3`),
      Markup.button.callback("M4A", `dlafs:${id}:m4a`),
      Markup.button.callback("Opus", `dlafs:${id}:opus`),
    ],
    [Markup.button.callback("⬅️ Kembali", `dlqback:${id}`)],
  ]);
}

function buildInfoCaption(info) {
  const title = escapeHtml(info.title || "Tanpa judul");
  const uploader = info.uploader ? escapeHtml(info.uploader) : null;
  const duration = formatDuration(info.duration);
  const sizeGuess = info.filesize || info.filesize_approx;
  return (
    `🎬 <b>${title}</b>\n` +
    (uploader ? `👤 ${uploader}\n` : "") +
    `⏱️ Durasi: <b>${duration}</b>\n` +
    `📦 Perkiraan ukuran: <b>${formatSize(sizeGuess)}</b>\n\n` +
    "Pilih mau download sebagai apa 👇"
  );
}

module.exports = { infoKeyboard, qualityKeyboard, audioFormatKeyboard, buildInfoCaption };
