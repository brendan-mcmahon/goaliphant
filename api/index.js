// Service imports
const goalService = require('./services/goalService');
const rewardService = require('./services/rewardService');
const userService = require('./services/userService');
const notificationService = require('./services/notificationService');
const rolloverService = require('./services/rolloverService');

// Helper function to parse request body
const parseBody = (event) => {
	try {
		return event.body ? JSON.parse(event.body) : {};
	} catch (e) {
		throw new Error('Invalid JSON in request body');
	}
};

// Helper function to create response
const createResponse = (statusCode, body) => ({
	statusCode,
	headers: {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*'
	},
	body: typeof body === 'string' ? body : JSON.stringify(body)
});

// Main handler
exports.handler = async (event) => {
	const { rawPath, requestContext, queryStringParameters = {} } = event;
	const method = requestContext.http.method;
	
	console.log(`${method} ${rawPath}`, queryStringParameters);
	
	try {
		// Route to appropriate handler
		const response = await routeRequest(method, rawPath, event);
		return response;
	} catch (error) {
		console.error('Handler error:', error);
		return createResponse(error.statusCode || 500, {
			error: error.message || 'Internal server error'
		});
	}
};

// Main routing function
async function routeRequest(method, path, event) {
	// Parse common parameters
	const query = event.queryStringParameters || {};
	const body = method !== 'GET' ? parseBody(event) : {};
	
	// ============ GOAL ENDPOINTS ============
	
	// List goals
	if (method === 'GET' && path === '/api/v1/goals') {
		const { chatId, ...filters } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const goals = await goalService.listGoals(chatId, filters);
		return createResponse(200, { goals });
	}
	
	// Add goal
	if (method === 'POST' && path === '/api/v1/goals') {
		const { chatId, text, ...options } = body;
		if (!chatId || !text) throw { statusCode: 400, message: 'chatId and text required' };
		
		const result = await goalService.addGoal(chatId, text, options);
		return createResponse(201, result);
	}
	
	// Add multiple goals
	if (method === 'POST' && path === '/api/v1/goals/batch') {
		const { chatId, goals } = body;
		if (!chatId || !goals) throw { statusCode: 400, message: 'chatId and goals array required' };
		
		const result = await goalService.addMultipleGoals(chatId, goals);
		return createResponse(201, { goals: result });
	}
	
	// Edit goal
	if (method === 'PUT' && path.match(/^\/api\/v1\/goals\/(\d+)$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId, text } = body;
		if (!chatId || text === undefined) throw { statusCode: 400, message: 'chatId and text required' };
		
		const result = await goalService.editGoal(chatId, index, text);
		return createResponse(200, { goal: result });
	}
	
	// Delete goal
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await goalService.deleteGoal(chatId, index);
		return createResponse(200, { deleted: result });
	}
	
	// Complete goal
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/complete$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId } = body;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await goalService.completeGoal(chatId, index);
		
		// Award ticket if applicable
		if (result.ticketAwarded) {
			await userService.addTickets(chatId, 1);
		}
		
		return createResponse(200, result);
	}
	
	// Uncomplete goal
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/complete$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await goalService.uncompleteGoal(chatId, index);
		
		// Deduct ticket if applicable
		if (result.ticketDeducted) {
			await userService.deductTickets(chatId, 1);
		}
		
		return createResponse(200, result);
	}
	
	// Move goal
	if (method === 'PUT' && path.match(/^\/api\/v1\/goals\/(\d+)\/position$/)) {
		const fromIndex = parseInt(path.split('/')[4]);
		const { chatId, toIndex } = body;
		if (!chatId || toIndex === undefined) throw { statusCode: 400, message: 'chatId and toIndex required' };
		
		const result = await goalService.moveGoal(chatId, fromIndex, toIndex);
		return createResponse(200, result);
	}
	
	// Swap goals
	if (method === 'PUT' && path === '/api/v1/goals/swap') {
		const { chatId, index1, index2 } = body;
		if (!chatId || index1 === undefined || index2 === undefined) {
			throw { statusCode: 400, message: 'chatId, index1, and index2 required' };
		}
		
		const result = await goalService.swapGoals(chatId, index1, index2);
		return createResponse(200, result);
	}
	
	// Schedule goal
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/schedule$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId, date } = body;
		if (!chatId || !date) throw { statusCode: 400, message: 'chatId and date required' };
		
		const result = await goalService.scheduleGoal(chatId, index, date);
		return createResponse(200, { goal: result });
	}
	
	// Unschedule goal
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/schedule$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await goalService.unscheduleGoal(chatId, index);
		return createResponse(200, { goal: result });
	}
	
	// Make goal recurring
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/recurring$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId, cronExpression } = body;
		if (!chatId || !cronExpression) throw { statusCode: 400, message: 'chatId and cronExpression required' };
		
		const result = await goalService.makeGoalRecurring(chatId, index, cronExpression);
		return createResponse(200, { goal: result });
	}
	
	// Remove recurring
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/recurring$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await goalService.removeRecurring(chatId, index);
		return createResponse(200, { goal: result });
	}
	
	// Add note to goal
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/notes$/)) {
		const index = parseInt(path.split('/')[4]);
		const { chatId, note } = body;
		if (!chatId || !note) throw { statusCode: 400, message: 'chatId and note required' };
		
		const result = await goalService.addNoteToGoal(chatId, index, note);
		return createResponse(200, { goal: result });
	}
	
	// Get partner goals
	if (method === 'GET' && path === '/api/v1/goals/partner') {
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const goals = await goalService.listPartnerGoals(chatId);
		return createResponse(200, { goals });
	}
	
	// ============ REWARD ENDPOINTS ============
	
	// List rewards
	if (method === 'GET' && path === '/api/v1/rewards') {
		const { chatId, ...options } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const rewards = await rewardService.listRewards(chatId, options);
		return createResponse(200, { rewards });
	}
	
	// Create reward
	if (method === 'POST' && path === '/api/v1/rewards') {
		const { chatId, ...rewardData } = body;
		if (!chatId || !rewardData.title || !rewardData.cost) {
			throw { statusCode: 400, message: 'chatId, title, and cost required' };
		}
		
		const reward = await rewardService.createReward(chatId, rewardData);
		return createResponse(201, { reward });
	}
	
	// Get reward by ID
	if (method === 'GET' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) {
		const rewardId = path.split('/')[4];
		const reward = await rewardService.getRewardById(rewardId);
		return createResponse(200, { reward });
	}
	
	// Update reward
	if (method === 'PUT' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) {
		const rewardId = path.split('/')[4];
		const updates = body;
		
		const reward = await rewardService.updateRewardDetails(rewardId, updates);
		return createResponse(200, { reward });
	}
	
	// Delete reward
	if (method === 'DELETE' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) {
		const rewardId = path.split('/')[4];
		const deleted = await rewardService.deleteRewardById(rewardId);
		return createResponse(200, { deleted });
	}
	
	// Redeem reward
	if (method === 'POST' && path.match(/^\/api\/v1\/rewards\/([^\/]+)\/redeem$/)) {
		const rewardId = path.split('/')[4];
		const { chatId } = body;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const result = await rewardService.redeemReward(chatId, rewardId);
		return createResponse(200, result);
	}
	
	// Request reward from partner
	if (method === 'POST' && path === '/api/v1/rewards/request') {
		const { requesterId, recipientId, ...request } = body;
		if (!requesterId || !recipientId || !request.title) {
			throw { statusCode: 400, message: 'requesterId, recipientId, and title required' };
		}
		
		const reward = await rewardService.requestReward(requesterId, recipientId, request);
		
		// Send notification to recipient
		await notificationService.sendRewardRequestNotification(requesterId, recipientId, reward);
		
		return createResponse(201, { reward });
	}
	
	// Approve reward request
	if (method === 'PUT' && path.match(/^\/api\/v1\/rewards\/request\/([^\/]+)$/)) {
		const rewardId = path.split('/')[5];
		const { cost } = body;
		if (!cost) throw { statusCode: 400, message: 'cost required' };
		
		const result = await rewardService.approveRewardRequest(rewardId, cost);
		
		// Send notification to requester
		if (result.createdReward) {
			await notificationService.sendRewardApprovalNotification(
				rewardId,
				result.approvedRequest.ChatId,
				result.createdReward.ChatId,
				cost
			);
		}
		
		return createResponse(200, result);
	}
	
	// ============ USER ENDPOINTS ============
	
	// Create user
	if (method === 'POST' && path === '/api/v1/users') {
		const { chatId, username, ...options } = body;
		if (!chatId || !username) throw { statusCode: 400, message: 'chatId and username required' };
		
		const user = await userService.createUser(chatId, username, options);
		return createResponse(201, { user });
	}
	
	// Get user
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)$/)) {
		const chatId = path.split('/')[4];
		const user = await userService.getUser(chatId);
		return createResponse(200, { user });
	}
	
	// Update user
	if (method === 'PUT' && path.match(/^\/api\/v1\/users\/([^\/]+)$/)) {
		const chatId = path.split('/')[4];
		const updates = body;
		
		const user = await userService.updateUser(chatId, updates);
		return createResponse(200, { user });
	}
	
	// Get ticket balance
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)\/tickets$/)) {
		const chatId = path.split('/')[4];
		const balance = await userService.getTicketBalance(chatId);
		return createResponse(200, balance);
	}
	
	// Add/deduct tickets
	if (method === 'POST' && path.match(/^\/api\/v1\/users\/([^\/]+)\/tickets$/)) {
		const chatId = path.split('/')[4];
		const { amount } = body;
		if (!amount) throw { statusCode: 400, message: 'amount required' };
		
		const result = amount > 0 
			? await userService.addTickets(chatId, amount)
			: await userService.deductTickets(chatId, Math.abs(amount));
		
		return createResponse(200, result);
	}
	
	// Link partner
	if (method === 'POST' && path.match(/^\/api\/v1\/users\/([^\/]+)\/partner$/)) {
		const chatId = path.split('/')[4];
		const { partnerChatId } = body;
		if (!partnerChatId) throw { statusCode: 400, message: 'partnerChatId required' };
		
		const result = await userService.linkPartner(chatId, partnerChatId);
		return createResponse(200, result);
	}
	
	// Unlink partner
	if (method === 'DELETE' && path.match(/^\/api\/v1\/users\/([^\/]+)\/partner$/)) {
		const chatId = path.split('/')[4];
		const result = await userService.unlinkPartner(chatId);
		return createResponse(200, result);
	}
	
	// Get chat history
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) {
		const chatId = path.split('/')[4];
		const history = await userService.getChatHistory(chatId);
		return createResponse(200, { history });
	}
	
	// Update chat history
	if (method === 'PUT' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) {
		const chatId = path.split('/')[4];
		const { messages } = body;
		if (!messages) throw { statusCode: 400, message: 'messages array required' };
		
		const history = await userService.updateChatHistory(chatId, messages);
		return createResponse(200, { history });
	}
	
	// Clear chat history
	if (method === 'DELETE' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) {
		const chatId = path.split('/')[4];
		const result = await userService.clearChatHistory(chatId);
		return createResponse(200, result);
	}
	
	// ============ SYSTEM ENDPOINTS ============
	
	// Perform rollover
	if (method === 'POST' && path === '/api/v1/system/rollover') {
		const results = await rolloverService.performDailyRollover();
		return createResponse(200, results);
	}
	
	// Get rollover status
	if (method === 'GET' && path === '/api/v1/system/rollover/status') {
		const status = await rolloverService.getRolloverStatus();
		return createResponse(200, status);
	}
	
	// Simulate rollover for a user
	if (method === 'GET' && path === '/api/v1/system/rollover/simulate') {
		const { chatId } = query;
		if (!chatId) throw { statusCode: 400, message: 'chatId required' };
		
		const simulation = await rolloverService.simulateRollover(chatId);
		return createResponse(200, simulation);
	}
	
	// Get pending notifications
	if (method === 'GET' && path === '/api/v1/system/notifications/pending') {
		const { recipientId } = query;
		const notifications = await notificationService.getPendingNotifications(recipientId);
		return createResponse(200, { notifications });
	}
	
	// Send notification
	if (method === 'POST' && path === '/api/v1/system/notifications') {
		const { recipientId, notification } = body;
		if (!recipientId || !notification) {
			throw { statusCode: 400, message: 'recipientId and notification required' };
		}
		
		const result = await notificationService.queueNotification(recipientId, notification);
		return createResponse(201, { notification: result });
	}
	
	// Mark notification as sent
	if (method === 'PUT' && path.match(/^\/api\/v1\/system\/notifications\/([^\/]+)\/sent$/)) {
		const notificationId = path.split('/')[5];
		const result = await notificationService.markNotificationSent(notificationId);
		return createResponse(200, { notification: result });
	}
	
	// Get users for daily reminder
	if (method === 'GET' && path === '/api/v1/system/notifications/reminder-users') {
		const users = await notificationService.getUsersForDailyReminder();
		return createResponse(200, { users });
	}
	
	// Get notification stats
	if (method === 'GET' && path === '/api/v1/system/notifications/stats') {
		const stats = await notificationService.getNotificationStats();
		return createResponse(200, stats);
	}
	
	// ============ LEGACY ENDPOINTS (for backward compatibility) ============
	
	if (path === '/getAllData') {
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
	}
	
	if (path === '/completeGoal') {
		const chatId = query.chatId;
		const index = parseInt(query.index);
		
		const result = await goalService.completeGoal(chatId, index);
		if (result.ticketAwarded) {
			await userService.addTickets(chatId, 1);
		}
		
		return createResponse(200, { success: true });
	}
	
	if (path === '/uncompleteGoal') {
		const chatId = query.chatId;
		const index = parseInt(query.index);
		
		const result = await goalService.uncompleteGoal(chatId, index);
		if (result.ticketDeducted) {
			await userService.deductTickets(chatId, 1);
		}
		
		return createResponse(200, { success: true });
	}
	
	if (path === '/addGoal' && method === 'POST') {
		const { chatId, text } = body;
		await goalService.addGoal(chatId, text);
		return createResponse(200, { success: true });
	}
	
	if (path === '/editGoal' && method === 'POST') {
		const { chatId, index, text } = body;
		await goalService.editGoal(chatId, parseInt(index), text);
		return createResponse(200, { success: true });
	}
	
	if (path === '/deleteGoal') {
		const chatId = query.chatId;
		const index = parseInt(query.index);
		
		await goalService.deleteGoal(chatId, index);
		return createResponse(200, { success: true });
	}
	
	if (path === '/getUserData') {
		const chatId = query.chatId;
		const user = await userService.getUser(chatId);
		return createResponse(200, { user });
	}
	
	// No matching route
	throw { statusCode: 404, message: `Route not found: ${method} ${path}` };
}