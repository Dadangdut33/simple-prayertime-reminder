// a renamer script. Put in releases folder and run it. Releases folder should contain version of each release.

const fs = require('fs');
const version = 'VERSION HERE';

const renameMap = {};
renameMap[`ia32-Simple PrayerTime Reminder Setup ${version}.exe`] = `Installer_win-ia32_Simple PrayerTime Reminder Setup ${version}.exe`;
renameMap[`ia32-Simple PrayerTime Reminder Setup ${version}.exe.blockmap`] = `Installer_win-ia32_Simple PrayerTime Reminder Setup ${version}.exe.blockmap`;
renameMap[`Simple PrayerTime Reminder Setup ${version}.exe`] = `Installer_win-x64_Simple PrayerTime Reminder Setup ${version}.exe`;
renameMap[`Simple PrayerTime Reminder Setup ${version}.exe.blockmap`] = `Installer_win-x64_Simple PrayerTime Reminder Setup ${version}.exe.blockmap`;
renameMap[`Simple PrayerTime Reminder_${version.replaceAll('.', '_')}_ia32.zip`] = `Portable_win-ia32_Simple PrayerTime Reminder_${version.replaceAll('.', '_')}.zip`;
renameMap[`Simple PrayerTime Reminder_${version.replaceAll('.', '_')}_x64.zip`] = `Portable_win-x64_Simple PrayerTime Reminder_${version.replaceAll('.', '_')}.zip`;
renameMap[`simple-prayertime-reminder-${version}-ia32.tar.gz`] = `targz_ia32-simple-prayertime-reminder-${version}.tar.gz`;
renameMap[`simple-prayertime-reminder-${version}.tar.gz`] = `targz_x64-simple-prayertime-reminder-${version}.tar.gz`;
renameMap[`simple-prayertime-reminder-${version}-ia32.zip`] = `zip_linux-ia32_simple-prayertime-reminder-${version}.zip`;
renameMap[`simple-prayertime-reminder-${version}.zip`] = `zip_linux-x64_simple-prayertime-reminder-${version}.zip`;
// read all file in the folder
fs.readdir(__dirname + `/${version}`, (err, files) => {
	if (err) throw err;
	files.forEach((file) => {
		// rename file
		if (renameMap[file]) {
			fs.renameSync(__dirname + `/${version}/${file}`, __dirname + `/${version}/${renameMap[file]}`);
			console.log(`${file} => ${renameMap[file]}`);
		} else {
			console.log(`${file} => ERROR NOT FOUND IN DICTIONARY`);
		}
	});
});
