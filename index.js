const express = require(“express”);
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = “https://api.telegram.org/bot” + BOT_TOKEN;
const DEEPL_API = “https://api-free.deepl.com/v2/translate”;

var ENDEARMENTS = [
{ from: “bir tanem”, to: “my one and only”, lang: “TR” },
{ from: “birtanem”, to: “my one and only”, lang: “TR” },
{ from: “sevgilim”, to: “my darling”, lang: “TR” },
{ from: “prensesim”, to: “my princess”, lang: “TR” },
{ from: “prensim”, to: “my prince”, lang: “TR” },
{ from: “bebegim”, to: “my baby”, lang: “TR” },
{ from: “melegim”, to: “my angel”, lang: “TR” },
{ from: “kalbim”, to: “my heart”, lang: “TR” },
{ from: “hayatim”, to: “my life”, lang: “TR” },
{ from: “guzelim”, to: “my beautiful”, lang: “TR” },
{ from: “aslanim”, to: “my lion”, lang: “TR” },
{ from: “tatlim”, to: “my sweet”, lang: “TR” },
{ from: “canim”, to: “my dear”, lang: “TR” },
{ from: “askim”, to: “my love”, lang: “TR” },
{ from: “my one and only”, to: “bir tanem”, lang: “EN” },
{ from: “my beautiful”, to: “guzelim”, lang: “EN” },
{ from: “my princess”, to: “prensesim”, lang: “EN” },
{ from: “my darling”, to: “sevgilim”, lang: “EN” },
{ from: “sweetheart”, to: “canim”, lang: “EN” },
{ from: “my prince”, to: “prensim”, lang: “EN” },
{ from: “my heart”, to: “kalbim”, lang: “EN” },
{ from: “my angel”, to: “melegim”, lang: “EN” },
{ from: “my sweet”, to: “tatlim”, lang: “EN” },
{ from: “my life”, to: “hayatim”, lang: “EN” },
{ from: “my love”, to: “askim”, lang: “EN” },
{ from: “my baby”, to: “bebegim”, lang: “EN” },
{ from: “my dear”, to: “canim”, lang: “EN” },
{ from: “sweetie”, to: “tatlim”, lang: “EN” },
{ from: “darling”, to: “sevgilim”, lang: “EN” },
{ from: “honey”, to: “tatlim”, lang: “EN” },
{ from: “babe”, to: “bebegim”, lang: “EN” },
{ from: “baby”, to: “bebegim”, lang: “EN” },
];

function isOnlyEmoji(text) {
var stripped = text.replace(/\s/g, “”);
if (!stripped) return true;
var i = 0;
var hasEmoji = false;
while (i < stripped.length) {
var code = stripped.codePointAt(i);
var isEmoji = (
(code >= 0x1F000 && code <= 0x1FFFF) ||
(code >= 0x2600 && code <= 0x27FF) ||
(code >= 0x2300 && code <= 0x23FF) ||
(code >= 0x2B00 && code <= 0x2BFF) ||
(code >= 0xFE00 && code <= 0xFEFF) ||
(code >= 0x1F900 && code <= 0x1F9FF) ||
(code >= 0x1FA00 && code <= 0x1FAFF) ||
code === 0x200D ||
code === 0xFE0F ||
code === 0x20E3 ||
code === 0x2764
);
if (!isEmoji) return false;
hasEmoji = true;
i += (code > 0xFFFF) ? 2 : 1;
}
return hasEmoji;
}

function detectLanguage(text) {
// Turkce ozel karakterler (unicode escape ile)
var trChars = /[\u00e7\u00c7\u011f\u011e\u0131\u0130\u00f6\u00d6\u015f\u015e\u00fc\u00dc]/;
if (trChars.test(text)) return “TR”;

var lower = text.toLowerCase();
var trWords = [
“bir”, “bu”, “ve”, “ile”, “ama”, “fakat”,
“da”, “de”, “ki”, “mi”, “ne”, “nasil”,
“neden”, “gibi”, “diye”, “icin”, “ise”,
“bile”, “hep”, “iyi”, “evet”, “hayir”,
“tamam”, “benim”, “senin”, “onun”, “bana”,
“sana”, “bizi”, “sizi”, “ben”, “sen”, “biz”,
“siz”, “yani”, “simdi”, “zaten”, “hala”,
“daha”, “sonra”, “once”, “belki”, “tabii”,
“hersey”, “nerede”, “hangi”, “kadar”,
“fazla”, “veya”, “yoksa”, “degil”, “olan”,
“oldu”, “olur”, “olsa”, “gitti”, “geldi”,
“sever”, “istiyor”, “yapti”, “yapmaz”
];

var words = lower.split(/\s+/);
for (var i = 0; i < words.length; i++) {
var w = words[i].replace(/[^a-z]/g, “”);
if (trWords.indexOf(w) !== -1) return “TR”;
}

return “EN”;
}

