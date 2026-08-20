const state = require("../core/state");
const { findJobByUser, updateQueuePositions } = require("../core/queue");

function register(bot) {

  bot.command("cancel", async (ctx) => {
    const userId = ctx.from.id;
    const found = findJobByUser(userId);
    if (!found) {
      return ctx.reply("ℹ️ Kamu gak punya download yang lagi jalan atau di antrian.");
    }
    const { jobId, job } = found;
    job.cancelled = true;

    if (job.status === "running" && job.proc) {
      job.proc.kill("SIGKILL");
      await ctx.reply("🚫 Membatalkan download yang sedang berjalan...");
    } else {
      const idx = state.queue.findIndex((q) => q.jobId === jobId);
      if (idx !== -1) state.queue.splice(idx, 1);
      state.jobRegistry.delete(jobId);
      if (job.resolve) job.resolve();
      updateQueuePositions();
      await ctx.reply("🚫 Download di antrian dibatalkan.");
    }
  });
}

module.exports = { register };
