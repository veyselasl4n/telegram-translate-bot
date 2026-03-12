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
  const url = new URL(req.url, `http://localhost`);

  if (req.method !== "POST" || url.pathname !== "/webhook") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", async () => {
    try {
      const update = JSON.parse(body);
      const msg = update.message;

      if (msg && msg.from?.id !== BOT_ID && !msg.from?.is_bot) {
        if (!msg.animation && !msg.sticker && !msg.photo && !msg.video && !msg.document) {
          const text = msg.text;
          if (text && !onlyEmoji(text)) {
            const translated = await detectAndTranslate(text);
            if (translated.trim() !== text.trim()) {
              await sendMessage(msg.chat.id, translated, msg.message_id);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    res.writeHead(200);
    res.end("ok");
  });
});

server.listen(PORT, () => {
  console.log(`Bot running on port ${PORT}`);
});
