
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DisplayMode } from './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Check for display mode and site URL configuration from data attributes
// This simulates how a WordPress plugin would pass parameters to the script
const mode = (rootElement.getAttribute('data-mode') || 'widget') as DisplayMode;
const autoUrl = rootElement.getAttribute('data-site-url') || '';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App initialMode={mode} autoUrl={autoUrl} />
  </React.StrictMode>
);
