const { Markup } = require("telegraf");
const { escapeHtml, formatDuration, formatSize, formatCount, extractHashtags } = require("../../lib/format");
const { getPrefs } = require("../../lib/prefs");
const { PLAYLIST_LIMIT } = require("../config");
const CAPTION_LIMIT = 1024;

function infoKeyboard(id, data) {
  const prefs = getPrefs(data.userId);
  const qLabel =
    prefs.quality && prefs.quality !== "best"
      ? `▶ Video (${prefs.quality}p, default kamu)`
      : "▶ Video (Terbaik)";

  const rows = [
    [Markup.button.callback(qLabel, `dlv:${id}`)],
    [Markup.button.callback("♪ Audio (MP3)", `dla:${id}`), Markup.button.callback("♪ Format Audio Lain", `dlaf:${id}`)],
    [Markup.button.callback("≡ Pilih Kualitas", `dlq:${id}`)],
  ];

  if (data.playlistCount && data.playlistCount > 1) {
    const n = Math.min(data.playlistCount, PLAYLIST_LIMIT);
    rows.push([Markup.button.callback(`▤ Download Playlist (${n} video)`, `dlpl:${id}`)]);
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
    [Markup.button.callback("← Kembali", `dlqback:${id}`)],
  ]);
}

function audioFormatKeyboard(id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("MP3", `dlafs:${id}:mp3`),
      Markup.button.callback("M4A", `dlafs:${id}:m4a`),
      Markup.button.callback("Opus", `dlafs:${id}:opus`),
    ],
    [Markup.button.callback("← Kembali", `dlqback:${id}`)],
  ]);
}

function buildInfoCaption(info) {
  const title = escapeHtml(info.title || "Tanpa judul");
  const uploader = info.uploader ? escapeHtml(info.uploader) : null;
  const duration = formatDuration(info.duration);
  const sizeGuess = info.filesize || info.filesize_approx;
  const stats = [];
  const likes = formatCount(info.like_count);
  const views = formatCount(info.view_count);
  if (likes) stats.push(`♥ ${likes}`);
  if (views) stats.push(`◉ ${views}`);
  const statsLine = stats.length ? `${stats.join("  •  ")}\n` : "";

  return (
    `▶ <b>${title}</b>\n` +
    (uploader ? `• ${uploader}\n` : "") +
    statsLine +
    `⏱ Durasi: <b>${duration}</b>\n` +
    `▣ Perkiraan ukuran: <b>${formatSize(sizeGuess)}</b>\n\n` +
    "Pilih mau download sebagai apa ▼"
  );
}

function buildDownloadCaption(info, sourceUrl) {
  const title = escapeHtml(info.title || "Tanpa judul");
  const uploader = info.uploader || info.channel || info.uploader_id;

  const stats = [];
  const likes = formatCount(info.like_count);
  const views = formatCount(info.view_count);
  const comments = formatCount(info.comment_count);
  if (likes) stats.push(`♥ ${likes}`);
  if (views) stats.push(`◉ ${views}`);
  if (comments) stats.push(`¶ ${comments}`);

  const rawDescription = (info.description || "").trim();
  const hashtags = extractHashtags(rawDescription).concat(
    Array.isArray(info.tags) ? info.tags.filter((t) => typeof t === "string" && t.startsWith("#")) : []
  );
  const uniqueHashtags = [...new Set(hashtags.map((h) => h.toLowerCase()))].slice(0, 12);
  const descriptionOnly = rawDescription.replace(/#[\p{L}\p{N}_]+/gu, "").trim();

  const headerLines = [`▶ <b>${title}</b>`];
  if (uploader) headerLines.push(`• ${escapeHtml(uploader)}`);
  if (stats.length) headerLines.push(stats.join("  •  "));
  const header = headerLines.join("\n");

  const linkLine = sourceUrl ? `\n\n⛓ ${escapeHtml(sourceUrl)}` : "";
  const hashtagLine = uniqueHashtags.length ? `\n\n${escapeHtml(uniqueHashtags.join(" "))}` : "";

  const fixedPartsLength = header.length + linkLine.length + hashtagLine.length + 10;
  const descBudget = CAPTION_LIMIT - fixedPartsLength;

  let descLine = "";
  if (descriptionOnly && descBudget > 20) {
    const truncated =
      descriptionOnly.length > descBudget ? descriptionOnly.slice(0, descBudget - 1).trimEnd() + "…" : descriptionOnly;
    descLine = `\n\n${escapeHtml(truncated)}`;
  }

  let caption = header + descLine + hashtagLine + linkLine;
  if (caption.length > CAPTION_LIMIT) {
    caption = caption.slice(0, CAPTION_LIMIT - 1) + "…";
  }
  return caption;
}

module.exports = { infoKeyboard, qualityKeyboard, audioFormatKeyboard, buildInfoCaption, buildDownloadCaption };