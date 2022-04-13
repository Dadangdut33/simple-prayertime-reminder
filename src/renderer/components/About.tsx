import icon from '../../../assets/display_icon.png';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import CodeOffOutlinedIcon from '@mui/icons-material/CodeOffOutlined';
import BugReportIcon from '@mui/icons-material/BugReport';
import CommitIcon from '@mui/icons-material/Commit';
import RecommendIcon from '@mui/icons-material/Recommend';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import ForkLeftIcon from '@mui/icons-material/ForkLeft';
import FreeBreakfastOutlinedIcon from '@mui/icons-material/FreeBreakfastOutlined';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export const About = () => {
	const [version, setVersion] = useState('');
	const [newerAvailable, setNewerAvailable] = useState('Click to check');

	const checkVersion = () => {
		if (newerAvailable === 'You are using the latest version.') return;

		if (newerAvailable === 'Click to check') {
			// check latest version from github
			fetch('https://api.github.com/repos/Dadangdut33/simple-prayertime-reminder/releases/latest')
				.then((response) => response.json())
				.then((data) => {
					let latestVer = data.tag_name;
					if (latestVer > version) {
						setNewerAvailable(`New version available (${latestVer})! Click to go to download page`);
					} else {
						setNewerAvailable('You are using the latest version.');
					}
				});
		} else {
			window.electron.ipcRenderer.send('open-external-url', 'https://github.com/Dadangdut33/simple-prayertime-reminder/releases/latest');
		}
	};

	useEffect(() => {
		const versionGet: string = window.electron.ipcRenderer.sendSync('get-version') as any;
		setVersion(versionGet);
	}, []);

	return (
		<>
			<CssBaseline />
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					color: 'text.primary',
					borderRadius: 1,
					p: 3,
				}}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						width: '100%',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'text.primary',
						borderRadius: 1,
						p: 2,
					}}
				>
					<img width='256px' alt='icon' src={icon} />
					<h1 style={{ marginBottom: '0.5rem' }}>About</h1>
					<p>
						A simple app that notify and gives prayer times information based on your location. Created by{' '}
						<Link href='https://github.com/Dadangdut33/' target='_blank' rel='noreferrer' underline='hover'>
							Dadangdut33.
						</Link>
					</p>
				</Box>

				<Divider style={{ width: '100%', marginBottom: '1rem' }} />

				<Box
					sx={{
						display: 'grid',
						gap: 1,
						gridTemplateColumns: 'repeat(2, 1fr)',
					}}
				>
					<Box>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<CodeOffOutlinedIcon style={{ paddingBottom: '4px', fontSize: '28px' }} /> <h2 style={{ paddingLeft: '.5rem' }}>License & Source Code</h2>
						</div>
						<p style={{ marginTop: 0 }}>
							This application is open source and licensed under the MIT License. You can find the code{' '}
							<Link href='https://github.com/Dadangdut33/simple-prayertime-reminder' target='_blank' rel='noreferrer' underline='hover'>
								Here.
							</Link>
						</p>
					</Box>
					<Box>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<BugReportIcon style={{ fontSize: '28px' }} /> <h2 style={{ paddingLeft: '.5rem' }}>Report Bugs</h2>
						</div>
						<p style={{ marginTop: 0 }}>
							You can report bugs or suggest features by submitting an issue on the{' '}
							<Link href='https://github.com/Dadangdut33/simple-prayertime-reminder/issues' target='_blank' rel='noreferrer' underline='hover'>
								repository.
							</Link>
						</p>
					</Box>
					<Box>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<RecommendIcon style={{ fontSize: '28px' }} /> <h2 style={{ paddingLeft: '.5rem' }}>Support the project</h2>
						</div>
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'row',
							}}
						>
							<Tooltip title='Star the repository'>
								<IconButton>
									<Link href='https://github.com/Dadangdut33/simple-prayertime-reminder/stargazers' target='_blank' rel='noreferrer' underline='hover'>
										<StarBorderOutlinedIcon />
									</Link>
								</IconButton>
							</Tooltip>
							<Tooltip title='Fork the repository'>
								<IconButton>
									<Link href='https://github.com/Dadangdut33/simple-prayertime-reminder/fork' target='_blank' rel='noreferrer' underline='hover'>
										<ForkLeftIcon />
									</Link>
								</IconButton>
							</Tooltip>
							<Tooltip title='Buy me A Ko-Fi'>
								<IconButton>
									<Link href='https://ko-fi.com/dadangdut33' target='_blank' rel='noreferrer' underline='hover'>
										<FreeBreakfastOutlinedIcon />
									</Link>
								</IconButton>
							</Tooltip>
						</Box>
					</Box>
					<Box>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
							}}
						>
							<CommitIcon style={{ fontSize: '28px' }} /> <h2 style={{ paddingLeft: '.5rem' }}>Version</h2>
						</div>
						<p style={{ marginTop: 0 }}>
							Current version: <strong>{version}</strong> | Latest version available:{' '}
							<span className={newerAvailable === 'Click to check' ? 'checkver-span' : ``} onClick={() => checkVersion()}>
								{newerAvailable}
							</span>
						</p>
						<a target={'_blank'} rel='noreferrer' href='https://github.com/Dadangdut33/simple-prayertime-reminder/commits/main'>
							<img alt={`GitHub commits since ${version}`} src={`https://img.shields.io/github/commits-since/Dadangdut33/simple-prayertime-reminder/${version}`} className='commit-since' />
						</a>
					</Box>
				</Box>
			</Box>
		</>
	);
};
