// Shared utilities for route handlers

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

// Helper function to extract path parameters
const extractPathParam = (path, position) => {
	return path.split('/')[position];
};

// Helper function to validate required fields
const validateRequired = (data, fields) => {
	for (const field of fields) {
		if (data[field] === undefined || data[field] === null) {
			throw { statusCode: 400, message: `${field} is required` };
		}
	}
};

module.exports = {
	parseBody,
	createResponse,
	extractPathParam,
	validateRequired
};