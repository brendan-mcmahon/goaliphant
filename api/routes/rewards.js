const rewardService = require('../services/rewardService');
const notificationService = require('../services/notificationService');
const { createResponse, extractPathParam, validateRequired } = require('./utils');

// Reward route handlers
const rewardRoutes = {
	// List rewards - GET /api/v1/rewards
	async listRewards(event) {
		const { chatId, ...options } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const rewards = await rewardService.listRewards(chatId, options);
		return createResponse(200, { rewards });
	},

	// Create reward - POST /api/v1/rewards
	async createReward(event) {
		const body = JSON.parse(event.body || '{}');
		const { chatId, ...rewardData } = body;
		validateRequired({ chatId }, ['chatId']);
		validateRequired(rewardData, ['title', 'cost']);
		
		const reward = await rewardService.createReward(chatId, rewardData);
		return createResponse(201, { reward });
	},

	// Get reward by ID - GET /api/v1/rewards/{rewardId}
	async getReward(event) {
		const rewardId = extractPathParam(event.rawPath, 4);
		
		const reward = await rewardService.getRewardById(rewardId);
		return createResponse(200, { reward });
	},

	// Update reward - PUT /api/v1/rewards/{rewardId}
	async updateReward(event) {
		const rewardId = extractPathParam(event.rawPath, 4);
		const updates = JSON.parse(event.body || '{}');
		
		const reward = await rewardService.updateRewardDetails(rewardId, updates);
		return createResponse(200, { reward });
	},

	// Delete reward - DELETE /api/v1/rewards/{rewardId}
	async deleteReward(event) {
		const rewardId = extractPathParam(event.rawPath, 4);
		
		const deleted = await rewardService.deleteRewardById(rewardId);
		return createResponse(200, { deleted });
	},

	// Redeem reward - POST /api/v1/rewards/{rewardId}/redeem
	async redeemReward(event) {
		const rewardId = extractPathParam(event.rawPath, 4);
		const body = JSON.parse(event.body || '{}');
		const { chatId } = body;
		validateRequired({ chatId }, ['chatId']);
		
		const result = await rewardService.redeemReward(chatId, rewardId);
		return createResponse(200, result);
	},

	// Request reward from partner - POST /api/v1/rewards/request
	async requestReward(event) {
		const body = JSON.parse(event.body || '{}');
		const { requesterId, recipientId, ...request } = body;
		validateRequired({ requesterId, recipientId }, ['requesterId', 'recipientId']);
		validateRequired(request, ['title']);
		
		const reward = await rewardService.requestReward(requesterId, recipientId, request);
		
		// Send notification to recipient
		await notificationService.sendRewardRequestNotification(requesterId, recipientId, reward);
		
		return createResponse(201, { reward });
	},

	// Approve reward request - PUT /api/v1/rewards/request/{rewardId}
	async approveRewardRequest(event) {
		const rewardId = extractPathParam(event.rawPath, 5);
		const body = JSON.parse(event.body || '{}');
		const { cost } = body;
		validateRequired({ cost }, ['cost']);
		
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
};

// Route matching function
const matchRewardRoute = (method, path) => {
	// Exact path matches
	if (method === 'GET' && path === '/api/v1/rewards') return rewardRoutes.listRewards;
	if (method === 'POST' && path === '/api/v1/rewards') return rewardRoutes.createReward;
	if (method === 'POST' && path === '/api/v1/rewards/request') return rewardRoutes.requestReward;
	
	// Pattern matches
	if (method === 'GET' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) return rewardRoutes.getReward;
	if (method === 'PUT' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) return rewardRoutes.updateReward;
	if (method === 'DELETE' && path.match(/^\/api\/v1\/rewards\/([^\/]+)$/)) return rewardRoutes.deleteReward;
	if (method === 'POST' && path.match(/^\/api\/v1\/rewards\/([^\/]+)\/redeem$/)) return rewardRoutes.redeemReward;
	if (method === 'PUT' && path.match(/^\/api\/v1\/rewards\/request\/([^\/]+)$/)) return rewardRoutes.approveRewardRequest;
	
	return null;
};

module.exports = { matchRewardRoute };