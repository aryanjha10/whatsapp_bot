// Handles personal and group messages
const axios = require("axios");

// Temporary in-memory whitelist (will reset on server restart)
let white_list_responders = [];

function addToWhitelist(chatId) {
  if (!white_list_responders.includes(chatId)) {
    white_list_responders.push(chatId);
    console.log(`✅ Added to whitelist: ${chatId}`);
  }
}

async function handleIncomingMessage(client, msg) {
  console.log("📨 Message received", msg.from, msg.body);

  // Ignore messages sent by you
  if (msg.id.fromMe) {
    return;
  }

  if (msg.from.includes("@g.us")) {
    // Group message
    let mentionedIds = msg.mentionedIds || [];

    if (
      mentionedIds.some((id) => white_list_responders.includes(id)) &&
      white_list_responders.includes(msg.from)
    ) {
      await respondToMessage(msg);
    }
  } else {
    // 1:1 personal message
    if (white_list_responders.includes(msg.from)) {
      await respondToMessage(msg);
    }
  }
}

async function respondToMessage(msg) {
  try {
    const payload = {
      msg: msg.body,
      from: msg.from,
      from_name: msg._data.notifyName,
    };

    // Send data to Make.com webhook
    const response = await axios.post(
      "https://hook.us1.make.com/ipy73hzac3ktw5jqpa3eocuqogwphr28",
      payload
    );

    if (response.data.output) {
      await msg.reply(response.data.output);
    }
  } catch (err) {
    console.error("❌ Failed to get response from n8n:", err.message);
  }
}

module.exports = (client, msg) => handleIncomingMessage(client, msg);
module.exports.addToWhitelist = addToWhitelist;
