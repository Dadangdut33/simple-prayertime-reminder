import icon from '../../../assets/display_icon_notext.png';
import { ModalContentInterface } from 'renderer/interfaces';

// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

// ------------------------------------------------------------
const centeredModal = {
	position: 'absolute' as 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: 400,
	bgcolor: 'background.paper',
	borderRadius: '4px',
	boxShadow: 24,
};

const textSpacing = {
	mt: 2,
};

const bold = {
	fontWeight: 'bold',
};

type ModalPraytimeProps = {
	modalContent: ModalContentInterface;
	showModal: boolean;
	setShowModal: (showModal: boolean) => void;
};

export const ModalPraytime = ({ modalContent, showModal, setShowModal }: ModalPraytimeProps) => {
	return (
		<>
			<Button onClick={() => setShowModal(true)}>Open modal</Button>
			<Modal open={showModal} aria-labelledby='praytime reminder modal' aria-describedby='shows praytime reminder info'>
				<Box sx={centeredModal}>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							p: 4,
						}}
					>
						<img src={icon} alt='spr-icon' className='modal-icon' />

						<Typography sx={[textSpacing, bold]} variant='h5' component='h2'>
							{modalContent.title}
						</Typography>

						<Typography sx={[textSpacing]} variant='h5' component='h2'>
							{modalContent.time}
						</Typography>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<Typography sx={textSpacing} variant='subtitle1' component='h4'>
								{modalContent.location}
							</Typography>
							<Typography variant='subtitle1' component='h4'>
								({modalContent.coordinates})
							</Typography>
						</Box>
					</Box>
					<Button
						sx={{
							width: 400,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={() => setShowModal(false)}
					>
						Ok
					</Button>
				</Box>
			</Modal>
		</>
	);
};
