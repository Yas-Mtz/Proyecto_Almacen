import { useState } from 'react'
import { getCookie } from '../utils/getCookie'

export function useRecepcion({ solicitudActual, setSolicitudActual }) {
  const [modalRecepcion, setModalRecepcion] = useState(false)
  const [recepcionItems, setRecepcionItems] = useState([])

  const abrirModalRecepcion = () => {
    if (!solicitudActual) return
    setRecepcionItems(
      solicitudActual.productos.map(p => ({
        id_producto:       p.id_producto,
        nombre:            p.nombre,
        cantidad:          p.cantidad,
        cantidad_recibida: p.cantidad,
      }))
    )
    setModalRecepcion(true)
  }

  const handleConfirmarRecepcion = async () => {
    const hayError = recepcionItems.some(p => p.cantidad_recibida < 0 || p.cantidad_recibida > p.cantidad)
    if (hayError) {
      window.Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad recibida no puede ser mayor a la solicitada ni negativa.' })
      return
    }
    try {
      const res = await fetch(`/Solicitudes/recepcion/${solicitudActual.id_solicitud}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: recepcionItems.map(p => ({ id_producto: p.id_producto, cantidad_recibida: p.cantidad_recibida })) }),
      })
      const result = await res.json()
      if (res.ok) {
        const hayParcial = recepcionItems.some(p => p.cantidad_recibida < p.cantidad)
        const nuevoEstatus = hayParcial ? 'ENTREGA_PARCIAL' : 'COMPLETADA'
        setSolicitudActual(s => ({ ...s, estatus: nuevoEstatus }))
        setModalRecepcion(false)
        const idNueva = result.id_solicitud_nueva
        window.Swal.fire({
          icon: 'success',
          title: hayParcial ? 'Entrega parcial registrada' : 'Entrega completa registrada',
          html: hayParcial
            ? `Algunos productos no llegaron en su totalidad.<br><br>Se generó la solicitud de seguimiento <b>#${idNueva}</b> y se notificó a almacén central.`
            : 'Todos los productos fueron recibidos correctamente.',
          timer: hayParcial ? 0 : 2500,
          showConfirmButton: hayParcial,
          confirmButtonText: 'Aceptar',
        })
      } else {
        window.Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo registrar la recepción.' })
      }
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al registrar la recepción.' })
    }
  }

  return { modalRecepcion, setModalRecepcion, recepcionItems, setRecepcionItems, abrirModalRecepcion, handleConfirmarRecepcion }
}
