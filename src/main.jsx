import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';

function StatsigWrapper() {
  const { client } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: 'a-user' },
    {
      plugins: [
        new StatsigAutoCapturePlugin(),
        new StatsigSessionReplayPlugin(),
      ],
    }
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      <App />
    </StatsigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StatsigWrapper />
  </React.StrictMode>
);
