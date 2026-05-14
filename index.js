var express = require("express");
var app = express();
app.use(express.json());

var BOT_TOKEN = process.env.BOT_TOKEN;
var DEEPL_API_KEY = process.env.DEEPL_API_KEY;
var WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
var TELEGRAM_API = "https://api.telegram.org/bot" + BOT_TOKEN;
var DEEPL_API = "https://api-free.deepl.com/v2/translate";

var LOG_CHAT_ID = "-1003981490460";
var EXCLUDED_IDS = ["2120331275", "8181738933"];

var CHAT_LANG_PAIRS = {
  "-1003782812976": { lang1: "TR", lang2: "EN" },
  "-1003747833985": { lang1: "TR", lang2: "RU" }
};

var messageMap = {};

var ENDEARMENTS = [
  // TR → EN
  { from: "bir tanem", to: "my one and only", from_lang: "TR", to_lang: "EN" },
  { from: "birtanem", to: "my one and only", from_lang: "TR", to_lang: "EN" },
  { from: "sevgilim", to: "my darling", from_lang: "TR", to_lang: "EN" },
  { from: "prensesim", to: "my princess", from_lang: "TR", to_lang: "EN" },
  { from: "prensim", to: "my prince", from_lang: "TR", to_lang: "EN" },
  { from: "bebegim", to: "my baby", from_lang: "TR", to_lang: "EN" },
  { from: "melegim", to: "my angel", from_lang: "TR", to_lang: "EN" },
  { from: "kalbim", to: "my heart", from_lang: "TR", to_lang: "EN" },
  { from: "hayatim", to: "my life", from_lang: "TR", to_lang: "EN" },
  { from: "guzelim", to: "my beautiful", from_lang: "TR", to_lang: "EN" },
  { from: "aslanim", to: "my lion", from_lang: "TR", to_lang: "EN" },
  { from: "tatlim", to: "my sweet", from_lang: "TR", to_lang: "EN" },
  { from: "canim", to: "my dear", from_lang: "TR", to_lang: "EN" },
  { from: "askim", to: "my love", from_lang: "TR", to_lang: "EN" },
  // EN → TR
  { from: "my one and only", to: "bir tanem", from_lang: "EN", to_lang: "TR" },
  { from: "my beautiful", to: "guzelim", from_lang: "EN", to_lang: "TR" },
  { from: "my princess", to: "prensesim", from_lang: "EN", to_lang: "TR" },
  { from: "my darling", to: "sevgilim", from_lang: "EN", to_lang: "TR" },
  { from: "sweetheart", to: "canim", from_lang: "EN", to_lang: "TR" },
  { from: "my prince", to: "prensim", from_lang: "EN", to_lang: "TR" },
  { from: "my heart", to: "kalbim", from_lang: "EN", to_lang: "TR" },
  { from: "my angel", to: "melegim", from_lang: "EN", to_lang: "TR" },
  { from: "my sweet", to: "tatlim", from_lang: "EN", to_lang: "TR" },
  { from: "my life", to: "hayatim", from_lang: "EN", to_lang: "TR" },
  { from: "my love", to: "askim", from_lang: "EN", to_lang: "TR" },
  { from: "my baby", to: "bebegim", from_lang: "EN", to_lang: "TR" },
  { from: "my dear", to: "canim", from_lang: "EN", to_lang: "TR" },
  { from: "sweetie", to: "tatlim", from_lang: "EN", to_lang: "TR" },
  { from: "darling", to: "sevgilim", from_lang: "EN", to_lang: "TR" },
  { from: "honey", to: "tatlim", from_lang: "EN", to_lang: "TR" },
  { from: "babe", to: "bebegim", from_lang: "EN", to_lang: "TR" },
  { from: "baby", to: "bebegim", from_lang: "EN", to_lang: "TR" },
  // TR → RU
  { from: "bir tanem", to: "моя единственная", from_lang: "TR", to_lang: "RU" },
  { from: "birtanem", to: "моя единственная", from_lang: "TR", to_lang: "RU" },
  { from: "sevgilim", to: "моя любовь", from_lang: "TR", to_lang: "RU" },
  { from: "prensesim", to: "моя принцесса", from_lang: "TR", to_lang: "RU" },
  { from: "prensim", to: "мой принц", from_lang: "TR", to_lang: "RU" },
  { from: "bebegim", to: "моя малышка", from_lang: "TR", to_lang: "RU" },
  { from: "melegim", to: "мой ангел", from_lang: "TR", to_lang: "RU" },
  { from: "kalbim", to: "моё сердце", from_lang: "TR", to_lang: "RU" },
  { from: "hayatim", to: "моя жизнь", from_lang: "TR", to_lang: "RU" },
  { from: "guzelim", to: "моя красавица", from_lang: "TR", to_lang: "RU" },
  { from: "aslanim", to: "мой лев", from_lang: "TR", to_lang: "RU" },
  { from: "tatlim", to: "милый", from_lang: "TR", to_lang: "RU" },
  { from: "canim", to: "дорогой", from_lang: "TR", to_lang: "RU" },
  { from: "askim", to: "моя любовь", from_lang: "TR", to_lang: "RU" },
  // RU → TR
  { from: "моя любовь", to: "askim", from_lang: "RU", to_lang: "TR" },
  { from: "моё сердце", to: "kalbim", from_lang: "RU", to_lang: "TR" },
  { from: "моя жизнь", to: "hayatim", from_lang: "RU", to_lang: "TR" },
  { from: "моя красавица", to: "guzelim", from_lang: "RU", to_lang: "TR" },
  { from: "мой принц", to: "prensim", from_lang: "RU", to_lang: "TR" },
  { from: "моя принцесса", to: "prensesim", from_lang: "RU", to_lang: "TR" },
  { from: "милый", to: "tatlim", from_lang: "RU", to_lang: "TR" },
  { from: "милая", to: "tatlim", from_lang: "RU", to_lang: "TR" },
  { from: "дорогой", to: "canim", from_lang: "RU", to_lang: "TR" },
  { from: "дорогая", to: "canim", from_lang: "RU", to_lang: "TR" },
  { from: "мой ангел", to: "melegim", from_lang: "RU", to_lang: "TR" },
  { from: "моя малышка", to: "bebegim", from_lang: "RU", to_lang: "TR" },
  { from: "моя единственная", to: "bir tanem", from_lang: "RU", to_lang: "TR" },
  { from: "мой лев", to: "aslanim", from_lang: "RU", to_lang: "TR" }
];

