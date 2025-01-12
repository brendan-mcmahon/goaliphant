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

async function saveGoalsAndList(newGoals, chatId) {
	try {
		const existingGoals = await getGoals(chatId);
		const updatedGoals = [...existingGoals, ...newGoals.map(goal => ({ text: goal, completed: false }))];
		await updateGoals(chatId, updatedGoals);
		await sendMessage(chatId, 'Goals added successfully!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendError(chatId, error);
	}
}
exports.saveGoalsAndList = saveGoalsAndList;