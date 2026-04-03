import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/solicitud.css'
import Solicitud from './pages/Solicitud.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Solicitud />
  </StrictMode>
)
