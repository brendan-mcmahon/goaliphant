const { getGoals, updateGoals, setChatState } = require('../common/repository.js');
const { listGoals } = require('./listHandler.js');
const { bot } = require('../bot.js');

async function addGoals(text, chatId) {
	const goalsText = text.replace('/add', '').trim();
	if (!goalsText) {
		await setChatState(chatId, 'addGoals');
		await bot.sendMessage(chatId, 'Send your goals as comma-separated text.');
	} else {
		const newGoals = goalsText.split(',').map((goal) => goal.trim());
		await saveGoalsAndList(newGoals, chatId);
	}
}
exports.addGoals = addGoals;

async function saveGoalsAndList(newGoals, chatId) {
	try {
		const existingGoals = await getGoals(chatId);
		const updatedGoals = [...existingGoals, ...newGoals.map(goal => ({ text: goal, completed: false }))];
		await updateGoals(chatId, updatedGoals);
		await bot.sendMessage(chatId, 'Goals added successfully!');
		await listGoals(chatId);
	} catch (error) {
		await bot.sendMessage(chatId, 'Error saving goals.');
	}
}
exports.saveGoalsAndList = saveGoalsAndList;