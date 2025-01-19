const { getAllGoals, getGoals, updateGoals, listGoals } = require('./common/goalRepository.js');

exports.handler = async (event) => {
	console.log("Handling event", event.requestContext.http.method, event.rawPath, event.queryStringParameters);

	if (event.rawPath === '/getAllGoals') {
		const goals = await getAllGoals();
		return { statusCode: 200, body: JSON.stringify(goals) };
	}

	if (event.rawPath === '/completeGoal') {
		const chatId = event.queryStringParameters.chatId;
		const index = parseInt(event.queryStringParameters.index);
		console.log("Completing goal", index, "for chat", chatId);
		await completeGoal(index, chatId);
	}

	if (event.rawPath === '/uncompleteGoal') {
		const chatId = event.queryStringParameters.chatId;
		const index = parseInt(event.queryStringParameters.index);
		await uncompleteGoal(index, chatId);
	}

	return { statusCode: 200, body: 'OK' };
};

// async function addGoals(text, chatId) {
// 	const goalsText = text.replace('/add', '').trim();
// 	const newGoals = goalsText.split(',').map((goal) => goal.trim());
// 	try {
// 		const existingGoals = await getGoals(chatId);
// 		const updatedGoals = [...existingGoals, ...newGoals.map(goal => ({ text: goal, completed: false }))];
// 		await updateGoals(chatId, updatedGoals);
// 		await bot.sendMessage(chatId, 'Goals added successfully!');
// 		await listGoals(chatId);
// 	} catch (error) {
// 		await bot.sendMessage(chatId, 'Error saving goals.');
// 	}
// }

// async function deleteGoal(text, chatId) {
// 	const index = parseInt(text.replace('/delete', '').trim()) - 1;
// 	try {
// 		const goals = await getGoals(chatId);
// 		if (index >= 0 && index < goals.length) {
// 			goals.splice(index, 1);
// 			await updateGoals(chatId, goals);
// 			await bot.sendMessage(chatId, 'Goal deleted successfully.');
// 			await listGoals(chatId);
// 		} else {
// 			await bot.sendMessage(chatId, 'Invalid goal number.');
// 		}
// 	} catch (error) {
// 		await bot.sendMessage(chatId, 'Error deleting goal.');
// 	}
// }

async function completeGoal(index, chatId) {
	try {
		const goals = await getGoals(chatId);
		if (index >= 0 && index < goals.length) {
			console.log('Completing goal:', goals[index]);
			goals[index].completed = true;
			await updateGoals(chatId, goals);
			await listGoals(chatId);
		} else {
			console.error('Invalid goal number.', index);
		}
	} catch (error) {
		console.error('Error marking goal as completed:', error);
	}
}

async function uncompleteGoal(index, chatId) {
	try {
		const goals = await getGoals(chatId);
		if (index >= 0 && index < goals.length) {
			console.log('Uncompleting goal:', goals[index]);
			goals[index].completed = false;
			await updateGoals(chatId, goals);
			await listGoals(chatId);
		} else {
			console.error('Invalid goal number.', index);
		}
	} catch (error) {
		console.error('Error marking goal as uncompleted:', error);
	}
}