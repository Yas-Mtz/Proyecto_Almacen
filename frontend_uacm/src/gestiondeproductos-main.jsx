import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GestionDeProductos from './pages/GestionDeProductos.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GestionDeProductos />
  </StrictMode>
)
