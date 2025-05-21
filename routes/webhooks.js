// REST API routes: send message, get history, add to whitelist
const { addToWhitelist } = require("../handlers/messageHandler");
const {
  delay,
  getRandomDelay,
  canSendMessage,
  saveMessageToLog,
} = require("../utils/helpers");

module.exports = function (app, client) {
  // Send a WhatsApp message with typing + delay + limiter
  app.post("/send-message", async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ error: "number and message required" });
    }

    const chatId = number.replace(/\D/g, "") + "@c.us";

    // Check if we've hit the hourly limit
    const { allowed, count } = canSendMessage();
    if (!allowed) {
      console.log("❌ Message blocked — hourly limit reached");
      return res.status(429).json({
        error: "Hourly limit reached (20 messages per hour)",
        sentInLastHour: count,
      });
    }

    try {
      const chat = await client.getChatById(chatId);

      // Simulate typing
      const delayTime = getRandomDelay();
      await chat.sendStateTyping();
      console.log(`⏳ Typing to ${chatId} for ${delayTime}ms...`);
      await delay(delayTime);
      await chat.clearState();

      // Send the message
      await chat.sendMessage(message);
      console.log(`✅ Message sent to ${chatId}`);

      // Log this message to file
      saveMessageToLog();

      res.json({ success: true, chatId, message });
    } catch (err) {
      console.error("❌ Error sending message:", err.message);
      res.status(500).json({ error: "Failed to send message." });
    }
  });

  // Fetch recent message history
  app.post("/get-chat-history", async (req, res) => {
    const { number, limit } = req.body;
    if (!number || !limit) {
      return res.status(400).json({ error: "number and limit required" });
    }

    try {
      const chatId = number + "@c.us";
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });

      const history = messages
        .map((msg, i) => {
          const sender = msg.fromMe ? "Me" : "User";
          return `Message ${i + 1}:\n${sender}\n${msg.body}\n`;
        })
        .join("\n");

      res.json({ chatId, chatHistory: history });
    } catch (err) {
      console.error("❌ Error fetching chat history:", err.message);
      res.status(500).json({ error: "Failed to fetch chat history." });
    }
  });

  // Add number to whitelist
  app.post("/add-whitelist", (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).send("Missing 'number' in request.");

    const chatId = number.replace(/\D/g, "") + "@c.us";
    addToWhitelist(chatId);
    res.send(`✅ ${chatId} added to whitelist.`);
  });
};
