function Modal({ isOpen, isLoading, title, children, onClose }) {
	if (!isOpen) {
		return null;
	}

	if (isLoading) {
		return <div className="modal">
			<div className="modal-content">
				<div className="modal-body">
					Loading...
				</div>
			</div>
		</div>
	}

	return <div className="modal">
		<div className="modal-content">
			<div className="modal-header">
				<h2>{title}</h2>
				<span className="close" onClick={onClose} >&times;</span>

			</div>
			<div className="modal-body">
				{children}
			</div>
		</div>
	</div>
}

export default Modal;