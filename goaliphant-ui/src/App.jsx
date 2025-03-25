import { useEffect, useState } from 'react'
import './App.scss'
import { fetchData, deleteGoal, editGoal } from './api'
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa'
import Modal from './Modal'
import EditModalGoal from './EditGoalModal'
import UserDaySummary from './UserDaySummary'

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
	const [currentUser, setCurrentUser] = useState(null);

	useEffect(() => {
		async function fetchDataAsync() {
			let _data = await fetchData();
			setUserData(_data.userGoals);
			console.log(_data.userGoals[2]);
			setCurrentUser(_data.userGoals[2]);
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

	let content = null;

	if (!userData || !currentUser) {
		content = <div>Loading...</div>
	} else {
		content = <>
			<h1>{currentUser.Name}</h1>
			<p>🎟 {currentUser.TicketWallet} 🎟</p>
			<UserDaySummary
				user={currentUser}
				date={date}
				isToday={isToday}
				setSelectedGoal={setSelectedGoal}
				setGoalToDelete={setGoalToDelete}
			/>
		</>;
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

	const header = (<header>
		<div className="date-picker">
			<button className="icon-button" onClick={() => handleDateChange(-1)} > <FaAngleLeft /> </button>
			<h2>{isToday ? "Today" : date.toLocaleString('en-US', dateOptions)}</h2>
			<button className="icon-button" disabled={isToday} onClick={() => handleDateChange(1)} > <FaAngleRight /> </button>
		</div>
	</header>);

	return (
		<div>
			{header}

			{content}
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
		</div>
	)
}

export default App
