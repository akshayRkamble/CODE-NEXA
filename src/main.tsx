import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import './modern.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => {
    console.error('Could not register the app service worker.', error);
  }));
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .then(() => caches.keys())
    .then(keys => Promise.all(keys.filter(key => key.startsWith('nexacode-shell-')).map(key => caches.delete(key))))
    .catch(error => console.error('Could not clear the development app cache.', error));
}
