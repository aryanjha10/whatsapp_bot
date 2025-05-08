
console.log("Script has started...");

const { Client, LocalAuth } = require("whatsapp-web.js");
//axios
const axios = require("axios");

const qrcode = require("qrcode-terminal");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());


const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.on("message_create", async (msg) => {
    console.log("MESSAGE RECEIVED", msg, msg.from, msg.to, msg.body, msg.author);

    // Ignore messages sent by me to myself no.  
    if (msg.id.fromMe) {
        console.log("Ignore : Message sent by me");
        return;
    }

    // Add your whitelisted whatsapp numbers - Bot will be activated to those numbers only
    let white_list_responders = ["447983746206@c.us"];

    // if msg.from contains @g.us - its from group , else its from contact
    if (msg.from.includes("@g.us")) {
        console.log("Group message");
        //check if the message is from a white listed user //mentionedIds
        let mentionedIds = msg.mentionedIds;
        console.log("Mentioned Ids", mentionedIds);
        //if mentioned ids are present in the white list then respond
        let is_white_listed = false;
        if (mentionedIds) {
            mentionedIds.forEach((id) => {
                if (white_list_responders.includes(id) && white_list_responders.includes(msg.from)) {
                    is_white_listed = true;
                    respond_to_message(msg);
                }
            });
        }
    } else {
        console.log("Personal message");
        //check if the message is from a white listed user
        if (white_list_responders.includes(msg.from)) {
            console.log("White listed user");
            //send a message to the user
            respond_to_message(msg);
            //client.sendMessage(msg.from, 'This is a response from n8n');
        } else {
            console.log("Not a white listed user");
        }
    }
});

client.initialize();

// Webhook endpoint to receive chat history requests from Make.com
app.post("/get-chat-history", async (req, res) => {
    const number = req.body.number;
    const limit = req.body.limit;

    if (!number || !limit) {
        return res.status(400).json({ error: "Please provide both number and limit." });
    }

    try {
        const chatId = number + "@c.us";
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: limit });

        let chatHistoryText = "";

        messages.forEach((msg, index) => {
            let sender = msg.fromMe ? "Me" : "User";
            chatHistoryText += `Message ${index + 1}:\n${sender}\n${msg.body}\n\n`;
        });


        // Respond back to Make.com
        res.json({
            chatId: chatId,
            chatHistory: chatHistoryText
        });

    } catch (error) {
        console.error("Error fetching chat history:", error.message);
        res.status(500).json({ error: "Failed to fetch chat history." });
    }
});

// Webhook endpoint to send a new message
app.post("/send-message", async (req, res) => {
    const number = req.body.number;  // Example: 447983746206
    const message = req.body.message;

    if (!number || !message) {
        return res.status(400).json({ error: "Please provide both number and message." });
    }

    try {
        const chatId = number + "@c.us";
        await client.sendMessage(chatId, message);
        console.log(`Message sent to ${chatId}: ${message}`);
        res.json({ success: true, chatId: chatId, message: message });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Failed to send message." });
    }
});



//Message respond using n8n
respond_to_message = async (msg) => {
    // msg.reply('pong');

    //http://localhost:5678/webhook/custom_wa_bot
    //cal this api {msg:msg.body}
    //get the response and send it back to the user
    if (msg.body) {
        let data = { msg: msg.body, from: msg.from, from_name: msg._data.notifyName };
        console.log("Data to n8n", data);
        let response = await axios.post("https://hook.us1.make.com/ipy73hzac3ktw5jqpa3eocuqogwphr28", data);
        console.log("Response from n8n", response.data.output);
        if (response.data.output) {
            msg.reply(response.data.output);
        } else {
            console.log("No response from n8n");
        }
    } else {
        console.log("No message body");
    }
};

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Webhook server is running on port ${PORT}`);
});

