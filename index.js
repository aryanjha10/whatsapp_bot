// Main entry: initializes WhatsApp client and Express server

const { Client, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const qrcode = require("qrcode-terminal");

const setupRoutes = require("./routes/webhooks");
const handleIncomingMessage = require("./handlers/messageHandler");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Setup WhatsApp client with local session storage
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Show QR code in terminal for login
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Log once WhatsApp is ready
client.on("ready", () => {
  console.log("✅ WhatsApp client is ready");
});

client.on("authenticated", () => {
  console.log("🔐 Authenticated successfully");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Auth failed:", msg);
});

client.on("disconnected", (reason) => {
  console.error("❌ Client disconnected:", reason);
});

// Handle incoming messages
client.on("message_create", (msg) => {
  handleIncomingMessage(client, msg);
});

// Initialize WhatsApp session
client.initialize();

// Attach webhook routes
setupRoutes(app, client);

// Start Express server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server is running at http://localhost:${PORT}`);
});
