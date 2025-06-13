import { StatsigClient } from '@statsig/js-client';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';

import React from 'react';
import ReactDOM from 'react-dom/client';
import WorldClockDashboard from './App.jsx';
import './index.css';

async function startApp() {
  const statsig = new StatsigClient(
    'client-1jKRKqONUD66OY5whX2pFDELaEnSUFfW8vB879CBN',
    { userID: 'demo-user' },
    {
      plugins: [
        new StatsigSessionReplayPlugin(),
        new StatsigAutoCapturePlugin(),
      ],
    }
  );

  await statsig.initializeAsync();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <WorldClockDashboard />
    </React.StrictMode>
  );
}

startApp();
