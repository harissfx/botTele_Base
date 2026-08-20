require("dotenv").config();
const path = require("path");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "48", 10);
const OWNER_ID = process.env.OWNER_ID ? String(process.env.OWNER_ID).trim() : null;
const GALLERY_DL_COOKIES_FILE = process.env.GALLERY_DL_COOKIES_FILE
  ? path.resolve(process.env.GALLERY_DL_COOKIES_FILE)
  : null;
const BANNER_URL =
  process.env.BANNER_URL ||
  "https://placehold.co/1200x400/1c2733/ffffff?text=Bot+Downloader";

const PLAYLIST_LIMIT = parseInt(process.env.PLAYLIST_LIMIT || "5", 10);
const AUTO_COMPRESS = String(process.env.AUTO_COMPRESS || "true").toLowerCase() !== "false";

const MAX_CONCURRENT = 2;

module.exports = {
  BOT_TOKEN,
  MAX_FILE_SIZE_MB,
  OWNER_ID,
  GALLERY_DL_COOKIES_FILE,
  BANNER_URL,
  PLAYLIST_LIMIT,
  AUTO_COMPRESS,
  MAX_CONCURRENT,
};
