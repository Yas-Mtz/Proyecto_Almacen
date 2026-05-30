import { useState, useEffect, useRef } from 'react'

export function useQr({ datos, setProdSel, procesarQRPersonal }) {
  const [qrModo, setQrModo] = useState(null)
  const [qrInput, setQrInput] = useState('')
  const qrInputRef = useRef(null)

  useEffect(() => {
    if (qrModo && qrInputRef.current) {
      setTimeout(() => qrInputRef.current?.focus(), 100)
    }
  }, [qrModo])

  const procesarQRProducto = (qrData) => {
    const partes = qrData.split(' - ')
    if (partes.length < 2) {
      window.Swal.fire({ icon: 'warning', title: 'QR no reconocido', text: 'Formato de QR de producto no reconocido.' })
      return
    }
    const idProducto = partes[0].trim()
    const existe = datos?.productos?.find(p => String(p.id_producto) === idProducto)
    if (!existe) {
      window.Swal.fire({ icon: 'warning', title: 'No encontrado', text: `Producto con ID ${idProducto} no encontrado en la lista.` })
      return
    }
    setProdSel(s => ({ ...s, id_producto: idProducto }))
  }

  const handleQrEnter = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const contenido = qrInput.trim()
    setQrModo(null)
    setQrInput('')
    if (!contenido) return
    if (contenido.startsWith('http://') || contenido.startsWith('https://')) {
      await procesarQRPersonal(contenido)
    } else if (contenido.includes(' - ')) {
      procesarQRProducto(contenido)
    } else {
      await procesarQRPersonal(contenido)
    }
  }

  return { qrModo, setQrModo, qrInput, setQrInput, qrInputRef, handleQrEnter }
}
