const fs = require("fs");
const path = require("path");

const DOWNLOAD_DIR = path.join(__dirname, "..", "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

module.exports = {
  DOWNLOAD_DIR,
  activeDownloads: 0,
  queue: [],
  jobRegistry: new Map(),
  pending: new Map(),
  convertPending: new Map(),
  stickerMode: new Map(),
};
