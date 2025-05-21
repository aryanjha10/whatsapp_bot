const fs = require("fs");
const path = require("path");

// Delay helper using Promise
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Random delay between 2–6 seconds
const getRandomDelay = () => {
  return Math.floor(Math.random() * (6000 - 2000 + 1)) + 2000;
};

// Log file path
const logFilePath = path.join(__dirname, "..", "message-log.json");

// Check how many messages were sent in the last 60 minutes
const canSendMessage = () => {
  let logs = [];
  if (fs.existsSync(logFilePath)) {
    logs = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
  }

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentLogs = logs.filter((entry) => entry.timestamp > oneHourAgo);

  return {
    allowed: recentLogs.length < 20,
    count: recentLogs.length,
  };
};

// Save current message timestamp to log
const saveMessageToLog = () => {
  let logs = [];
  if (fs.existsSync(logFilePath)) {
    logs = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
  }

  logs.push({ timestamp: Date.now() });
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
};

module.exports = {
  delay,
  getRandomDelay,
  canSendMessage,
  saveMessageToLog,
};
