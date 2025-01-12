const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { setChatState } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function addGoals(text, chatId) {
	const goalsText = text.replace('/add', '').trim();
	if (!goalsText) {
		await setChatState(chatId, 'addGoals');
		await sendMessage(chatId, 'Send your goals as comma-separated text.');
	} else {
		const newGoals = goalsText.split(',').map((goal) => goal.trim());
		await saveGoalsAndList(newGoals, chatId);
	}
}
exports.addGoals = addGoals;

async function saveGoalsAndList(newGoals, chatId, fromPartner = false) {
	try {
		const existingGoals = await getGoals(chatId);
		const updatedGoals = [...existingGoals, ...newGoals.map(goal => ({ text: goal, completed: false, fromPartner }))];
		await updateGoals(chatId, updatedGoals);
		if (fromPartner) {
			await sendMessage(chatId, `Goals added to your partner's list!`);
		} else {
			await sendMessage(chatId, 'Goals added successfully!');
			await listGoals(chatId);
		}
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendError(chatId, error);
	}
}
exports.saveGoalsAndList = saveGoalsAndList;

async function addHoney(text, chatId) {
	const user = await getUser(chatId);
	const partner = await getUser(user.PartnerId);
	const goalsText = text.replace('/honey', '').trim();
	const newGoals = goalsText.split(',').map((goal) => `🐝 ${goal.trim()}`);
	await sendMessage(partner.ChatId, `Your partner added the following honey-do items: ${newGoals.join(', ')}`);
	await saveGoalsAndList(newGoals, partner.ChatId, true);
}
exports.addHoney = addHoney;