import { useEffect, useState } from 'react'
import './App.scss'
import { fetchData, deleteGoal, editGoal } from './api'
import { FaAngleLeft, FaAngleRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
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
	const [currentUserIndex, setCurrentUserIndex] = useState(0);
	const [currentUser, setCurrentUser] = useState(null);

	useEffect(() => {
		async function fetchDataAsync() {
			let _data = await fetchData();
			setUserData(_data.userGoals);
			console.log(_data.userGoals[currentUserIndex]);
			setCurrentUser(_data.userGoals[currentUserIndex]);
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

	const onUserSelect = (mvmt) => {
		console.log("onUserSelect", mvmt);
		let newIndex = currentUserIndex + mvmt;
		console.log("newIndex", newIndex);
		if (newIndex < 0) {
			console.log("newIndex < 0");
			newIndex = userData.length - 1;
		} else if (newIndex >= userData.length) {
			console.log("newIndex >= userData.length");
			newIndex = 0;
		}
		console.log("newIndex", newIndex);
		setCurrentUserIndex(newIndex);
		setCurrentUser(userData[newIndex]);
	}

	let content = null;

	if (!userData || !currentUser) {
		content = <div>Loading...</div>
	} else {
		content = <>
			<div className="current-user">
				<button className="icon-button" onClick={() => onUserSelect(1)}><FaChevronLeft /></button>
				<h1>{currentUser.Name}</h1>
				<button className="icon-button" onClick={() => onUserSelect(-1)}><FaChevronRight /></button>
			</div>
			<div className="user-info">
				<p>🎟️ <b>{currentUser.TicketWallet}</b> 🎟️</p>
				<p className="state">{currentUser.ChatState}
					{/* {currentUser.ChatStateArgs?.length > 0 && <><br />{currentUser.ChatStateArgs}</>} */}
				</p>

			</div>
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
		setGoalToDelete(null);
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
			<button className="icon-button primary" onClick={() => handleDateChange(-1)} > <FaAngleLeft /> </button>
			<h2>{isToday ? "Today" : date.toLocaleString('en-US', dateOptions)}</h2>
			<button className="icon-button primary" disabled={isToday} onClick={() => handleDateChange(1)} > <FaAngleRight /> </button>
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
