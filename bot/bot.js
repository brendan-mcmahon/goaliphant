require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token);

let thinkingMessageId = null;

async function sendThinkingMessage(chatId) {
	thinkingMessageId = await bot.sendMessage(chatId, 'Thinking... 🤔');
}

async function sendMessage(chatId, message, options) {

	if (thinkingMessageId) {
		await editMessage(chatId, thinkingMessageId, thinkingMessageId);
		thinkingMessageId = null;
	}
	await bot.sendMessage(chatId, message, options);
}

async function editMessage(chatId, messageId, newText, options = {}) {
	try {
		await bot.editMessageText(newText, {
			chat_id: chatId,
			message_id: messageId,
			...options,
		});
	} catch (error) {
		console.error("Failed to edit message:", error);
	}
}

async function deleteMessage(chatId, messageId) {
	try {
		await bot.deleteMessage(chatId, messageId);
	} catch (error) {
		console.error("Failed to delete message:", error);
	}
}

async function sendError(chatId, error) {
	await bot.sendMessage(chatId, `❌ ${JSON.stringify(error)}`);
}

module.exports = { sendThinkingMessage, sendMessage, editMessage, deleteMessage, sendError };
