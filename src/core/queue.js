const crypto = require("crypto");
const { MAX_CONCURRENT } = require("../config");
const state = require("./state");

function runNext() {
  if (state.activeDownloads >= MAX_CONCURRENT || state.queue.length === 0) return;
  const { jobId, run } = state.queue.shift();
  updateQueuePositions();
  const job = state.jobRegistry.get(jobId);
  if (!job || job.cancelled) {
    state.jobRegistry.delete(jobId);
    return runNext();
  }
  job.status = "running";
  state.activeDownloads++;
  run().finally(() => {
    state.activeDownloads--;
    state.jobRegistry.delete(jobId);
    runNext();
  });
}

function enqueue(userId, job, onQueued) {
  const jobId = crypto.randomBytes(4).toString("hex");
  return new Promise((resolve) => {
    state.jobRegistry.set(jobId, { userId, status: "queued", proc: null, cancelled: false, resolve, onQueued });
    state.queue.push({
      jobId,
      run: async () => {
        await job(jobId);
        resolve();
      },
    });
    if (state.activeDownloads >= MAX_CONCURRENT) {
      updateQueuePositions();
    }
    runNext();
  });
}

function updateQueuePositions() {
  state.queue.forEach((item, idx) => {
    const job = state.jobRegistry.get(item.jobId);
    if (job && job.onQueued) {
      try {
        job.onQueued(idx + 1, state.queue.length);
      } catch (_) {}
    }
  });
}

function findJobByUser(userId) {
  for (const [jobId, job] of state.jobRegistry.entries()) {
    if (String(job.userId) === String(userId)) return { jobId, job };
  }
  return null;
}

module.exports = { enqueue, findJobByUser, updateQueuePositions };
