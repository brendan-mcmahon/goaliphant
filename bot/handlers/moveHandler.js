const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage } = require('../bot.js');

async function moveGoals(index1, index2, chatId) {
	index1 = parseInt(index1) - 1;
	index2 = parseInt(index2) - 1;

	try {
		const goals = await getGoals(chatId);

		if (index1 < 0 || index1 >= goals.length || index2 < 0 || index2 >= goals.length) {
			await sendMessage(chatId, 'Invalid goal index!');
			return;
		}

		// Move element at index2 to position index1
		const reordered = [...goals];
		reordered.splice(index1, 0, reordered.splice(index2, 1)[0]);

		await Promise.all(reordered.map((g, i) =>
			updateGoal(chatId, g.goalId, { displayOrder: i + 1 })
		));

		await sendMessage(chatId, 'Goals moved successfully!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error moving goals:', error);
		await sendMessage(chatId, '❌ Error moving goals. Please try again.');
	}
}
exports.moveGoals = moveGoals;
