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
	const [adhanFajrPlayer, setAdhanFajrPlayer] = useState<any>(null);

	// adhan path
	const [adhanPath, setAdhanPath] = useState(
		(window.electron.ipcRenderer.sendSync('get-adhan-path-normal') as string) === 'auto'
			? (window.electron.ipcRenderer.sendSync('get-default-adhan-normal') as string)
			: (window.electron.ipcRenderer.sendSync('get-adhan-path-normal') as string)
	);
	const [adhanFajrPath, setAdhanFajrPath] = useState(
		(window.electron.ipcRenderer.sendSync('get-adhan-path-fajr') as string) === 'auto'
			? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string)
			: (window.electron.ipcRenderer.sendSync('get-adhan-path-fajr') as string)
	);

	// Button
	const okBtnPressed = () => {
		// close modal
		setShowModal(false);

		// localstorage
		localStorage.setItem('modal-open', 'false');

		// stop adhan
		if (modalContent.type === 'adhan') adhanPlayer.stop();
		if (modalContent.type === 'adhan_fajr') adhanFajrPlayer.stop();
	};

	const updatePath = () => {
		setAdhanPath(
			(window.electron.ipcRenderer.sendSync('get-adhan-path-normal') as string) === 'auto'
				? (window.electron.ipcRenderer.sendSync('get-default-adhan-normal') as string)
				: (window.electron.ipcRenderer.sendSync('get-adhan-path-normal') as string)
		);
		setAdhanFajrPath(
			(window.electron.ipcRenderer.sendSync('get-adhan-path-fajr') as string) === 'auto'
				? (window.electron.ipcRenderer.sendSync('get-default-adhan-fajr') as string)
				: (window.electron.ipcRenderer.sendSync('get-adhan-path-fajr') as string)
		);
	};

	useEffect(() => {
		window.electron.ipcRenderer.on('path-updated', updatePath);

		return () => {
			window.electron.ipcRenderer.removeEventListener('path-updated', updatePath);
		};
	}, []);

	return (
		<>
			<ReactHowler
				// ex: src='D://Coding/@Projects/Electron/simple-prayertime-reminder/assets/adhan.mp3'
				src={adhanPath}
				playing={showModal && modalContent.type === 'adhan'}
				ref={(ref: any) => {
					setAdhanPlayer(ref);
				}}
				onEnd={() => {
					setShowModal(false);
					localStorage.setItem('adhan-playing', 'false');
				}}
			/>
			<ReactHowler
				src={adhanFajrPath}
				playing={showModal && modalContent.type === 'adhan_fajr'}
				ref={(ref: any) => {
					setAdhanFajrPlayer(ref);
				}}
				onEnd={() => {
					setShowModal(false);
					localStorage.setItem('adhan-playing', 'false');
				}}
			/>

			{/* <Button
				// debug purpose
				onClick={() => {
					setShowModal(true);
					localStorage.setItem('adhan-playing', 'true');
				}}
			>
				Open modal
			</Button> */}

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
