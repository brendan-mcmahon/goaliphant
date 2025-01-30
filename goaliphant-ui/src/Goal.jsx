import { completeGoal, uncompleteGoal } from './api'
import { useState } from 'react';
import spinner from '../assets/spinner.gif';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';

function Goal({ chatId, disabled, goal, index, onEdit, onDelete }) {
	const [saving, setSaving] = useState(false);
	const checked = async (e, chatId, index) => {
		console.log("checked", e.target.checked);
		setSaving(true);
		const isChecked = e.target.checked;

		if (isChecked) {
			await completeGoal(chatId, index);
			goal.completed = true;
			console.log("goal completed");
		} else {
			await uncompleteGoal(chatId, index);
			goal.completed = false;
			console.log("goal uncompleted");
		}
		console.log("checked", e.target.checked);
		setSaving(false);
	}

	return <>
		<div className="goal">
			{saving
				? <img className="spinner" src={spinner} alt="loading" />
				: <input disabled={disabled} onChange={(e) => checked(e, chatId, index)} type="checkbox" checked={goal.completed} />
			}
			{goal.text}
			<div className="actions">
				<FaPencilAlt onClick={onEdit} />
				<FaTrashAlt onClick={onDelete} />
			</div>
		</div>


	</>
}
export default Goal;
