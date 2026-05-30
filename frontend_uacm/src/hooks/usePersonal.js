import { useState } from 'react'
import { getCookie } from '../utils/getCookie'

export function usePersonal({ onPersonalFound }) {
  const [personalValido, setPersonalValido] = useState(false)
  const [personalStatus, setPersonalStatus] = useState(null)

  const reset = () => {
    setPersonalValido(false)
    setPersonalStatus(null)
  }

  const procesarQRPersonal = async (qrData) => {
    try {
      const res = await fetch(`/Solicitudes/buscar-personal/?qr_data=${encodeURIComponent(qrData)}`, {
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const data = await res.json()
      if (!res.ok) {
        window.Swal.fire({ icon: 'error', title: 'No encontrado', text: data.error || 'No se encontró el personal.' })
        return
      }
      onPersonalFound({ matricula: String(data.matricula), nombre: data.nombre, id_rol: String(data.id_rol) })
      setPersonalValido(true)
      setPersonalStatus('ok')
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al leer el QR de personal.' })
    }
  }

  const handleMatriculaBlur = async (matricula) => {
    if (!matricula) { setPersonalStatus(null); return }
    setPersonalStatus('cargando')
    try {
      const res = await fetch(`/Solicitudes/buscar-personal/?qr_data=${encodeURIComponent(matricula)}`)
      const data = await res.json()
      if (res.ok) {
        onPersonalFound({ nombre: data.nombre, id_rol: String(data.id_rol) })
        setPersonalValido(true)
        setPersonalStatus('ok')
      } else {
        setPersonalValido(false)
        setPersonalStatus('error')
      }
    } catch {
      setPersonalValido(false)
      setPersonalStatus('error')
    }
  }

  return { personalValido, setPersonalValido, personalStatus, reset, procesarQRPersonal, handleMatriculaBlur }
}
