const fs = require("fs");
const path = require("path");
const { escapeHtml } = require("../../lib/format");
const { OWNER_ID } = require("../config");
const logger = require("../../lib/logger");
const coins = require("../../lib/coins");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const PREFS_FILE = path.join(DATA_DIR, "prefs.json");
const COINS_FILE = path.join(DATA_DIR, "coins.json");

function loadJson(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {}
  return null;
}

function collectUserIds() {
  const ids = new Set();
  const hist = loadJson(HISTORY_FILE);
  if (Array.isArray(hist)) {
    for (const e of hist) if (e && e.userId) ids.add(String(e.userId));
  } else if (hist && typeof hist === "object") {
    if (Array.isArray(hist.entries)) {
      for (const e of hist.entries) if (e && e.userId) ids.add(String(e.userId));
    } else {
      for (const k of Object.keys(hist)) ids.add(k);
    }
  }
  const prefs = loadJson(PREFS_FILE);
  if (prefs && typeof prefs === "object") {
    for (const k of Object.keys(prefs)) ids.add(k);
  }
  const coinData = loadJson(COINS_FILE);
  if (coinData && typeof coinData === "object") {
    for (const k of Object.keys(coinData)) ids.add(k);
  }
  return [...ids];
}

function isOwner(ctx) {
  return OWNER_ID && String(ctx.from.id) === String(OWNER_ID);
}

function register(bot) {
  bot.command("users", async (ctx) => {
    if (!isOwner(ctx)) return;
    const ids = collectUserIds();
    const sample = ids.slice(0, 30).map((id) => `• <code>${escapeHtml(id)}</code>`).join("\n");
    const more = ids.length > 30 ? `\n… dan ${ids.length - 30} lainnya` : "";
    await ctx.reply(
      `👥 <b>User terdata: ${ids.length}</b>\n\n${sample || "(belum ada)"}${more}`,
      { parse_mode: "HTML" }
    );
  });

  bot.command("broadcast", async (ctx) => {
    if (!isOwner(ctx)) return;
    const text = (ctx.message.text || "").replace(/^\/broadcast(@\w+)?\s*/i, "").trim();
    if (!text) {
      return ctx.reply("Pakai: <code>/broadcast pesan pengumuman di sini</code>", { parse_mode: "HTML" });
    }

    const ids = collectUserIds().filter((id) => id !== String(ctx.from.id));
    if (ids.length === 0) return ctx.reply("Belum ada user lain untuk dibroadcast.");

    const status = await ctx.reply(`📣 Broadcast ke ${ids.length} user...`);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await ctx.telegram.sendMessage(id, `📣 <b>Pengumuman</b>\n\n${escapeHtml(text)}`, {
          parse_mode: "HTML",
        });
        ok++;
      } catch (err) {
        fail++;
        logger.warn(`Broadcast gagal ke ${id}:`, err.message);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        status.message_id,
        undefined,
        `✓ Broadcast selesai.\nBerhasil: ${ok}\nGagal: ${fail}`
      );
    } catch (_) {}
  });

  bot.command("addcoin", async (ctx) => {
    if (!isOwner(ctx)) return;
    if (!coins.isEnabled()) {
      return ctx.reply("Sistem koin OFF. Nyalain dulu lewat <code>/setbot</code>.", { parse_mode: "HTML" });
    }
    const parts = (ctx.message.text || "").trim().split(/\s+/);
    const targetId = parts[1];
    const amount = parseInt(parts[2], 10);
    if (!targetId || !/^\d+$/.test(targetId) || !Number.isFinite(amount) || amount === 0) {
      return ctx.reply("Pakai: <code>/addcoin &lt;userId&gt; &lt;jumlah&gt;</code>\nContoh: <code>/addcoin 6106722700 50</code>", {
        parse_mode: "HTML",
      });
    }
    const newBal = coins.addCoins(targetId, amount);
    await ctx.reply(
      `✓ Koin user <code>${escapeHtml(targetId)}</code> diubah ${amount > 0 ? "+" : ""}${amount}.\nSaldo sekarang: <b>${newBal}</b>`,
      { parse_mode: "HTML" }
    );
    try {
      await ctx.telegram.sendMessage(
        targetId,
        `🪙 Owner menyesuaikan koin kamu: ${amount > 0 ? "+" : ""}${amount}\nSaldo sekarang: <b>${newBal}</b>`,
        { parse_mode: "HTML" }
      );
    } catch (_) {}
  });

  bot.command("admin", async (ctx) => {
    if (!isOwner(ctx)) return;
    const menu = require("../../lib/menu");
    await ctx.reply(menu.adminHelpCaption(), { parse_mode: "HTML" });
  });
}

module.exports = { register };