const BOT_TOKEN = Deno.env.get("BOT_TOKEN")!;
const DEEPL_KEY = Deno.env.get("DEEPL_KEY")!;

function onlyEmoji(text: string) {
  return /^[\p{Emoji}\s]+$/u.test(text);
}

async function translate(text: string, target: string) {
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      auth_key: DEEPL_KEY,
      text: text,
      target_lang: target
    })
  });

  const data = await res.json();
  return data.translations?.[0]?.text ?? text;
}

async function sendMessage(chatId:number,text:string,reply:number){
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      chat_id:chatId,
      text:text,
      reply_to_message_id:reply
    })
  });
}

Deno.serve(async (req) => {

  if(req.method !== "POST")
    return new Response("ok");

  let update;

  try{
    update = await req.json();
  }catch{
    return new Response("ok");
  }

  const msg = update.message;

  if(!msg) return new Response("ok");

  if(
    msg.animation ||
    msg.sticker ||
    msg.photo ||
    msg.video ||
    msg.document
  ) return new Response("ok");

  const text = msg.text;

  if(!text) return new Response("ok");

  if(onlyEmoji(text))
    return new Response("ok");

  let target="TR";

  if(/[çğıöşü]/i.test(text))
    target="EN";

  const translated = await translate(text,target);

  await sendMessage(
    msg.chat.id,
    translated,
    msg.message_id
  );

  return new Response("ok");

});
