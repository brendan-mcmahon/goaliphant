const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage } = require('../bot.js');

async function swapGoals(index1, index2, chatId) {
	index1 = parseInt(index1) - 1;
	index2 = parseInt(index2) - 1;

	try {
		const goals = await getGoals(chatId);

		if (index1 < 0 || index1 >= goals.length || index2 < 0 || index2 >= goals.length) {
			await sendMessage(chatId, 'Invalid goal index!');
			return;
		}

		const order1 = goals[index1].displayOrder;
		const order2 = goals[index2].displayOrder;

		await Promise.all([
			updateGoal(chatId, goals[index1].goalId, { displayOrder: order2 }),
			updateGoal(chatId, goals[index2].goalId, { displayOrder: order1 })
		]);

		await sendMessage(chatId, 'Goals swapped successfully!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error swapping goals:', error);
		await sendMessage(chatId, '❌ Error swapping goals. Please try again.');
	}
}
exports.swapGoals = swapGoals;
