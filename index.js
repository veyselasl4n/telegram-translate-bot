const express = require("express");
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEEPL_API = "https://api-free.deepl.com/v2/translate";

// Dil tespiti
function detectLanguage(text) {
  const trChars = /[çÇğĞıİöÖşŞüÜ]/;
  return trChars.test(text) ? "TR" : "EN";
}

// DeepL çeviri
async function translateText(text, targetLang) {
  const body = new URLSearchParams({
    auth_key: DEEPL_API_KEY,
    text,
    target_lang: targetLang
  });

  const res = await fetch(DEEPL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const data = await res.json();
  return data.translations?.[0]?.text || text;
}

// Telegram mesaj
async function sendMessage(chatId, text, replyToMessageId = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  };

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// update handler
async function handleUpdate(update) {
  const message = update.message;
  if (!message || !message.text) return;
  if (message.from?.is_bot) return;

  const text = message.text.trim();
  const chatId = message.chat.id;
  const messageId = message.message_id;

  if (text === "/start") {
    return sendMessage(chatId, "Merhaba 👋 çeviri botu hazır.");
  }

  if (text === "/help") {
    return sendMessage(chatId, "TR ↔ EN otomatik çeviri botu.");
  }

  if (text.startsWith("/")) return;

  try {
    const sourceLang = detectLanguage(text);
    const targetLang = sourceLang === "TR" ? "EN" : "TR";

    const translated = await translateText(text, targetLang);

    await sendMessage(chatId, translated, messageId);
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, "Çeviri hatası ❌", messageId);
  }
}

// webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  res.sendStatus(200);
  try {
    await handleUpdate(req.body);
  } catch (e) {
    console.error("Webhook error:", e);
  }
});

// health
app.get("/", (req, res) => {
  res.send("bot aktif");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot çalışıyor:", PORT);
});
