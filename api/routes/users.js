const userService = require('../services/userService');
const { createResponse, extractPathParam, validateRequired } = require('./utils');

// User route handlers
const userRoutes = {
	// Create user - POST /api/v1/users
	async createUser(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, username, ...options } = body;
		validateRequired({ chatId, username }, ['chatId', 'username']);
		
		const user = await userService.createUser(chatId, username, options);
		return createResponse(201, { user });
	},

	// Get user - GET /api/v1/users/{chatId}
	async getUser(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		
		const user = await userService.getUser(chatId);
		return createResponse(200, { user });
	},

	// Update user - PUT /api/v1/users/{chatId}
	async updateUser(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		const updates = JSON.parse(event.body || '{}');
		
		const user = await userService.updateUser(chatId, updates);
		return createResponse(200, { user });
	},

	// Get ticket balance - GET /api/v1/users/{chatId}/tickets
	async getTicketBalance(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		
		const balance = await userService.getTicketBalance(chatId);
		return createResponse(200, balance);
	},

	// Add/deduct tickets - POST /api/v1/users/{chatId}/tickets
	async modifyTickets(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		const body = JSON.parse(event.body || '{}');
		const { amount } = body;
		validateRequired({ amount }, ['amount']);
		
		const result = amount > 0 
			? await userService.addTickets(chatId, amount)
			: await userService.deductTickets(chatId, Math.abs(amount));
		
		return createResponse(200, result);
	},

	// Link partner - POST /api/v1/users/{chatId}/partner
	async linkPartner(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		const body = JSON.parse(event.body || '{}');
		const { partnerChatId } = body;
		validateRequired({ partnerChatId }, ['partnerChatId']);
		
		const result = await userService.linkPartner(chatId, partnerChatId);
		return createResponse(200, result);
	},

	// Unlink partner - DELETE /api/v1/users/{chatId}/partner
	async unlinkPartner(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		
		const result = await userService.unlinkPartner(chatId);
		return createResponse(200, result);
	},

	// Get chat history - GET /api/v1/users/{chatId}/chat
	async getChatHistory(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		
		const history = await userService.getChatHistory(chatId);
		return createResponse(200, { history });
	},

	// Update chat history - PUT /api/v1/users/{chatId}/chat
	async updateChatHistory(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		const body = JSON.parse(event.body || '{}');
		const { messages } = body;
		validateRequired({ messages }, ['messages']);
		
		const history = await userService.updateChatHistory(chatId, messages);
		return createResponse(200, { history });
	},

	// Clear chat history - DELETE /api/v1/users/{chatId}/chat
	async clearChatHistory(event) {
		const chatId = extractPathParam(event.rawPath, 4);
		
		const result = await userService.clearChatHistory(chatId);
		return createResponse(200, result);
	},

	// Get all users - GET /api/v1/users
	async getAllUsers(event) {
		const filters = event.queryStringParameters || {};
		
		// Support filtering options from query params
		// e.g., ?hasPartner=true&minTickets=5&notificationsEnabled=true
		const users = await userService.getAllUsers(filters);
		return createResponse(200, { 
			users,
			count: users.length 
		});
	}
};

// Route matching function
const matchUserRoute = (method, path) => {
	// Exact path matches
	if (method === 'GET' && path === '/api/v1/users') return userRoutes.getAllUsers;
	if (method === 'POST' && path === '/api/v1/users') return userRoutes.createUser;
	
	// Pattern matches
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)$/)) return userRoutes.getUser;
	if (method === 'PUT' && path.match(/^\/api\/v1\/users\/([^\/]+)$/)) return userRoutes.updateUser;
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)\/tickets$/)) return userRoutes.getTicketBalance;
	if (method === 'POST' && path.match(/^\/api\/v1\/users\/([^\/]+)\/tickets$/)) return userRoutes.modifyTickets;
	if (method === 'POST' && path.match(/^\/api\/v1\/users\/([^\/]+)\/partner$/)) return userRoutes.linkPartner;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/users\/([^\/]+)\/partner$/)) return userRoutes.unlinkPartner;
	if (method === 'GET' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) return userRoutes.getChatHistory;
	if (method === 'PUT' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) return userRoutes.updateChatHistory;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/users\/([^\/]+)\/chat$/)) return userRoutes.clearChatHistory;
	
	return null;
};

module.exports = { matchUserRoute };