require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token);

let thinkingMessageId = null;

async function sendThinkingMessage(chatId) {

	const thinkingMessage = await bot.sendMessage(chatId, 'Thinking... 🤔');
	thinkingMessageId = thinkingMessage.message_id;
}

async function sendMessage(chatId, message, options) {

	if (thinkingMessageId) {
		await editMessage(chatId, thinkingMessageId, message, options);
		thinkingMessageId = null;
	} else {
		await bot.sendMessage(chatId, message, options);
	}
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


async function getUserProfilePhoto(userId) {
	try {
		const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });
		console.log("Did we get any photos?", photos.length);
		console.log(photos);

		if (photos && photos.photos && photos.photos.length > 0 && photos.photos[0].length > 0) {
			const fileId = photos.photos[0][photos.photos[0].length - 1].file_id;

			const fileInfo = await bot.getFile(fileId);

			const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
			console.log("file URL:", fileUrl)
			return fileUrl;
		}
		console.log("No profile photo found");
		return null;
	} catch (error) {
		console.error("Error fetching profile photo:", error);
		return null;
	}
}


module.exports = { sendThinkingMessage, sendMessage, editMessage, deleteMessage, sendError, getUserProfilePhoto };
