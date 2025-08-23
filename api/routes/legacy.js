const goalService = require('../services/goalService');
const rewardService = require('../services/rewardService');
const userService = require('../services/userService');
const { createResponse, validateRequired } = require('./utils');

// Legacy route handlers for backward compatibility
const legacyRoutes = {
	// Get all data - GET /getAllData
	async getAllData(event) {
		const goals = await goalService.getAllUsersGoals();
		const rewards = await rewardService.getAllRewardsForAllUsers();
		const users = await userService.getAllUsers();
		
		const userGoals = users.map(user => {
			const days = goals.filter(goal => goal.chatId === user.ChatId).map(ug => ({ 
				date: ug.date, 
				goals: ug.goals 
			}));
			const userRewards = rewards.filter(r => r.ChatId === user.ChatId);
			return { ...user, Days: days, Rewards: userRewards };
		});
		
		return createResponse(200, { goals, rewards, userGoals });
	},

	// Complete goal - GET /completeGoal
	async completeGoal(event) {
		const { chatId, index } = event.queryStringParameters || {};
		validateRequired({ chatId, index }, ['chatId', 'index']);
		
		const result = await goalService.completeGoal(chatId, parseInt(index));
		if (result.ticketAwarded) {
			await userService.addTickets(chatId, 1);
		}
		
		return createResponse(200, { success: true });
	},

	// Uncomplete goal - GET /uncompleteGoal
	async uncompleteGoal(event) {
		const { chatId, index } = event.queryStringParameters || {};
		validateRequired({ chatId, index }, ['chatId', 'index']);
		
		const result = await goalService.uncompleteGoal(chatId, parseInt(index));
		if (result.ticketDeducted) {
			await userService.deductTickets(chatId, 1);
		}
		
		return createResponse(200, { success: true });
	},

	// Add goal - POST /addGoal
	async addGoal(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, text } = body;
		validateRequired({ chatId, text }, ['chatId', 'text']);
		
		await goalService.addGoal(chatId, text);
		return createResponse(200, { success: true });
	},

	// Edit goal - POST /editGoal
	async editGoal(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, index, text } = body;
		validateRequired({ chatId, index, text }, ['chatId', 'index', 'text']);
		
		await goalService.editGoal(chatId, parseInt(index), text);
		return createResponse(200, { success: true });
	},

	// Delete goal - GET /deleteGoal
	async deleteGoal(event) {
		const { chatId, index } = event.queryStringParameters || {};
		validateRequired({ chatId, index }, ['chatId', 'index']);
		
		await goalService.deleteGoal(chatId, parseInt(index));
		return createResponse(200, { success: true });
	},

	// Get user data - GET /getUserData
	async getUserData(event) {
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const user = await userService.getUser(chatId);
		return createResponse(200, { user });
	}
};

// Route matching function
const matchLegacyRoute = (method, path) => {
	// Legacy endpoints
	if (method === 'GET' && path === '/getAllData') return legacyRoutes.getAllData;
	if (method === 'GET' && path === '/completeGoal') return legacyRoutes.completeGoal;
	if (method === 'GET' && path === '/uncompleteGoal') return legacyRoutes.uncompleteGoal;
	if (method === 'POST' && path === '/addGoal') return legacyRoutes.addGoal;
	if (method === 'POST' && path === '/editGoal') return legacyRoutes.editGoal;
	if (method === 'GET' && path === '/deleteGoal') return legacyRoutes.deleteGoal;
	if (method === 'GET' && path === '/getUserData') return legacyRoutes.getUserData;
	
	return null;
};

module.exports = { matchLegacyRoute };