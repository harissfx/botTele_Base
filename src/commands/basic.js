const menu = require("../../lib/menu");
const { safeReplyWithPhoto, getBannerSource } = require("../core/helpers");
const { MAX_FILE_SIZE_MB, COIN_START, COIN_REFERRAL_BONUS, COIN_COST_DOWNLOAD, OWNER_ID } = require("../config");

function isOwner(ctx) {
  return OWNER_ID && String(ctx.from.id) === String(OWNER_ID);
}
const coins = require("../../lib/coins");
const logger = require("../../lib/logger");

async function sendRootMenu(ctx) {
  await safeReplyWithPhoto(ctx, getBannerSource(), {
    caption: menu.ROOT_CAPTION,
    parse_mode: "HTML",
    reply_markup: menu.ROOT_KEYBOARD.reply_markup,
  });
}

function register(bot) {
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const payload = (ctx.startPayload || "").trim();
    const isNew = coins.ensureUser(userId);

    if (isNew && payload.startsWith("ref_")) {
      const referrerId = payload.slice(4).replace(/\D/g, "");
      if (referrerId) {
        const result = coins.applyReferral(userId, referrerId);
        if (result.ok) {
          try {
            await ctx.telegram.sendMessage(
              referrerId,
              `🎉 Referral berhasil!\nUser baru gabung lewat link kamu.\n+${result.bonus} koin → saldo: <b>${result.referrerBalance}</b>`,
              { parse_mode: "HTML" }
            );
          } catch (err) {
            logger.warn("Gagal kirim notif referral ke", referrerId, err.message);
          }
        }
      }
    }

    if (isNew && coins.isEnabled()) {
      await ctx.reply(
        `👋 Selamat datang!\nKamu dapat <b>${COIN_START} koin</b> awal.\n` +
          `Setiap download = ${COIN_COST_DOWNLOAD} koin.\n` +
          `Ajak teman lewat /referral buat dapat +${COIN_REFERRAL_BONUS} koin per orang.\n` +
          `Cek saldo: /koin`,
        { parse_mode: "HTML" }
      );
    }

    await sendRootMenu(ctx);
  });

  bot.command("menu", (ctx) => {
    coins.ensureUser(ctx.from.id);
    return sendRootMenu(ctx);
  });

  bot.command("help", (ctx) =>
    ctx.reply(menu.helpCaption(MAX_FILE_SIZE_MB, isOwner(ctx)), { parse_mode: "HTML" })
  );

  bot.command("history", (ctx) =>
    ctx.reply(menu.historyCaption(ctx.from.id), { parse_mode: "HTML" })
  );

  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply("○ Pong...");
    const latency = Date.now() - start;
    try {
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `○ Pong! ${latency}ms`);
    } catch (_) {}
  });

  async function sendBalance(ctx) {
    if (!coins.isEnabled()) {
      return ctx.reply("Sistem koin sedang <b>OFF</b>.", { parse_mode: "HTML" });
    }
    coins.ensureUser(ctx.from.id);
    const bal = coins.getBalance(ctx.from.id);
    const rec = coins.getUserRecord(ctx.from.id);
    const ownerNote = coins.isOwnerUser(ctx.from.id) ? "\n<i>Owner: download gratis (koin tidak dipotong).</i>" : "";
    await ctx.reply(
      `🪙 <b>Saldo koin</b>: ${bal}\n` +
        `Biaya download: ${COIN_COST_DOWNLOAD} koin\n` +
        `Referral sukses: ${rec ? rec.referralCount : 0}\n` +
        `Ajak teman: /referral${ownerNote}`,
      { parse_mode: "HTML" }
    );
  }
  bot.command("koin", sendBalance);
  bot.command("balance", sendBalance);

  async function sendReferral(ctx) {
    if (!coins.isEnabled()) {
      return ctx.reply("Sistem koin sedang <b>OFF</b>.", { parse_mode: "HTML" });
    }
    coins.ensureUser(ctx.from.id);
    let username = null;
    try {
      const me = await ctx.telegram.getMe();
      username = me.username;
    } catch (_) {}
    const link = coins.buildReferralLink(username, ctx.from.id);
    const rec = coins.getUserRecord(ctx.from.id);
    if (!link) {
      return ctx.reply("Gagal buat link referral (bot belum punya username?).");
    }
    await ctx.reply(
      `🔗 <b>Link referral kamu</b>\n` +
        `<code>${link}</code>\n\n` +
        `Bagikan ke teman. Kalau mereka <b>baru</b> buka bot lewat link ini, kamu dapat <b>+${COIN_REFERRAL_BONUS} koin</b>.\n` +
        `Referral sukses: ${rec ? rec.referralCount : 0}`,
      { parse_mode: "HTML" }
    );
  }
  bot.command("referral", sendReferral);
  bot.command("invite", sendReferral);
}

module.exports = { sendRootMenu, register };