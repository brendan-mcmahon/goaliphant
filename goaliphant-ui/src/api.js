const API_URL = 'https://5fxpi3bue4dkhwv4kf5re3vcyi0cowqn.lambda-url.us-east-2.on.aws';

export async function fetchData() {
	try {
		const response = await fetch(`${API_URL}/getAllData`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log('Data fetched:', data);
		return data;
	} catch (error) {
		console.error('Error fetching data:', error);
		throw error;
	}
}

export async function fetchUserData(chatId) {
	try {
		const response = await fetch(`${API_URL}/getUserData?chatId=${chatId}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log('User data fetched:', data);
		return data;
	} catch (error) {
		console.error('Error fetching user data:', error);
		throw error;
	}
}

export async function completeGoal(chatId, index) {
	try {
		const response = await fetch(`${API_URL}/completeGoal?chatId=${chatId}&index=${index}`, {
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		console.log(response);
		// const data = await response.json();
		// return data;
		return true;
	} catch (error) {
		console.error('Error completing goal:', error);
		// throw error;
		return false;
	}
}

export async function uncompleteGoal(chatId, index) {
	try {
		const response = await fetch(`${API_URL}/uncompleteGoal?chatId=${chatId}&index=${index}`, {
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		console.log(response);
		return true;
	} catch (error) {
		console.error('Error uncompleting goal:', error);
		// throw error;
		return false;
	}
}

export async function editGoal(chatId, index, text) {
	try {
		const response = await fetch(`${API_URL}/editGoal`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ chatId, index, text })
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		console.log(response);
		return true;
	} catch (error) {
		console.error('Error updating goal:', error);
		// throw error;
		return false;
	}
}

export async function deleteGoal(chatId, index) {
	try {
		const response = await fetch(`${API_URL}/deleteGoal?chatId=${chatId}&index=${index}`, {
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		console.log(response);
		return true;
	} catch (error) {
		console.error('Error deleting goal:', error);
		// throw error;
		return false;
	}
}