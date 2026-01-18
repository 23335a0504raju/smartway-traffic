
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './styles/components.css'
import './styles/index.css'

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  )
} catch (error) {
  console.error("Failed to render the app:", error);
  document.getElementById('root').innerHTML = `<div style="color: red; padding: 20px;"><h1>App Crash</h1><p>${error.message}</p></div>`;
}