function escapeRegex(str) {
return str.replace(/[-.*+?^${}()|[]\]/g, “\$&”);
}

function replaceEndearments(text, sourceLang) {
var result = text;
var map = {};
var idx = 0;

var filtered = ENDEARMENTS.filter(function(e) { return e.lang === sourceLang; });

for (var i = 0; i < filtered.length; i++) {
var entry = filtered[i];
var testRegex = new RegExp(escapeRegex(entry.from), “gi”);
if (testRegex.test(result)) {
var placeholder = “XENDX” + idx + “X”;
map[placeholder] = entry.to;
result = result.replace(new RegExp(escapeRegex(entry.from), “gi”), placeholder);
idx++;
}
}

return { text: result, map: map };
}

function restoreEndearments(text, map) {
var result = text;
var keys = Object.keys(map);
for (var i = 0; i < keys.length; i++) {
result = result.replace(new RegExp(keys[i], “g”), map[keys[i]]);
}
return result;
}

async function translateText(text, targetLang, sourceLang) {
var body = new URLSearchParams();
body.append(“text”, text);
body.append(“target_lang”, targetLang);
body.append(“source_lang”, sourceLang);
if (targetLang === “TR”) {
body.append(“formality”, “prefer_less”);
}

var res = await fetch(DEEPL_API, {
method: “POST”,
headers: {
“Content-Type”: “application/x-www-form-urlencoded”,
“Authorization”: “DeepL-Auth-Key “ + DEEPL_API_KEY
},
body: body.toString()
});

var data = await res.json();
console.log(“DeepL:”, JSON.stringify(data));

if (!data.translations || !data.translations[0]) {
throw new Error(“DeepL error: “ + JSON.stringify(data));
}

return data.translations[0].text;
}

async function sendMessage(chatId, text, replyId) {
var payload = { chat_id: chatId, text: text };
if (replyId) payload.reply_to_message_id = replyId;

var res = await fetch(TELEGRAM_API + “/sendMessage”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify(payload)
});

var data = await res.json();
console.log(“Telegram:”, JSON.stringify(data));
}

async function handleUpdate(update) {
console.log(“Update:”, JSON.stringify(update));

var message = update.message;
if (!message) return;
if (message.from && message.from.is_bot) return;
if (!message.text) return;

var text = message.text.trim();
var chatId = message.chat.id;
var messageId = message.message_id;

if (text === “/start”) {
await sendMessage(chatId, “Merhaba! Ceviri botu hazir. TR-EN otomatik ceviri yapar.”);
return;
}

if (text === “/help”) {
await sendMessage(chatId, “TR - EN otomatik ceviri botu.”);
return;
}

if (text.startsWith(”/”)) return;

if (isOnlyEmoji(text)) {
console.log(“Emoji-only, skip.”);
return;
}

try {
var sourceLang = detectLanguage(text);
var targetLang = sourceLang === “TR” ? “EN” : “TR”;
console.log(“Lang: “ + sourceLang + “ -> “ + targetLang + “ | “ + text);

```
var replaced = replaceEndearments(text, sourceLang);
var translated = await translateText(replaced.text, targetLang, sourceLang);
translated = restoreEndearments(translated, replaced.map);

await sendMessage(chatId, translated, messageId);
```

} catch (err) {
console.error(“Hata:”, err);
await sendMessage(chatId, “Ceviri hatasi.”, messageId);
}
}

app.post(”/webhook/” + WEBHOOK_SECRET, async function(req, res) {
res.status(200).json({ ok: true });
try {
await handleUpdate(req.body);
} catch (e) {
console.error(“Webhook error:”, e);
}
});

app.get(”/”, function(req, res) {
res.send(“bot aktif”);
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
console.log(“Bot calisiyor: “ + PORT);
});
