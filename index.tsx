import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
// 初期化順を安定させるため、コンテキストを App より先に評価
import './contexts/LanguageContext';
import './contexts/AuthContext';
import './contexts/PlatformContext';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
