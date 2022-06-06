import icon from '../../../assets/display_icon_notext.png';
import { useState } from 'react';

// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

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

export const ModalPraytime = () => {
	const [open, setOpen] = useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	return (
		<>
			<Button onClick={handleOpen}>Open modal</Button>
			<Modal open={open} aria-labelledby='praytime reminder modal' aria-describedby='shows praytime reminder info'>
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
							Time For Isha Prayer
						</Typography>

						<Typography sx={[textSpacing]} variant='h5' component='h2'>
							07:02 PM
						</Typography>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<Typography sx={textSpacing} variant='subtitle1' component='h4'>
								Jakarta
							</Typography>
							<Typography variant='subtitle1' component='h4'>
								(-6.1741, 106.8296)
							</Typography>
						</Box>
					</Box>
					<Button
						sx={{
							width: 400,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={handleClose}
					>
						Ok
					</Button>
				</Box>
			</Modal>
		</>
	);
};
