import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AnimationPortal from './AnimationPanel.jsx'
import PresetStudioPortal from './PresetStudio.jsx'
import './styles.css'
import './enhancements.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <AnimationPortal />
    <PresetStudioPortal />
  </React.StrictMode>,
)
