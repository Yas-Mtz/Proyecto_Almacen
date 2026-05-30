import { useState } from 'react'
import { getCookie } from '../utils/getCookie'

const formVacio = { nombre: '', descripcion: '', id_categoria: '', id_unidad: '', stock_minimo: 10 }

export function useNuevoProducto({ setDatos, setProdSel }) {
  const [modalNuevoProd, setModalNuevoProd] = useState(false)
  const [catalogosModal, setCatalogosModal] = useState(null)
  const [formNuevoProd, setFormNuevoProd] = useState(formVacio)

  const abrirModalNuevoProd = async () => {
    if (!catalogosModal) {
      try {
        const res = await fetch('/GestiondeProductos/datos/')
        const d = await res.json()
        setCatalogosModal(d)
      } catch {
        window.Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los catálogos.' })
        return
      }
    }
    setModalNuevoProd(true)
  }

  const handleGuardarNuevoProd = async () => {
    if (!formNuevoProd.nombre.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el nombre del producto.' }); return
    }
    if (!formNuevoProd.id_categoria || !formNuevoProd.id_unidad) {
      window.Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Selecciona categoría y unidad.' }); return
    }
    try {
      const res = await fetch('/GestiondeProductos/crear-rapido/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({
          nombre_producto:      formNuevoProd.nombre.trim(),
          descripcion_producto: formNuevoProd.descripcion,
          categoria_id:         formNuevoProd.id_categoria,
          unidad_id:            formNuevoProd.id_unidad,
          stock_minimo:         parseInt(formNuevoProd.stock_minimo) || 10,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setDatos(d => ({ ...d, productos: [...d.productos, { id_producto: result.id_producto, nombre_producto: result.nombre_producto, cantidad: result.cantidad }] }))
        setProdSel(s => ({ ...s, id_producto: String(result.id_producto) }))
        setModalNuevoProd(false)
        setFormNuevoProd(formVacio)
        window.Swal.fire({ icon: 'success', title: 'Producto creado', text: `"${result.nombre_producto}" registrado correctamente.`, timer: 2000, showConfirmButton: false })
      } else {
        window.Swal.fire({ icon: 'error', title: 'Error', text: result.message })
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  return { modalNuevoProd, setModalNuevoProd, catalogosModal, formNuevoProd, setFormNuevoProd, abrirModalNuevoProd, handleGuardarNuevoProd }
}
