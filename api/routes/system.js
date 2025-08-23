const rolloverService = require('../services/rolloverService');
const notificationService = require('../services/notificationService');
const { createResponse, extractPathParam, validateRequired } = require('./utils');
const fs = require('fs');
const path = require('path');

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
	},

	// Serve OpenAPI spec as JSON - GET /api/v1/docs/openapi.json
	async getOpenApiSpec(event) {
		try {
			const yamlPath = path.join(__dirname, '..', 'openapi.yml');
			const yamlContent = fs.readFileSync(yamlPath, 'utf8');
			
			// Simple YAML to JSON conversion for basic OpenAPI spec
			// Note: This is a basic conversion - for production you'd want a proper YAML parser
			const jsonSpec = yamlContent
				.replace(/^(\s*)([^:\s]+):\s*(.*)$/gm, '$1"$2": $3')
				.replace(/^(\s*)- (.*)$/gm, '$1$2,')
				.replace(/\|[\s\S]*?(?=\n\S|\n$)/g, '""'); // Handle multiline descriptions
			
			return {
				statusCode: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: yamlContent // Return raw YAML for now - Swagger UI can parse it
			};
		} catch (error) {
			return createResponse(500, { error: 'Failed to load OpenAPI spec' });
		}
	},

	// Serve Swagger UI HTML page - GET /api/v1/docs
	async getSwaggerUI(event) {
		const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goaliphant API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin: 0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/v1/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html',
				'Access-Control-Allow-Origin': '*'
			},
			body: swaggerHtml
		};
	},

	// Alternative route for root docs - GET /docs
	async getDocsRoot(event) {
		return systemRoutes.getSwaggerUI(event);
	}
};

// Route matching function
const matchSystemRoute = (method, path) => {
	// Documentation routes
	if (method === 'GET' && path === '/api/v1/docs') return systemRoutes.getSwaggerUI;
	if (method === 'GET' && path === '/api/v1/docs/openapi.json') return systemRoutes.getOpenApiSpec;
	if (method === 'GET' && path === '/docs') return systemRoutes.getDocsRoot;
	
	// System routes
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