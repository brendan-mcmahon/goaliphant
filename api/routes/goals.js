const goalService = require('../services/goalService');
const userService = require('../services/userService');
const { createResponse, extractPathParam, validateRequired } = require('./utils');

// Goal route handlers
const goalRoutes = {
	// List goals - GET /api/v1/goals
	async listGoals(event) {
		const { chatId, ...filters } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const goals = await goalService.listGoals(chatId, filters);
		return createResponse(200, { goals });
	},

	// Add goal - POST /api/v1/goals
	async addGoal(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, text, ...options } = body;
		validateRequired({ chatId, text }, ['chatId', 'text']);
		
		const result = await goalService.addGoal(chatId, text, options);
		return createResponse(201, result);
	},

	// Add multiple goals - POST /api/v1/goals/batch
	async addGoalsBatch(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, goals } = body;
		validateRequired({ chatId, goals }, ['chatId', 'goals']);
		
		const result = await goalService.addMultipleGoals(chatId, goals);
		return createResponse(201, { goals: result });
	},

	// Edit goal - PUT /api/v1/goals/{index}
	async editGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId, text } = body;
		validateRequired({ chatId }, ['chatId']);
		
		if (text === undefined) {
			throw { statusCode: 400, message: 'text is required' };
		}
		
		const result = await goalService.editGoal(chatId, index, text);
		return createResponse(200, { goal: result });
	},

	// Delete goal - DELETE /api/v1/goals/{index}
	async deleteGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const result = await goalService.deleteGoal(chatId, index);
		return createResponse(200, { deleted: result });
	},

	// Complete goal - POST /api/v1/goals/{index}/complete
	async completeGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId } = body;
		validateRequired({ chatId }, ['chatId']);
		
		const result = await goalService.completeGoal(chatId, index);
		
		// Award ticket if applicable
		if (result.ticketAwarded) {
			await userService.addTickets(chatId, 1);
		}
		
		return createResponse(200, result);
	},

	// Uncomplete goal - DELETE /api/v1/goals/{index}/complete
	async uncompleteGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const result = await goalService.uncompleteGoal(chatId, index);
		
		// Deduct ticket if applicable
		if (result.ticketDeducted) {
			await userService.deductTickets(chatId, 1);
		}
		
		return createResponse(200, result);
	},

	// Move goal - PUT /api/v1/goals/{index}/position
	async moveGoal(event) {
		const fromIndex = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId, toIndex } = body;
		validateRequired({ chatId }, ['chatId']);
		
		if (toIndex === undefined) {
			throw { statusCode: 400, message: 'toIndex is required' };
		}
		
		const result = await goalService.moveGoal(chatId, fromIndex, toIndex);
		return createResponse(200, result);
	},

	// Swap goals - PUT /api/v1/goals/swap
	async swapGoals(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, index1, index2 } = body;
		validateRequired({ chatId }, ['chatId']);
		
		if (index1 === undefined || index2 === undefined) {
			throw { statusCode: 400, message: 'index1 and index2 are required' };
		}
		
		const result = await goalService.swapGoals(chatId, index1, index2);
		return createResponse(200, result);
	},

	// Schedule goal - POST /api/v1/goals/{index}/schedule
	async scheduleGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId, date } = body;
		validateRequired({ chatId, date }, ['chatId', 'date']);
		
		const result = await goalService.scheduleGoal(chatId, index, date);
		return createResponse(200, { goal: result });
	},

	// Unschedule goal - DELETE /api/v1/goals/{index}/schedule
	async unscheduleGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const result = await goalService.unscheduleGoal(chatId, index);
		return createResponse(200, { goal: result });
	},

	// Make goal recurring - POST /api/v1/goals/{index}/recurring
	async makeGoalRecurring(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId, cronExpression } = body;
		validateRequired({ chatId, cronExpression }, ['chatId', 'cronExpression']);
		
		const result = await goalService.makeGoalRecurring(chatId, index, cronExpression);
		return createResponse(200, { goal: result });
	},

	// Remove recurring - DELETE /api/v1/goals/{index}/recurring
	async removeRecurring(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const result = await goalService.removeRecurring(chatId, index);
		return createResponse(200, { goal: result });
	},

	// Add note to goal - POST /api/v1/goals/{index}/notes
	async addNoteToGoal(event) {
		const index = parseInt(extractPathParam(event.rawPath, 4));
		const body = JSON.parse(event.body || '{}');
		const { chatId, note } = body;
		validateRequired({ chatId, note }, ['chatId', 'note']);
		
		const result = await goalService.addNoteToGoal(chatId, index, note);
		return createResponse(200, { goal: result });
	},

	// Get partner goals - GET /api/v1/goals/partner
	async getPartnerGoals(event) {
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const goals = await goalService.listPartnerGoals(chatId);
		return createResponse(200, { goals });
	}
};

// Route matching function
const matchGoalRoute = (method, path) => {
	// Exact path matches
	if (method === 'GET' && path === '/api/v1/goals') return goalRoutes.listGoals;
	if (method === 'POST' && path === '/api/v1/goals') return goalRoutes.addGoal;
	if (method === 'POST' && path === '/api/v1/goals/batch') return goalRoutes.addGoalsBatch;
	if (method === 'PUT' && path === '/api/v1/goals/swap') return goalRoutes.swapGoals;
	if (method === 'GET' && path === '/api/v1/goals/partner') return goalRoutes.getPartnerGoals;
	
	// Pattern matches
	if (method === 'PUT' && path.match(/^\/api\/v1\/goals\/(\d+)$/)) return goalRoutes.editGoal;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)$/)) return goalRoutes.deleteGoal;
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/complete$/)) return goalRoutes.completeGoal;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/complete$/)) return goalRoutes.uncompleteGoal;
	if (method === 'PUT' && path.match(/^\/api\/v1\/goals\/(\d+)\/position$/)) return goalRoutes.moveGoal;
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/schedule$/)) return goalRoutes.scheduleGoal;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/schedule$/)) return goalRoutes.unscheduleGoal;
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/recurring$/)) return goalRoutes.makeGoalRecurring;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/goals\/(\d+)\/recurring$/)) return goalRoutes.removeRecurring;
	if (method === 'POST' && path.match(/^\/api\/v1\/goals\/(\d+)\/notes$/)) return goalRoutes.addNoteToGoal;
	
	return null;
};

module.exports = { matchGoalRoute };