const { getAllGoals, getGoals, updateGoals } = require('./common/goalRepository.js');
const { getAllRewards } = require('./common/rewardRepository.js');
const { getUser, getAllUsers } = require('./common/userRepository.js');

exports.handler = async (event) => {
	console.log("Handling event", event.requestContext.http.method, event.rawPath, event.queryStringParameters);

	if (event.rawPath === '/getAllData') {
		const goals = await getAllGoals();
		const rewards = await getAllRewards();
		const users = await getAllUsers();

		// Might not use this since I already have it the other way?
		const userGoals = users.map(user => {
			const days = goals.filter(goal => goal.chatId === user.ChatId).map(ug => ({ date: ug.date, goals: ug.goals }));
			// get the rewards for each user
			const userRewards = rewards.filter(r => r.ChatId === user.ChatId)
			return { ...user, Days: days, Rewards: userRewards };
		});

		return { statusCode: 200, body: JSON.stringify({ goals, rewards, userGoals }) };
	}

	if (event.rawPath === '/completeGoal') {
		const chatId = event.queryStringParameters.chatId;
		const index = parseInt(event.queryStringParameters.index);
		console.log("Completing goal", index, "for chat", chatId);
		return await completeGoal(index, chatId);
	}

	if (event.rawPath === '/uncompleteGoal') {
		const chatId = event.queryStringParameters.chatId;
		const index = parseInt(event.queryStringParameters.index);
		return await uncompleteGoal(index, chatId);
	}

	if (event.rawPath === '/addGoal') {
		console.log("Adding goal");
		const body = JSON.parse(event.body);
		console.log(body);
		const chatId = body.chatId;
		const text = body.text;
		return await addGoal(chatId, text);
	}

	if (event.rawPath === '/editGoal') {
		console.log("Editing goal");
		const body = JSON.parse(event.body);
		console.log(body);
		const chatId = body.chatId;
		const index = parseInt(body.index);
		const text = body.text;
		return await editGoal(chatId, index, text);
	}

	if (event.rawPath === '/deleteGoal') {
		console.log("Deleting goal");
		const chatId = event.queryStringParameters.chatId;
		const index = parseInt(event.queryStringParameters.index);
		return await deleteGoal(chatId, index);
	}

	if (event.rawPath === '/getUserData') {
		const chatId = event.queryStringParameters.chatId;
		const user = await getUser(chatId);
		return { statusCode: 200, body: JSON.stringify({ user }) };
	}

	return { statusCode: 400, body: 'Invalid path.' };
};

async function addGoal(chatId, text) {
	try {
		const goals = await getGoals(chatId);
		const updatedGoals = [...goals, { text, completed: false }];
		await updateGoals(chatId, updatedGoals);
	} catch (error) {
		console.error('Error adding goal:', error);
		return { statusCode: 500, body: 'Error adding goal.' };
	}
}

async function editGoal(chatId, index, text) {
	try {
		const goals = await getGoals(chatId);
		if (index >= 0 && index < goals.length) {
			goals[index].text = text;
			await updateGoals(chatId, goals);
		} else {
			console.error('Invalid goal number.', index);
			return { statusCode: 400, body: 'Invalid goal number.' };
		}
	} catch (error) {
		console.error('Error editing goal:', error);
		return { statusCode: 500, body: 'Error editing goal' };
	}
}

async function deleteGoal(chatId, index) {
	try {
		const goals = await getGoals(chatId);
		if (index >= 0 && index < goals.length) {
			goals.splice(index, 1);
			await updateGoals(chatId, goals);
			await bot.sendMessage(chatId, 'Goal deleted successfully.');
		} else {
			console.error('Invalid goal number.', index);
			return { statusCode: 400, body: 'Invalid goal number.' };
		}
	} catch (error) {
		console.error(chatId, 'Error deleting goal.');
		return { statusCode: 500, body: 'Error deleting goal.' };
	}
}

async function completeGoal(index, chatId) {
	try {
		const goals = await getGoals(chatId);
		console.log('completeGoal', index, chatId, goals);
		if (index >= 0 && index < goals.length) {
			console.log('Completing goal:', goals[index]);
			goals[index].completed = true;
			await updateGoals(chatId, goals);
		} else {
			console.error('Invalid goal number.', index);
			return { statusCode: 400, body: 'Invalid goal number.' };
		}
	} catch (error) {
		console.error('Error marking goal as completed:', error);
		return { statusCode: 500, body: 'Error marking goal as completed.' };
	}
}

async function uncompleteGoal(index, chatId) {
	try {
		const goals = await getGoals(chatId);
		console.log('uncompleteGoal', index, chatId, goals);
		if (index >= 0 && index < goals.length) {
			console.log('Uncompleting goal:', goals[index]);
			goals[index].completed = false;
			await updateGoals(chatId, goals);
		} else {
			console.error('Invalid goal number.', index);
			return { statusCode: 400, body: 'Invalid goal number.' };
		}
	} catch (error) {
		console.error('Error marking goal as uncompleted:', error);
		return { statusCode: 500, body: 'Error marking goal as uncompleted.' };
	}
}