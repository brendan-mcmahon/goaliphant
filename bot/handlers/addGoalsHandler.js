const { addGoal: repoAddGoal, getGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function addGoals(goalsText, chatId) {
	if (!goalsText || goalsText.trim() === '') {
		await sendMessage(chatId, '⚠️ Please provide at least one goal text.');
		return;
	}

	try {
		const texts = goalsText.split('\n').filter(t => t.trim() !== '');

		for (const text of texts) {
			await repoAddGoal(chatId, { text: text.trim() });
		}

		const goals = await getGoals(chatId);
		let message = '✅ Added:';
		const start = goals.length - texts.length + 1;
		texts.forEach((text, i) => {
			message += `\n${start + i}. ${text.trim()}`;
		});

		await sendMessage(chatId, message);
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendMessage(chatId, '❌ Error adding goals. Please try again.');
	}
}
exports.addGoals = addGoals;

async function addHoney(chatId, honeyText) {
	if (!honeyText || honeyText.replace('/honey', '').trim() === '') {
		await sendMessage(chatId, '⚠️ Please provide a honey-do item text.');
		return;
	}

	try {
		const user = await getUser(chatId);
		const partner = await getUser(user.PartnerId);
		const goalText = `🐝 ${honeyText.replace('/honey', '').trim()}`;

		await repoAddGoal(partner.ChatId, {
			text: goalText,
			isHoney: true,
			fromPartner: chatId.toString()
		});

		await sendMessage(partner.ChatId, `Your partner added the following honey-do item: ${goalText}`);
		await listGoals(partner.ChatId);
		await sendMessage(chatId, 'Honey-do items added successfully!');
	} catch (error) {
		console.error('Error adding honey-do:', error);
		await sendError(chatId, error);
	}
}
exports.addHoney = addHoney;
