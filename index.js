const express = require("express");
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = "https://api.telegram.org/bot" + BOT_TOKEN;
const DEEPL_API = "https://api-free.deepl.com/v2/translate";

function detectLanguage(text) {
  const trChars = /[çÇğĞıİöÖşŞüÜ]/;
  return trChars.test(text) ? "TR" : "EN";
}

async function translateText(text, targetLang) {
  const body = new URLSearchParams();
  body.append("auth_key", DEEPL_API_KEY);
  body.append("text", text);
  body.append("target_lang", targetLang);

  const res = await fetch(DEEPL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const data = await res.json();
  console.log("DeepL:", JSON.stringify(data));
  return data.translations[0].text;
}

async function sendMessage(chatId, text, replyId) {
  const payload = { chat_id: chatId, text: text };
  if (replyId) payload.reply_to_message_id = replyId;

  const res = await fetch(TELEGRAM_API + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Telegram:", JSON.stringify(data));
}

async function handleUpdate(update) {
  console.log("Update:", JSON.stringify(update));

  const message = update.message;
  if (!message || !message.text) return;
  if (message.from && message.from.is_bot) return;

  const text = message.text.trim();
  const chatId = message.chat.id;
  const messageId = message.message_id;

  if (text === "/start") {
    await sendMessage(chatId, "Merhaba! Ceviri botu hazir.");
    return;
  }

  if (text === "/help") {
    await sendMessage(chatId, "TR - EN otomatik ceviri botu.");
    return;
  }

  if (text.startsWith("/")) return;

  try {
    const sourceLang = detectLanguage(text);
    const targetLang = sourceLang === "TR" ? "EN" : "TR";
    console.log("Translating from " + sourceLang + " to " + targetLang);

    const translated = await translateText(text, targetLang);
    await sendMessage(chatId, translated, messageId);
  } catch (err) {
    console.error("Hata:", err);
    await sendMessage(chatId, "Ceviri hatasi", messageId);
  }
}

app.post("/webhook/" + WEBHOOK_SECRET, async function(req, res) {
  res.status(200).json({ ok: true });
  try {
    await handleUpdate(req.body);
  } catch (e) {
    console.error("Webhook error:", e);
  }
});

app.get("/", function(req, res) {
  res.send("bot aktif");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Bot calisiyor: " + PORT);
});
