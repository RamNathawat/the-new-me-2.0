import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/style.css'
import '../src/map.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
