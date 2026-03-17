import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Busca el <div id="root"> en index.html y arranca React ahí
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
