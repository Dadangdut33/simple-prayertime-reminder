import icon from '../../../assets/display_icon_notext.png';
import { ModalContentInterface } from 'renderer/interfaces';
import { useEffect, useState } from 'react';
// @ts-ignore
import ReactHowler from 'react-howler';

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
	width: 425,
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
	// adhan player object
	const [adhanPlayer, setAdhanPlayer] = useState<any>(null);
	const [adhan_fajr, setAdhanFajr] = useState<any>(null);

	// adhan path
	const adhanPath = window.electron.ipcRenderer.sendSync('get-adhan-path') as string;
	const adhanFajrPath = window.electron.ipcRenderer.sendSync('get-adhan-path-fajr') as string;

	// Button
	const okBtnPressed = () => {
		setShowModal(false);
		// send ipc to kill adhan
		adhanPlayer.stop();
	};
	const btn = () => {
		setShowModal(true);
	};

	return (
		<>
			<ReactHowler
				// ex: src='D://Coding/@Projects/Electron/simple-prayertime-reminder/assets/adhan.mp3'
				src={adhanPath}
				playing={showModal}
				ref={(ref: any) => {
					setAdhanPlayer(ref);
				}}
			/>
			{/* <ReactHowler src='http://goldfirestudios.com/proj/howlerjs/sound.ogg' playing={true} /> */}

			<Button onClick={() => btn()}>Open modal</Button>
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

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								textAlign: 'center',
							}}
						>
							<Typography sx={[textSpacing, bold]} variant='h5' component='h2'>
								{modalContent.title}
							</Typography>
						</Box>

						<Typography sx={[textSpacing]} variant='h5' component='h2'>
							{modalContent.time}
						</Typography>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								textAlign: 'center',
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
							width: 425,
							borderRadius: 0,
						}}
						variant='contained'
						onClick={okBtnPressed}
					>
						Ok
					</Button>
				</Box>
			</Modal>
		</>
	);
};
