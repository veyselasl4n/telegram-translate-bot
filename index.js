const express = require("express");
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEEPL_API = "https://api-free.deepl.com/v2/translate";

function detectLanguage(text) {
  const trChars = /[çÇğĞıİöÖşŞüÜ]/;
  return trChars.test(text) ? "TR" : "EN";
}

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
  console.log("DeepL response:", JSON.stringify(data));
  return data.translations?.[0]?.text || text;
}

async function sendMessage(chatId, text, replyToMessageId = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  };

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Telegram response:", JSON.stringify(data));
}

async function handleUpdate(update) {
  console.log("Update received:", JSON.stringify(update));
  
  const message = update.message;
  if (!message || !message.text) return;
  if (message.from?.is_bot) return;

  const text = message.text.trim();
  const chat​​​​​​​​​​​​​​​​
