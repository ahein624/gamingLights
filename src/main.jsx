import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AnimationPortal from './AnimationPanel.jsx'
import './styles.css'
import './enhancements.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <AnimationPortal />
  </React.StrictMode>,
)
