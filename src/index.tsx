// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css'; // make sure file exists at src/styles/global.css
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- dev helper: open the browser console and run: Array.from(document.styleSheets).map(s => s.href).filter(Boolean)
