import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/personal.css'
import Personal from './pages/Personal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Personal />
  </StrictMode>
)
