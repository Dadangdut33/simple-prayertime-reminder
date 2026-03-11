import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './i18n';
import './index.css';
import 'react-clock/dist/Clock.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './App';
import Dashboard from './pages/Dashboard';
import PrayerTimes from './pages/PrayerTimes';
import WorldPrayerTimes from './pages/WorldPrayerTimes';
import Quran from './pages/Quran';
import SettingsPage from './pages/Settings';
import ReminderPage from './pages/Reminder';
import ReminderTestPage from './pages/ReminderTest';
import AboutPage from './pages/About';
import ThemeProvider from './ThemeProvider';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'prayer-times', element: <PrayerTimes /> },
      { path: 'world-cities', element: <WorldPrayerTimes /> },
      { path: 'quran', element: <Quran /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'reminder', element: <ReminderPage /> },
      { path: 'reminder-test', element: <ReminderTestPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
