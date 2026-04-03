import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reportes1.css'
import Reportes from './pages/Reportes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Reportes />
  </StrictMode>
)
