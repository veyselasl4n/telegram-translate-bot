const express = require(“express”);
const app = express();

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = “https://api.telegram.org/bot” + BOT_TOKEN;
const DEEPL_API = “https://api-free.deepl.com/v2/translate”;

// Sevgi sözcükleri - çeviri öncesi manuel map
const TERM_OF_ENDEARMENT_MAP = {
// TR -> EN
“aşkım”: “my love”,
“aşkı”: “my love”,
“bebeğim”: “my baby”,
“bebeği”: “my baby”,
“kalbim”: “my heart”,
“meleğim”: “my angel”,
“canım”: “my dear”,
“tatlım”: “my sweet”,
“hayatım”: “my life”,
“güzelim”: “my beautiful”,
“sevgilim”: “my darling”,
“birtanem”: “my one and only”,
“bir tanem”: “my one and only”,
“prensesim”: “my princess”,
“prensim”: “my prince”,
“aslanım”: “my lion”,
// EN -> TR
“babe”: “bebeğim”,
“baby”: “bebeğim”,
“honey”: “tatlım”,
“sweetheart”: “canım”,
“sweetie”: “tatlım”,
“darling”: “sevgilim”,
“my love”: “aşkım”,
“my angel”: “meleğim”,
“my heart”: “kalbim”,
“my dear”: “canım”,
“my baby”: “bebeğim”,
“my sweet”: “tatlım”,
“my life”: “hayatım”,
“my beautiful”: “güzelim”,
“my darling”: “sevgilim”,
“my princess”: “prensesim”,
“my prince”: “prensim”,
};

// Sadece emoji/gif içeren mesajı algıla - çevirme
function isOnlyEmojiOrMedia(text) {
// Telegram GIF/sticker mesajları zaten text olmaz ama yine de kontrol
// Emoji-only kontrolü: tüm karakterler emoji veya boşluk mu?
const stripped = text.replace(/[\s\n]/g, “”);
if (!stripped) return true;

// Unicode emoji regex
const emojiRegex = /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}❤️‍🔥\u200d\uFE0F\u20E3\u{E0000}-\u{E007F}]+$/u;
return emojiRegex.test(stripped);
}

// Gelişmiş dil tespiti
function detectLanguage(text) {
// Türkçe’ye özgü karakterler
const trSpecificChars = /[çÇğĞıİöÖşŞüÜ]/;
if (trSpecificChars.test(text)) return “TR”;

// Türkçe’ye özgü kelimeler (karaktersiz yazılmış olabilir)
const trWords = /\b(bir|bu|ve|ile|ama|da|de|ki|mi|mu|mü|ne|nasil|nasıl|neden|gibi|diye|icin|için|ise|bile|hep|cok|çok|iyi|kötü|kotu|evet|hayir|tamam|benim|senin|onun|bizim|sizin|onların|bana|sana|ona|bizi|sizi|onlari|ben|sen|biz|siz|onu|ama|fakat|lakin|yani|artik|artık|simdi|şimdi|zaten|hala|hâlâ|daha|sonra|once|önce|belki|mutlaka|tabii|tabi|elbette|hersey|herşey|hicbir|hiçbir|nerede|nereye|nereden|hangi|kadar|fazla|az|cok|çok|en|ile|veya|yoksa)\b/i;
if (trWords.test(text)) return “TR”;

return “EN”;
}

// Sevgi sözcüklerini koru: çeviri öncesi placeholder ile değiştir, sonra geri koy
function applyEndearmentMap(text, sourceLang) {
let result = text;
const placeholders = {};
let idx = 0;

// Kaynak dile göre hangi kelimeleri arayacağımızı belirle
const entries = Object.entries(TERM_OF_ENDEARMENT_MAP).filter(([key]) => {
if (sourceLang === “TR”) {
// Türkçe kaynaktan EN’e gidecek - TR kelimeleri ara
return /[a-zçğışöüA-ZÇĞİŞÖÜ]/.test(key) && !/\s/.test(key) || /\s/.test(key);
} else {
// İngilizce kaynaktan TR’ye gidecek - EN kelimeleri ara
return /^[a-zA-Z\s]+$/.test(key);
}
});

// Uzun ifadeleri önce işle (örn: “my love” önce, “love” sonra)
const sorted = entries.sort((a, b) => b[0].length - a[0].length);

for (const [term, replacement] of sorted) {
const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, “gi”);
result = result.replace(regex, (match) => {
const placeholder = `__ENDEARMENT_${idx}__`;
placeholders[placeholder] = replacement;
idx++;
return placeholder;
});
}

