var express = require("express");
var app = express();
app.use(express.json());

var BOT_TOKEN = process.env.BOT_TOKEN;
var DEEPL_API_KEY = process.env.DEEPL_API_KEY;
var WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
var TELEGRAM_API = "https://api.telegram.org/bot" + BOT_TOKEN;
var DEEPL_API = "https://api-free.deepl.com/v2/translate";

// Hafıza: { 'kullanici_mesaj_id': 'bot_mesaj_id' }
var messageMap = {};

var ENDEARMENTS = [
  { from: "bir tanem", to: "my one and only", lang: "TR" },
  { from: "birtanem", to: "my one and only", lang: "TR" },
  { from: "sevgilim", to: "my darling", lang: "TR" },
  { from: "prensesim", to: "my princess", lang: "TR" },
  { from: "prensim", to: "my prince", lang: "TR" },
  { from: "bebegim", to: "my baby", lang: "TR" },
  { from: "melegim", to: "my angel", lang: "TR" },
  { from: "kalbim", to: "my heart", lang: "TR" },
  { from: "hayatim", to: "my life", lang: "TR" },
  { from: "guzelim", to: "my beautiful", lang: "TR" },
  { from: "aslanim", to: "my lion", lang: "TR" },
  { from: "tatlim", to: "my sweet", lang: "TR" },
  { from: "canim", to: "my dear", lang: "TR" },
  { from: "askim", to: "my love", lang: "TR" },
  { from: "my one and only", to: "bir tanem", lang: "EN" },
  { from: "my beautiful", to: "guzelim", lang: "EN" },
  { from: "my princess", to: "prensesim", lang: "EN" },
  { from: "my darling", to: "sevgilim", lang: "EN" },
  { from: "sweetheart", to: "canim", lang: "EN" },
  { from: "my prince", to: "prensim", lang: "EN" },
  { from: "my heart", to: "kalbim", lang: "EN" },
  { from: "my angel", to: "melegim", lang: "EN" },
  { from: "my sweet", to: "tatlim", lang: "EN" },
  { from: "my life", to: "hayatim", lang: "EN" },
  { from: "my love", to: "askim", lang: "EN" },
  { from: "my baby", to: "bebegim", lang: "EN" },
  { from: "my dear", to: "canim", lang: "EN" },
  { from: "sweetie", to: "tatlim", lang: "EN" },
  { from: "darling", to: "sevgilim", lang: "EN" },
  { from: "honey", to: "tatlim", lang: "EN" },
  { from: "babe", to: "bebegim", lang: "EN" },
  { from: "baby", to: "bebegim", lang: "EN" }
];

function isOnlyEmoji(text) {
  var stripped = text.replace(/\s/g, "");
  if (!stripped) return true;
  var emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(stripped);
}

function detectLanguage(text) {
  var trChars = /[\u00e7\u00c7\u011f\u011e\u0131\u0130\u00f6\u00d6\u015f\u015e\u00fc\u00dc]/;
  return trChars.test(text) ? "TR" : "EN";
}

function escapeRegex(str) { return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); }

function replaceEndearments(text, sourceLang) {
  var result = text;
  var map = {};
  var idx = 0;
  ENDEARMENTS.filter(e => e.lang === sourceLang).forEach(entry => {
    var pattern = new RegExp("\\b" + escapeRegex(entry.from) + "\\b", "gi");
    if (pattern.test(result)) {
      var placeholder = "XENDX" + idx + "X";
      map[placeholder] = entry.to;
      result = result.replace(pattern, placeholder);
      idx++;
    }
  });
  return { text: result, map: map };
}

function restoreEndearments(text, map) {
  var result = text;
  for (var key in map) result = result.replace(new RegExp(key, "g"), map[key]);
  return result;
}

async function translateText(text, targetLang, sourceLang) {
  var body = new URLSearchParams();
  body.append("text", text);
  body.append("target_lang", targetLang);
  body.append("source_lang", sourceLang);
  if (targetLang === "TR") body.append("formality", "prefer_less");

  var res = await fetch(DEEPL_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "DeepL-Auth-Key " + DEEPL_API_KEY },
    body: body.toString()
  });
  var data = await res.json();
  return data.translations[0].text;
}

// Bot mesaj gönderdiğinde ID'sini hafızaya kaydediyoruz
async function sendMessage(chatId, text, originalMessageId) {
  var payload = { chat_id: chatId, text: text, reply_to_message_id: originalMessageId };
  var res = await fetch(TELEGRAM_API + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  var data = await res.json();
  if (data.ok) messageMap[originalMessageId] = data.result.message_id;
}

async function handleUpdate(update) {
  // Hem normal hem de düzenlenen mesajları al
  var message = update.message || update.edited_message;
  if (!message || !message.text) return;

  var text = message.text.trim();
  var chatId = message.chat.id;
  var messageId = message.message_id;

  if (text === "/start" || text === "/help") {
    await sendMessage(chatId, "TR-EN otomatik çeviri botu.", messageId);
    return;
  }
  if (text.startsWith("/") || isOnlyEmoji(text)) return;

  try {
    var sourceLang = detectLanguage(text);
    var targetLang = sourceLang === "TR" ? "EN" : "TR";
    var replaced = replaceEndearments(text, sourceLang);
    var translated = await translateText(replaced.text, targetLang, sourceLang);
    translated = restoreEndearments(translated, replaced.map);

    // Mesaj daha önce gönderildiyse (düzenleme varsa) GÜNCELLE
    if (update.edited_message && messageMap[messageId]) {
      await fetch(TELEGRAM_API + "/editMessageText", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageMap[messageId], text: translated })
      });
    } else {
      // Yeni mesaj ise gönder
      await sendMessage(chatId, translated, messageId);
    }
  } catch (err) { console.error("Hata:", err); }
}

app.post("/webhook/" + WEBHOOK_SECRET, async function(req, res) {
  await handleUpdate(req.body);
  res.status(200).json({ ok: true });
});

app.get("/", function(req, res) { res.send("Bot aktif"); });

var PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', function() { console.log("Bot çalışıyor: " + PORT); });
