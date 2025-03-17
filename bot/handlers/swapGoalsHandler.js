const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage } = require('../bot.js');

async function swapGoals(index1, index2, chatId) {

	const existingGoals = await getGoals(chatId);

	if (index1 < 0 || index1 >= existingGoals.length || index2 < 0 || index2 >= existingGoals.length) {
		await sendMessage(chatId, 'Invalid goal index!');
		return;
	}

	const updatedGoals = [...existingGoals];
	const temp = updatedGoals[index1];
	updatedGoals[index1] = updatedGoals[index2];
	updatedGoals[index2] = temp;

	await updateGoals(chatId, updatedGoals);
	await sendMessage(chatId, 'Goals swapped successfully!');
	await listGoals(chatId);
	console.log("Goals swapped");

}
exports.swapGoals = swapGoals;
