require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;
const userRepo = require('./common/userRepository.js');
const { config } = require('./common/configs.js');

const bot = new TelegramBot(token);

let thinkingMessageId = null;

// Telegram rejects messages over 4096 characters; leave some headroom
const MAX_MESSAGE_LENGTH = 4000;

// Telegram errors include the request URL, which contains the bot token, so only log the useful bits
function describeError(error) {
	return error?.response?.body?.description || error?.message || String(error);
}

// Split on line breaks where possible so list items aren't cut in half
function splitMessage(message) {
	const chunks = [];
	let remaining = message;

	while (remaining.length > MAX_MESSAGE_LENGTH) {
		let splitAt = remaining.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
		if (splitAt <= 0) splitAt = MAX_MESSAGE_LENGTH;
		chunks.push(remaining.substring(0, splitAt));
		remaining = remaining.substring(splitAt).replace(/^\n/, '');
	}
	chunks.push(remaining);

	return chunks;
}

async function sendThinkingMessage(chatId) {
	const thinkingMessage = await bot.sendMessage(chatId, 'Thinking... 🤔');
	thinkingMessageId = thinkingMessage.message_id;
}

async function sendMessage(chatId, message, options) {
	try {
		const chunks = splitMessage(message);

		if (thinkingMessageId) {
			const messageId = thinkingMessageId;
			thinkingMessageId = null;

			const edited = await editMessage(chatId, messageId, chunks[0], options);
			if (!edited) {
				// Don't leave "Thinking..." hanging; replace it with a fresh message instead
				await deleteMessage(chatId, messageId);
				await bot.sendMessage(chatId, chunks[0], options);
			}
			for (const chunk of chunks.slice(1)) {
				await bot.sendMessage(chatId, chunk, options);
			}
		} else {
			for (const chunk of chunks) {
				await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown', ...options });
			}
		}

		const user = await userRepo.getUser(chatId);	
		if (user) {
			const userMsg = {
				role: "assistant",
				content: message
			};

			const chatHistory = user.chatHistory || [];

			chatHistory.push(userMsg);

			if (chatHistory.length > config.MAX_HISTORY_LENGTH) {
				chatHistory.splice(0, chatHistory.length - config.MAX_HISTORY_LENGTH);
			}

			await userRepo.updateUserField(chatId, 'chatHistory', chatHistory);
		}
		
	} catch (error) {
		console.error("Error in sendMessage:", describeError(error));
	}
}

// Returns true if the edit went through, false otherwise
async function editMessage(chatId, messageId, newText, options = {}) {
	try {
		await bot.editMessageText(newText, {
			chat_id: chatId,
			message_id: messageId,
			...options,
		});
		return true;
	} catch (error) {
		console.error("Failed to edit message:", describeError(error));
		return false;
	}
}

async function deleteMessage(chatId, messageId) {
	try {
		await bot.deleteMessage(chatId, messageId);
	} catch (error) {
		console.error("Failed to delete message:", describeError(error));
	}
}

async function sendError(chatId, error) {
	const message = error?.message || String(error);
	await bot.sendMessage(chatId, `❌ ${message}`);
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

module.exports = { 
	sendThinkingMessage, 
	sendMessage, 
	editMessage, 
	deleteMessage, 
	sendError, 
	getUserProfilePhoto
};
