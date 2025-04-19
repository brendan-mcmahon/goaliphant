const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage } = require('../bot.js');

async function moveGoals(index1, index2, chatId) {
	index1--;
	index2--;

	const existingGoals = await getGoals(chatId);

	if (index1 < 0 || index1 >= existingGoals.length || index2 < 0 || index2 >= existingGoals.length) {
		await sendMessage(chatId, 'Invalid goal index!');
		return;
	}

	const updatedGoals = [...existingGoals];
	updatedGoals.splice(index1, 0, updatedGoals.splice(index2, 1)[0]);

	await updateGoals(chatId, updatedGoals);
	await sendMessage(chatId, 'Goals moved successfully!');
	await listGoals(chatId);

}
exports.moveGoals = moveGoals;
