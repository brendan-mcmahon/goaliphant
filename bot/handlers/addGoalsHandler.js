const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function addGoals(text, chatId) {
	if (!text) {
		await sendMessage(chatId, 'You must send a goal or list of goals to add!');
	} else {
		await saveGoalsAndList(text.trim(), chatId);
	}
}
exports.addGoals = addGoals;

async function saveGoalsAndList(newGoal, chatId, fromPartner = false) {
	try {
		const existingGoals = await getGoals(chatId);
		const updatedGoals = [...existingGoals, { text: newGoal, completed: false, fromPartner }];
		await updateGoals(chatId, updatedGoals);
		if (!fromPartner) {
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
	const newGoal = `🐝 ${goalsText.trim()}`;
	await sendMessage(partner.ChatId, `Your partner added the following honey-do item: ${newGoal}`);
	await saveGoalsAndList(newGoal, partner.ChatId, true);
	await sendMessage(chatId, 'Honey-do items added successfully!');
}
exports.addHoney = addHoney;