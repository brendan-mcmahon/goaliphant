// require('dotenv').config();
// const TelegramBot = require('node-telegram-bot-api');
const { getAllGoals } = require('./repository.js');

// const token = process.env.BOT_TOKEN;
// const bot = new TelegramBot(token);

exports.handler = async (event) => {
	console.log("Handling event", event.requestContext.http.method, event.rawPath, event.queryStringParameters);

	if (event.rawPath === '/getAllGoals') {
		const goals = await getAllGoals();
		return { statusCode: 200, body: JSON.stringify(goals) };
	}

	return { statusCode: 200, body: 'OK' };
};

// async function start(chatId) {
// 	await saveUser(chatId);
// 	await bot.sendMessage(chatId, 'Welcome to Goaliphant! Use /add to set goals, /list to view them, /delete {index} to remove, and /complete {index} to mark complete.');
// }

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

// async function listGoals(chatId) {
// 	try {
// 		const goals = await getGoals(chatId);
// 		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
// 		await bot.sendMessage(chatId, goalsList || 'No goals set for today.');
// 	} catch (error) {
// 		await bot.sendMessage(chatId, 'Error fetching goals.');
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

// async function completeGoal(text, chatId) {
// 	const index = parseInt(text.replace('/complete', '').trim()) - 1;
// 	try {
// 		const goals = await getGoals(chatId);
// 		if (index >= 0 && index < goals.length) {
// 			console.log('Completing goal:', goals[index]);
// 			goals[index].completed = true;
// 			await updateGoals(chatId, goals);
// 			await bot.sendMessage(chatId, 'Goal marked as completed.');
// 			await listGoals(chatId);
// 		} else {
// 			await bot.sendMessage(chatId, 'Invalid goal number.');
// 		}
// 	} catch (error) {
// 		console.error('Error marking goal as completed:', error);
// 		await bot.sendMessage(chatId, 'Error marking goal as completed.');
// 		// await bot.sendMessage(chatId, error);
// 	}
// }
