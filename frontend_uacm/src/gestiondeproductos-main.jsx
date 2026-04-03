import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/GestiondeProductos1.css'
import GestionDeProductos from './pages/GestionDeProductos.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GestionDeProductos />
  </StrictMode>
)