return { text: result, placeholders };
}

function restorePlaceholders(text, placeholders) {
let result = text;
for (const [placeholder, value] of Object.entries(placeholders)) {
result = result.replace(new RegExp(escapeRegex(placeholder), “g”), value);
}
return result;
}

function escapeRegex(str) {
return str.replace(/[.*+?^${}()|[]\]/g, “\$&”);
}

// Zamir belirsizliği için context hint ekle
function buildTranslationPrompt(text, sourceLang) {
if (sourceLang === “TR”) {
// Türkçe’de özne genellikle fiilden anlaşılır.
// DeepL’e context vermek için system prompt ekleyemeyiz ama
// metni küçük bir not ile sarabilir ya da olduğu gibi bırakabiliriz.
// En iyi yaklaşım: DeepL context parametresi (Pro’da var, free’de yok)
// Bu yüzden metni biraz normalize edelim
return text;
}
return text;
}

async function translateText(text, targetLang, sourceLang) {
const processedText = buildTranslationPrompt(text, sourceLang);

const body = new URLSearchParams();
body.append(“text”, processedText);
body.append(“target_lang”, targetLang);
// Kaynak dili de belirt - DeepL’in tahmin etmesine bırakma
body.append(“source_lang”, sourceLang);
// Formality: Türkçe için informal tercih et (sevgi dili genelde informal)
if (targetLang === “TR”) {
body.append(“formality”, “prefer_less”);
}

const res = await fetch(DEEPL_API, {
method: “POST”,
headers: {
“Content-Type”: “application/x-www-form-urlencoded”,
“Authorization”: “DeepL-Auth-Key “ + DEEPL_API_KEY
},
body: body.toString()
});

const data = await res.json();
console.log(“DeepL:”, JSON.stringify(data));

if (!data.translations || !data.translations[0]) {
throw new Error(“DeepL translation failed: “ + JSON.stringify(data));
}

return data.translations[0].text;
}

async function sendMessage(chatId, text, replyId) {
const payload = { chat_id: chatId, text: text };
if (replyId) payload.reply_to_message_id = replyId;

const res = await fetch(TELEGRAM_API + “/sendMessage”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify(payload)
});

const data = await res.json();
console.log(“Telegram:”, JSON.stringify(data));
}

async function handleUpdate(update) {
console.log(“Update:”, JSON.stringify(update));

const message = update.message;
if (!message) return;
if (message.from && message.from.is_bot) return;

// Sticker, GIF, fotoğraf gibi media - text yoksa geç
if (!message.text) return;

const text = message.text.trim();
const chatId = message.chat.id;
const messageId = message.message_id;

// Komutlar
if (text === “/start”) {
await sendMessage(chatId, “Merhaba! Çeviri botu hazır. TR↔EN otomatik çeviri yapar.”);
return;
}

if (text === “/help”) {
await sendMessage(chatId, “TR ↔ EN otomatik çeviri botu.\nTürkçe yazarsanız İngilizce’ye, İngilizce yazarsanız Türkçe’ye çevirir.”);
return;
}

if (text.startsWith(”/”)) return;

// Sadece emoji içeriyorsa çevirme
if (isOnlyEmojiOrMedia(text)) {
console.log(“Emoji-only mesaj, atlanıyor.”);
return;
}

try {
const sourceLang = detectLanguage(text);
const targetLang = sourceLang === “TR” ? “EN” : “TR”;
console.log(“Translating from “ + sourceLang + “ to “ + targetLang + “: “ + text);

```
// Sevgi sözcüklerini koru
const { text: processedText, placeholders } = applyEndearmentMap(text, sourceLang);

// Çevir
let translated = await translateText(processedText, targetLang, sourceLang);

// Placeholder'ları geri koy
translated = restorePlaceholders(translated, placeholders);

await sendMessage(chatId, translated, messageId);
```

} catch (err) {
console.error(“Hata:”, err);
await sendMessage(chatId, “Çeviri hatası oluştu.”, messageId);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
console.log(“Bot çalışıyor: “ + PORT);
});
