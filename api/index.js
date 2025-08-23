// Route module imports
const { matchGoalRoute } = require('./routes/goals');
const { matchRewardRoute } = require('./routes/rewards');
const { matchUserRoute } = require('./routes/users');
const { matchSystemRoute } = require('./routes/system');
const { matchLegacyRoute } = require('./routes/legacy');
const { createResponse } = require('./routes/utils');

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
	// Try to match routes in order of specificity
	let handler = null;
	
	// 1. Try Goal routes
	handler = matchGoalRoute(method, path);
	if (handler) return await handler(event);
	
	// 2. Try Reward routes
	handler = matchRewardRoute(method, path);
	if (handler) return await handler(event);
	
	// 3. Try User routes
	handler = matchUserRoute(method, path);
	if (handler) return await handler(event);
	
	// 4. Try System routes
	handler = matchSystemRoute(method, path);
	if (handler) return await handler(event);
	
	// 5. Try Legacy routes (for backward compatibility)
	handler = matchLegacyRoute(method, path);
	if (handler) return await handler(event);
	
	// No matching route found
	throw { statusCode: 404, message: `Route not found: ${method} ${path}` };
}