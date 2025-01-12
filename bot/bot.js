require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token);

async function sendMessage(chatId, message, options) {
	await bot.sendMessage(chatId, message, options);
}

async function sendError(chatId, message) {
	await bot.sendMessage(chatId, `❌ ${message}`);
}

module.exports = { sendMessage, sendError };