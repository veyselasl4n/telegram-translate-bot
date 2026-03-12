const BOT_TOKEN = process.env.BOT_TOKEN;
const DEEPL_KEY = process.env.DEEPL_KEY;
const BOT_ID = 8486464185;
const PORT = process.env.PORT || 3000;

function onlyEmoji(text) {
  return /^[\p{Emoji}\s]+$/u.test(text);
}

async function detectAndTranslate(text) {
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`
    },
    body: JSON.stringify({ text: [text], target_lang: "TR" })
  });
  const data = await res.json();
  const detected = data.translations?.[0]?.detected_source_language;
  console.log("Detected language:", detected);

  if (detected === "TR") {
    const res2 = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`
      },
      body: JSON.stringify({ text: [text], target_lang: "EN" })
    });
    const data2 = await res2.json();
    return data2.translations?.[0]?.text ?? text;
  }

  return data.translations?.[0]?.text ?? text;
}

async function sendMessage(chatId, text, reply) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_to_message_id: reply
    })
  });
}

const http = await import("http");

const server = http.createServer(async (req, res) => {
  const url = new URL​​​​​​​​​​​​​​​​
