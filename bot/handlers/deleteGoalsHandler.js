const { bot } = require('../bot.js');
const { getGoals, updateGoals } = require('../common/repository.js');
const { listGoals } = require('./listHandler.js');

async function deleteGoals(text, chatId) {
	const indexText = text.replace('/delete', '').trim();
	if (!indexText) {
		await bot.sendMessage(chatId, 'Send the goal numbers to delete (separated by spaces).');
	} else {
		const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
		await removeGoals(indexes, chatId);
	}
}
exports.deleteGoals = deleteGoals;

async function removeGoals(indexes, chatId) {
	try {
		const goals = await getGoals(chatId);
		let updated = false;
		indexes.sort((a, b) => b - a).forEach(index => {
			if (index >= 0 && index < goals.length) {
				goals.splice(index, 1);
				updated = true;
			}
		});
		if (updated) {
			await updateGoals(chatId, goals);
			await bot.sendMessage(chatId, 'Goals deleted successfully.');
			await listGoals(chatId);
		} else {
			await bot.sendMessage(chatId, 'No valid goals to delete.');
		}
	} catch (error) {
		await bot.sendMessage(chatId, 'Error deleting goals.');
	}
}