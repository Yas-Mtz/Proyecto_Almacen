import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/login1.css'
import Login from './pages/Login.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Login />
  </StrictMode>
)
