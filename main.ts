const BOT_TOKEN = Deno.env.get("BOT_TOKEN")!;
const DEEPL_KEY = Deno.env.get("DEEPL_KEY")!;

function onlyEmoji(text: string) {
  return /^[\p{Emoji}\s]+$/u.test(text);
}

async function detectAndTranslate(text: string) {
  // Önce TR'ye çevir, detected_source_language ile dili öğren
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`
    },
    body: JSON.stringify({
      text: [text],
      target_lang: "TR"
    })
  });
  const data = await res.json();
  const detected = data.translations?.[0]?.detected_source_language;
  console.log("Detected language:", detected);

  // Zaten Türkçeyse İngilizceye çevir
  if (detected === "TR") {
    const res2 = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`
      },
      body: JSON.stringify({
        text: [text],
        target_lang: "EN"
      })
    });
    const data2 = await res2.json();
    console.log("EN response:", JSON.stringify(data2));
    return data2.translations?.[0]?.text ?? text;
  }

  // Diğer dillerse TR çevirisini döndür
  console.log("TR response:", JSON.stringify(data));
  return data.translations?.[0]?.text ?? text;
}

async function sendMessage(chatId: number, text: string, reply: number) {
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

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method !== "POST" || url.pathname !== "/webhook")
    return new Response("ok");

  let update;
  try { update = await req.json(); } catch { return new Response("ok"); }

  const msg = update.message;
  if (!msg) return new Response("ok");

  if (msg.animation || msg.sticker || msg.photo || msg.video || msg.document)
    return new Response("ok");

  const text = msg.text;
  if (!text) return new Response("ok");
  if (onlyEmoji(text)) return new Response("ok");

  const translated = await detectAndTranslate(text);
  await sendMessage(msg.chat.id, translated, msg.message_id);

  return new Response("ok");
});