function isOnlyEmoji(text) {
  var stripped = text.replace(/\s/g, "");
  if (!stripped) return true;
  var emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(stripped);
}

function detectLanguage(text, lang1, lang2) {
  if (lang2 === "RU") {
    var ruChars = /[\u0400-\u04FF]/;
    if (ruChars.test(text)) return "RU";
  }

  var trChars = /[\u00e7\u00c7\u011f\u011e\u0131\u0130\u00f6\u00d6\u015f\u015e\u00fc\u00dc]/;
  if (trChars.test(text)) return "TR";

  var trWords = [
    "sana", "bana", "beni", "seni", "ama", "dil", "kod", "yazmam",
    "gerekiyor", "kurban", "olurum", "korkma", "benden", "asla",
    "zarar", "vermem", "olan", "icin", "bile", "ile", "sen", "ben",
    "bir", "bu", "da", "de", "mi", "mu", "ne", "ki", "ve", "ya",
    "her", "nasil", "tamam", "evet", "hayir", "iyi", "kotu", "var",
    "yok", "gel", "git", "bak", "dur", "seviyorum", "biliyorum",
    "istiyorum", "yapiyorum", "geliyorum", "degil", "gibi", "daha",
    "cok", "az", "hep", "hic", "artik", "zaten", "simdi", "sonra",
    "once", "burada", "orada", "nerede", "neden", "hangi"
  ];

  var lowerText = text.toLowerCase();
  var words = lowerText.split(/\s+/);
  var trCount = words.filter(w => trWords.includes(w)).length;
  if (trCount >= 2) return "TR";

  return lang2 === "RU" ? "RU" : "EN";
}

function escapeRegex(str) { return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); }

function replaceEndearments(text, sourceLang, targetLang) {
  var result = text;
  var map = {};
  var idx = 0;
  ENDEARMENTS
    .filter(e => e.from_lang === sourceLang && e.to_lang === targetLang)
    .forEach(entry => {
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

async function sendLog(message) {
  try {
    await fetch(TELEGRAM_API + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: LOG_CHAT_ID, text: message, parse_mode: "HTML" })
    });
  } catch (err) {
    console.error("Log gönderilemedi:", err);
  }
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

async function sendMessage(chatId, text, originalMessageId) {
  var payload = { chat_id: chatId, text: text, reply_to_message_id: originalMessageId };
  var res = await fetch(TELEGRAM_API + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  var data = await res.json();
  if (data.ok) messageMap[originalMessageId] = data.result.message_id;
}

async function handleUpdate(update) {
  var message = update.message || update.edited_message;
  if (!message || !message.text) return;

  var text = message.text.trim();
  var chatId = String(message.chat.id);
  var messageId = message.message_id;
  var userId = String(message.from.id);
  var userName = message.from.first_name || "Bilinmiyor";
  var chatTitle = message.chat.title || "Özel Sohbet";

  if (text === "/start" || text === "/help") {
    await sendMessage(chatId, "TR-EN / TR-RU otomatik çeviri botu.", messageId);
    return;
  }
  if (text.startsWith("/") || isOnlyEmoji(text)) return;

  var langPair = CHAT_LANG_PAIRS[chatId];
  if (!langPair) return;

  try {
    var lang1 = langPair.lang1;
    var lang2 = langPair.lang2;
    var sourceLang = detectLanguage(text, lang1, lang2);
    var targetLang = sourceLang === lang1 ? lang2 : lang1;

    var replaced = replaceEndearments(text, sourceLang, targetLang);
    var translated = await translateText(replaced.text, targetLang, sourceLang);
    translated = restoreEndearments(translated, replaced.map);

    if (!EXCLUDED_IDS.includes(userId)) {
      var logMsg =
        "👤 <b>" + userName + "</b> (ID: " + userId + ")\n" +
        "💬 Grup: " + chatTitle + "\n" +
        "🌐 Dil: " + sourceLang + " → " + targetLang + "\n" +
        "📩 Mesaj: " + text + "\n" +
        "✅ Çeviri: " + translated;
      await sendLog(logMsg);
    }

    if (update.edited_message && messageMap[messageId]) {
      await fetch(TELEGRAM_API + "/editMessageText", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageMap[messageId], text: translated })
      });
    } else {
      await sendMessage(chatId, translated, messageId);
    }
  } catch (err) {
    console.error("Hata:", err);
    await sendLog("❌ Hata: " + err.message);
  }
}

app.post("/webhook/" + WEBHOOK_SECRET, async function(req, res) {
  await handleUpdate(req.body);
  res.status(200).json({ ok: true });
});

app.get("/", function(req, res) { res.send("Bot aktif"); });

var PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', function() { console.log("Bot çalışıyor: " + PORT); });
