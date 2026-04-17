const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEEPL_API = "https://api-free.deepl.com/v2/translate";


// TR mi EN mi algıla
function detectLanguage(text) {
  const trChars = /[çÇğĞıİöÖşŞüÜ]/;
  return trChars.test(text) ? "TR" : "EN";
}


// SADECE YAZIYI ÇEVİR (emoji ve GIF hariç)
function extractTextOnly(text) {
  // emoji + özel karakterleri silmeden sadece text mantığını korur
  // DeepL zaten emojiyi bozmaz ama güvenlik için filtre
  return text;
}


async function translateText(text, targetLang) {
  const body = new URLSearchParams({
    auth_key: DEEPL_API_KEY,
    text: text,
    target_lang: targetLang,
  });

  const res = await fetch(DEEPL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  return data.translations[0].text;
}


async function sendMessage(chatId, text, replyToMessageId) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId,
    }),
  });
}


async function handleUpdate(update) {
  const message = update.message;

  // ❌ text yoksa (GIF, sticker, video vs) SKIP
  if (!message) return;
  if (!message.text) return; // <-- GIF, sticker vs burada eleniyor

  // bot mesajını ignore
  if (message.from?.is_bot) return;

  const text = message.text.trim();
  const chatId = message.chat.id;

  // komutlar
  if (text === "/start") {
    return sendMessage(
      chatId,
      "👋 Bot aktif!\nTR ↔ EN çeviri yapıyorum.\nSadece yazı gönder."
    );
  }

  if (text.startsWith("/")) return;

  try {
    const cleanText = extractTextOnly(text);

    const sourceLang = detectLanguage(cleanText);
    const targetLang = sourceLang === "TR" ? "EN" : "TR";

    const translated = await translateText(cleanText, targetLang);

    await sendMessage(
      chatId,
      translated,
      message.message_id
    );

  } catch (err) {
    console.error(err);
    await sendMessage(chatId, "❌ Çeviri hatası oluştu");
  }
}


// webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  res.sendStatus(200);

  try {
    await handleUpdate(req.body);
  } catch (e) {
    console.error(e);
  }
});


// test
app.get("/", (req, res) => {
  res.send("Bot çalışıyor");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot aktif");
});
