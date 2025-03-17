const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function editGoal(index, text, chatId) {
	index--;
	if (!text) {
		await sendMessage(chatId, 'You must send new text to replace the existing text!');
	} else {
		await saveGoalsAndList(index, text.trim(), chatId);
	}
}
exports.editGoal = editGoal;

async function saveGoalsAndList(index, newGoal, chatId) {
	try {
		const existingGoals = await getGoals(chatId);
		if (index < 0 || index >= existingGoals.length) {
			await sendMessage(chatId, 'Invalid goal index!');
			return;
		}
		const updatedGoals = [...existingGoals];
		updatedGoals[index] = { ...updatedGoals[index], text: newGoal };
		await updateGoals(chatId, updatedGoals);
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendError(chatId, error);
	}
}
exports.saveGoalsAndList = saveGoalsAndList;
