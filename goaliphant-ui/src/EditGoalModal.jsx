import { useEffect, useState } from "react";
import Modal from "./Modal";
import { editGoal } from "./api";

function EditModalGoal({ isOpen, onSave, onClose, goalData }) {
	const [text, setText] = useState(goalData?.goal?.text);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setText(goalData?.goal?.text);
	}, [goalData]);

	const updateGoal = async () => {
		setIsSaving(true);
		await editGoal(goalData.chatId, goalData.index, text);
		setIsSaving(false);
		onSave({ ...goalData, text });
		onClose();
	}

	return <Modal isOpen={isOpen} isLoading={isSaving} title="Edit Goal" onClose={onClose}>
		<textarea value={text} onChange={(e) => setText(e.target.value)} />
		<div className="modal-actions">
			<button onClick={updateGoal}>Save</button>
		</div>
	</Modal>
}

export default EditModalGoal;