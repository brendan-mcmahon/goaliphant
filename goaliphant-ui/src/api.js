const API_URL = 'https://5fxpi3bue4dkhwv4kf5re3vcyi0cowqn.lambda-url.us-east-2.on.aws';

export async function fetchData() {
	try {
		const response = await fetch(`${API_URL}/getAllGoals`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error fetching data:', error);
		throw error;
	}
}
