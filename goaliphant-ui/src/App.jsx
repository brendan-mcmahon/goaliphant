import { useEffect, useState } from 'react'
import './App.scss'
import { fetchData, deleteGoal, editGoal } from './api'
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa'
import Goal from './Goal'
import Modal from './Modal'
import EditModalGoal from './EditGoalModal'

const dateOptions = {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
};

function App() {
	const [date, setDate] = useState(new Date());
	const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
	const [selectedGoal, setSelectedGoal] = useState(null);
	const [goalToDelete, setGoalToDelete] = useState(null);
	const [userData, setUserData] = useState([]);

	useEffect(() => {
		async function fetchDataAsync() {
			let _data = await fetchData();
			setUserData(_data.userGoals);
		}
		fetchDataAsync();
	}, []);

	const handleDateChange = (offset) => {
		if (isToday && offset >= 1) {
			return;
		}
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + offset);
		setDate(newDate);
	}

	if (!userData) {
		return <div>Loading...</div>
	}

	const handleGoalDelete = async (chatId, index) => {
		await deleteGoal(chatId, index);

		const newUserData = [...userData];
		const userIndex = newUserData.findIndex(u => u.ChatId === chatId);
		newUserData[userIndex].Days.filter(d => d.date === date.toISOString().split('T')[0])[0].goals.splice(index, 1);
		setUserData(newUserData);
	}

	const onSaveEdit = async (goalData) => {
		await editGoal(goalData.chatId, goalData.index, goalData.text);
		setSelectedGoal(null);

		const newUserData = [...userData];
		const userIndex = newUserData.findIndex(u => u.ChatId === goalData.chatId);
		newUserData[userIndex].Days.filter(d => d.date === date.toISOString().split('T')[0])[0].goals[goalData.index].text = goalData.text;
		setUserData(newUserData);
	}

	return (
		<>
			<header>
				<div className="date-picker">
					<button className="icon-button" onClick={() => handleDateChange(-1)} > <FaAngleLeft /> </button>
					<h2>{isToday ? "Today" : date.toLocaleString('en-US', dateOptions)}</h2>
					<button className="icon-button" disabled={isToday} onClick={() => handleDateChange(1)} > <FaAngleRight /> </button>
				</div>
			</header>
			<div id="Users">
				<h1>Users</h1>
				{userData.map((user, i) => {
					return <div key={i} className="user-day-summary">
						<h2>{user.Name}</h2>
						<h3>Goals</h3>
						<li className="goals">
							{user.Days.filter(d => d.date === date.toISOString().split('T')[0])[0]
								.goals.map((goal, j) => <Goal
									key={j}
									disabled={!isToday}
									goal={goal}
									chatId={user.ChatId}
									index={j}
									onEdit={() => setSelectedGoal({ chatId: user.ChatId, index: j, goal })}
									onDelete={() => setGoalToDelete({ chatId: user.ChatId, index: j, goal })}
								/>)}
						</li>
						<h3>Rewards</h3>
						<li className="rewards">
							{user.Rewards.map((r, j) => (
								<div key={j} className="reward">
									<h4>{r.Title}</h4>
									<p>{r.Description}</p>
								</div>
							))}
						</li>
					</div>
				}
				)}
			</div>

			<EditModalGoal
				isOpen={!!selectedGoal}
				onClose={() => setSelectedGoal(null)}
				goalData={selectedGoal}
				onSave={onSaveEdit}
			/>

			<Modal isOpen={!!goalToDelete} title="Delete Goal" onClose={() => setGoalToDelete(null)}>
				<p>Are you sure you want to delete this goal?</p>
				<p>{goalToDelete?.goal.text}</p>
				<div className="modal-actions">
					<button onClick={async () => await handleGoalDelete(goalToDelete.chatId, goalToDelete.index)} >Yes</button>
					<button onClick={() => setGoalToDelete(null)} >No</button>
				</div>
			</Modal>
		</>
	)
}

export default App
