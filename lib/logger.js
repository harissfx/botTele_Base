const chalk = require("chalk");
const figlet = require("figlet");
const Spinnies = require("spinnies");

const LEVELS = {
  INFO: { color: chalk.cyan, stream: console.log },
  OK: { color: chalk.green, stream: console.log },
  WARN: { color: chalk.yellow, stream: console.warn },
  ERROR: { color: chalk.red, stream: console.error },
  CMD: { color: chalk.magenta, stream: console.log },
  CB: { color: chalk.blue, stream: console.log },
  MSG: { color: chalk.white, stream: console.log },
};

const spinnies = new Spinnies({
  color: "blue",
  succeedColor: "green",
  spinner: {
    interval: 120,
    frames: [
      "M", "Me", "Men", "Menu", "Menun", "Menung", "Menungg", "Menunggu ",
      "Menunggu P", "Menunggu Pes", "Menunggu Pesa", "Menunggu Pesan",
      "Menunggu Pesan.", "Menunggu Pesan..", "Menunggu Pesan...",
      "Menunggu Pesan..", "Menunggu Pesan.", "Menunggu Pesan",
      "Menunggu Pesa", "Menunggu Pes", "Menunggu Pe", "Menunggu P",
      "Menunggu", "Menungg", "Menung", "Menun", "Menu", "Men", "Me", "M",
    ],
  },
});

let spinnerActive = false;

function startWaitingSpinner() {
  if (spinnerActive) return;
  spinnerActive = true;
  try {
    spinnies.add("waiting", { text: "." });
  } catch (_) {}
}

function stopWaitingSpinner() {
  if (!spinnerActive) return;
  spinnerActive = false;
  try {
    spinnies.remove("waiting");
  } catch (_) {}
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function write(level, args) {
  const { color, stream } = LEVELS[level];
  const prefix = `${chalk.gray(timestamp())} ${color.bold(`[${level}]`)}`;

  if (spinnerActive) {
    try {
      spinnies.remove("waiting");
    } catch (_) {}
    stream(prefix, ...args);
    try {
      spinnies.add("waiting", { text: "." });
    } catch (_) {}
  } else {
    stream(prefix, ...args);
  }
}

function printBanner({ botUsername, ownerConfigured, maxFileSizeMB } = {}) {
  console.clear();
  let ascii;
  try {
    ascii = figlet.textSync("Bot DL", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: false,
    });
  } catch (_) {
    ascii = "BOT DOWNLOADER";
  }
  console.log(chalk.cyan(ascii));
  console.log(chalk.cyan("================================================="));
  if (botUsername) console.log(chalk.cyan(" • Bot          :"), chalk.white(`@${botUsername}`));
  console.log(
    chalk.cyan(" • Akses        :"),
    ownerConfigured ? chalk.green("OWNER_ID terpasang (privat)") : chalk.yellow("OWNER_ID kosong (siapa aja bisa pakai!)")
  );
  if (maxFileSizeMB) console.log(chalk.cyan(" • Batas file   :"), chalk.white(`${maxFileSizeMB}MB`));
  console.log(chalk.cyan("================================================="));
  console.log("");
}

module.exports = {
  info: (...args) => write("INFO", args),
  ok: (...args) => write("OK", args),
  warn: (...args) => write("WARN", args),
  error: (...args) => write("ERROR", args),
  cmd: (...args) => write("CMD", args),
  cb: (...args) => write("CB", args),
  msg: (...args) => write("MSG", args),
  printBanner,
  startWaitingSpinner,
  stopWaitingSpinner,
};