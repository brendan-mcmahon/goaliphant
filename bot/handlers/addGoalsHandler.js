const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function addGoals(goalsText, chatId) {
	try {
		if (!goalsText || goalsText.trim() === '') {
			await sendMessage(chatId, '⚠️ Please provide at least one goal text.');
			return;
		}

		let goals = await getGoals(chatId);
		
		if (!goals) {
			goals = [];
		}

		const now = new Date().toISOString();
		
		const newGoals = goalsText.split('\n')
			.filter(text => text.trim() !== '')
			.map(text => ({
				text: text.trim(),
				completed: false,
				createdAt: now
			}));

		goals = [...goals, ...newGoals];
		
		await updateGoals(chatId, goals);
		
		let message = '✅ Added:';
		newGoals.forEach((goal, i) => {
			message += `\n${goals.length - newGoals.length + i + 1}. ${goal.text}`;
		});
		
		await sendMessage(chatId, message);
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendMessage(chatId, '❌ Error adding goals. Please try again.');
	}
}
exports.addGoals = addGoals;

async function saveGoalsAndList(newGoal, chatId, fromPartner = false) {
	try {
		const existingGoals = await getGoals(chatId);
		const updatedGoals = [...existingGoals, { text: newGoal, completed: false, fromPartner }];
		await updateGoals(chatId, updatedGoals);
		if (!fromPartner) {
			await sendMessage(chatId, 'Goals added successfully!');
			await listGoals(chatId);
		}
	} catch (error) {
		console.error('Error adding goals:', error);
		await sendError(chatId, error);
	}
}
exports.saveGoalsAndList = saveGoalsAndList;

async function addHoney(honeyText, chatId) {
	try {
		const user = await getUser(chatId);
		const partner = await getUser(user.PartnerId);
		const goalsText = honeyText.replace('/honey', '').trim();
		const newGoal = `🐝 ${goalsText.trim()}`;
		const now = new Date().toISOString();
		
		// Create new honey-do goal with timestamp and any special properties
		const newHoneyGoal = {
			text: newGoal,
			completed: false,
			isHoney: true,  // Assuming you mark honey-do tasks somehow
			createdAt: now, // Add creation timestamp
			from: chatId    // Assuming you track who sent the honey-do
		};
		
		const updatedGoals = [...await getGoals(partner.ChatId), newHoneyGoal];
		await updateGoals(partner.ChatId, updatedGoals);
		await sendMessage(partner.ChatId, `Your partner added the following honey-do item: ${newGoal}`);
		await listGoals(partner.ChatId);
		await sendMessage(chatId, 'Honey-do items added successfully!');
	} catch (error) {
		console.error('Error adding honey-do:', error);
		await sendError(chatId, error);
	}
}
exports.addHoney = addHoney;