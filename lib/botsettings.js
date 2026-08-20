const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, "bot_settings.json");

function defaultsFromEnv() {
  const coinDefault = String(process.env.COIN_SYSTEM || "false").toLowerCase() === "true";
  const hasOwner = Boolean(process.env.OWNER_ID && String(process.env.OWNER_ID).trim());
  const modeDefault = hasOwner ? "self" : "public";
  return { mode: modeDefault, coinSystem: coinDefault };
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
      const d = defaultsFromEnv();
      return {
        mode: data.mode === "public" ? "public" : "self",
        coinSystem: typeof data.coinSystem === "boolean" ? data.coinSystem : d.coinSystem,
      };
    }
  } catch (_) {}
  const d = defaultsFromEnv();
  save(d);
  return d;
}

function save(settings) {
  fs.writeFileSync(FILE, JSON.stringify(settings, null, 2));
}

function getSettings() {
  return load();
}

function setMode(mode) {
  const s = load();
  s.mode = mode === "public" ? "public" : "self";
  save(s);
  return s;
}

function setCoinSystem(enabled) {
  const s = load();
  s.coinSystem = Boolean(enabled);
  save(s);
  return s;
}

function isPublic() {
  return load().mode === "public";
}

function isCoinEnabled() {
  return Boolean(load().coinSystem);
}

module.exports = { getSettings, setMode, setCoinSystem, isPublic, isCoinEnabled };