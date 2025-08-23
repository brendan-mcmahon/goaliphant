const rolloverService = require('../services/rolloverService');
const notificationService = require('../services/notificationService');
const { createResponse, extractPathParam, validateRequired } = require('./utils');

// System route handlers
const systemRoutes = {
	// Perform rollover - POST /api/v1/system/rollover
	async performRollover(event) {
		const results = await rolloverService.performDailyRollover();
		return createResponse(200, results);
	},

	// Get rollover status - GET /api/v1/system/rollover/status
	async getRolloverStatus(event) {
		const status = await rolloverService.getRolloverStatus();
		return createResponse(200, status);
	},

	// Simulate rollover for a user - GET /api/v1/system/rollover/simulate
	async simulateRollover(event) {
		const { chatId } = event.queryStringParameters || {};
		validateRequired({ chatId }, ['chatId']);
		
		const simulation = await rolloverService.simulateRollover(chatId);
		return createResponse(200, simulation);
	},

	// Get pending notifications - GET /api/v1/system/notifications/pending
	async getPendingNotifications(event) {
		const { recipientId } = event.queryStringParameters || {};
		
		const notifications = await notificationService.getPendingNotifications(recipientId);
		return createResponse(200, { notifications });
	},

	// Queue notification - POST /api/v1/system/notifications
	async queueNotification(event) {
		const body = JSON.parse(event.body || '{}');
		const { recipientId, notification } = body;
		validateRequired({ recipientId, notification }, ['recipientId', 'notification']);
		
		const result = await notificationService.queueNotification(recipientId, notification);
		return createResponse(201, { notification: result });
	},

	// Mark notification as sent - PUT /api/v1/system/notifications/{notificationId}/sent
	async markNotificationSent(event) {
		const notificationId = extractPathParam(event.rawPath, 5);
		
		const result = await notificationService.markNotificationSent(notificationId);
		return createResponse(200, { notification: result });
	},

	// Get users for daily reminder - GET /api/v1/system/notifications/reminder-users
	async getUsersForDailyReminder(event) {
		const users = await notificationService.getUsersForDailyReminder();
		return createResponse(200, { users });
	},

	// Get notification stats - GET /api/v1/system/notifications/stats
	async getNotificationStats(event) {
		const stats = await notificationService.getNotificationStats();
		return createResponse(200, stats);
	}
};

// Route matching function
const matchSystemRoute = (method, path) => {
	// Exact path matches
	if (method === 'POST' && path === '/api/v1/system/rollover') return systemRoutes.performRollover;
	if (method === 'GET' && path === '/api/v1/system/rollover/status') return systemRoutes.getRolloverStatus;
	if (method === 'GET' && path === '/api/v1/system/rollover/simulate') return systemRoutes.simulateRollover;
	if (method === 'GET' && path === '/api/v1/system/notifications/pending') return systemRoutes.getPendingNotifications;
	if (method === 'POST' && path === '/api/v1/system/notifications') return systemRoutes.queueNotification;
	if (method === 'GET' && path === '/api/v1/system/notifications/reminder-users') return systemRoutes.getUsersForDailyReminder;
	if (method === 'GET' && path === '/api/v1/system/notifications/stats') return systemRoutes.getNotificationStats;
	
	// Pattern matches
	if (method === 'PUT' && path.match(/^\/api\/v1\/system\/notifications\/([^\/]+)\/sent$/)) return systemRoutes.markNotificationSent;
	
	return null;
};

module.exports = { matchSystemRoute };