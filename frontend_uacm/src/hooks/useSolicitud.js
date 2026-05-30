import { useState, useEffect, useRef, useCallback } from 'react'
import { getCookie } from '../utils/getCookie'
import { usePersonal } from './usePersonal'

function statusDotColor(nombre) {
  const n = (nombre || '').toLowerCase().trim()
  if (n === 'activo')  return '#28a745'
  if (n === 'agotado') return '#dc3545'
  return '#6c757d'
}

function prodTemplate(option) {
  if (!option.id || !window.$) return option.text
  const status = window.$(option.element).data('status') || ''
  const color  = statusDotColor(status)
  return window.$(`<span style="display:flex;align-items:center;gap:6px">
    <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
    <span>${option.text}</span>
  </span>`)
}

const formVacio = { matricula: '', nombre: '', id_rol: '', id_almacen: '', observaciones: '' }

export function useSolicitud({ datos, alertasStock, setModalAlertas, setCampanaVisible }) {
  const [form, setForm] = useState(formVacio)
  const [productos, setProductos] = useState([])
  const [prodSel, setProdSel] = useState({ id_producto: '', cantidad: 1 })
  const [solicitudActual, setSolicitudActual] = useState(null)
  const [buscarId, setBuscarId] = useState('')
  const [checkedItems, setCheckedItems] = useState(new Set())
  const [desdeAlertas, setDesdeAlertas] = useState(false)

  const rolRef     = useRef(null)
  const almacenRef = useRef(null)
  const productoRef = useRef(null)

  const { personalValido, setPersonalValido, personalStatus, reset: resetPersonal, procesarQRPersonal, handleMatriculaBlur } = usePersonal({
    onPersonalFound: (data) => setForm(f => ({ ...f, ...data })),
  })

  // ── Valores derivados ──────────────────────────────────────────────────────
  const solicitanteRolNombre = form.id_rol
    ? (datos?.roles?.find(r => String(r.id_rol) === String(form.id_rol))?.nombre_rol || '')
    : ''
  const solicitanteEsEncargado = solicitanteRolNombre.toLowerCase().includes('encargado')
  const almacenesFiltrados = !form.id_rol || solicitanteEsEncargado
    ? (datos?.almacenes || [])
    : (datos?.almacenes || []).filter(a => a.tipo_almacen.toLowerCase().includes('cuautepec'))
  const almacenEsCentral = datos?.ids_almacen_central?.includes(parseInt(form.id_almacen)) ?? false
  const productosFiltrados = almacenEsCentral
    ? (datos?.productos || [])
    : (datos?.productos || []).filter(p => p.id_estatus === datos?.id_estatus_activo)
  const accionable = solicitudActual?.estatus === 'SOLICITADA'

  // ── Auto-buscar si viene ?id= en la URL ────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (!id) return
    setBuscarId(id)
    fetch(`/Solicitudes/buscar/${id}/`)
      .then(r => r.json())
      .then(data => {
        if (!data.solicitud) return
        const sol = data.solicitud
        setForm({ matricula: String(sol.matricula || ''), nombre: sol.solicitante || '', id_rol: String(sol.id_rol || ''), id_almacen: String(sol.id_almacen || ''), observaciones: '' })
        setProductos(sol.productos)
        setPersonalValido(true)
        setSolicitudActual(sol)
        setCheckedItems(new Set())
        setDesdeAlertas(false)
        setTimeout(() => document.querySelector('.buscar-section')?.scrollIntoView({ behavior: 'smooth' }), 300)
      })
      .catch(() => {})
  }, [])

  // ── Callback refs Select2 ──────────────────────────────────────────────────
  const rolCallbackRef = useCallback(el => {
    rolRef.current = el
    if (!el || !window.$ || !window.$.fn?.select2) return
    window.$(el).select2({ placeholder: 'Seleccione un cargo', width: '100%' })
      .on('change.select2', e => setForm(f => ({ ...f, id_rol: e.target.value })))
  }, [])

  const almacenCallbackRef = useCallback(el => {
    almacenRef.current = el
    if (!el || !window.$ || !window.$.fn?.select2) return
    window.$(el).select2({ placeholder: 'Seleccione un almacén', width: '100%' })
      .on('change.select2', e => setForm(f => ({ ...f, id_almacen: e.target.value })))
  }, [])

  const productoCallbackRef = useCallback(el => {
    productoRef.current = el
    if (!el || !window.$ || !window.$.fn?.select2) return
    window.$(el).select2({ placeholder: 'Seleccione un producto', width: '100%', templateResult: prodTemplate, templateSelection: prodTemplate })
      .on('change.select2', e => setProdSel(s => ({ ...s, id_producto: e.target.value })))
  }, [])

  // ── Sync React → Select2 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!window.$ || !rolRef.current) return
    window.$(rolRef.current).val(form.id_rol).trigger('change.select2')
  }, [form.id_rol])

  useEffect(() => {
    if (!window.$ || !almacenRef.current) return
    window.$(almacenRef.current).val(form.id_almacen).trigger('change.select2')
  }, [form.id_almacen])

  useEffect(() => {
    if (!window.$ || !productoRef.current) return
    window.$(productoRef.current).val(prodSel.id_producto).trigger('change.select2')
  }, [prodSel.id_producto])

  // ── Reinicializar Select2 de producto cuando cambia lista o almacén ────────
  useEffect(() => {
    if (!window.$ || !productoRef.current) return
    const $el = window.$(productoRef.current)
    if ($el.data('select2')) $el.select2('destroy')
    $el.select2({ placeholder: 'Seleccione un producto', width: '100%', templateResult: prodTemplate, templateSelection: prodTemplate })
      .on('change.select2', e => setProdSel(s => ({ ...s, id_producto: e.target.value })))
    if (prodSel.id_producto) {
      const sigueDisponible = productosFiltrados.find(p => String(p.id_producto) === prodSel.id_producto)
      if (sigueDisponible) $el.val(prodSel.id_producto).trigger('change.select2')
      else setProdSel(s => ({ ...s, id_producto: '' }))
    }
  }, [datos?.productos?.length, form.id_almacen])

  // ── Reinicializar Select2 de almacén cuando cambia el rol ─────────────────
  useEffect(() => {
    if (!window.$ || !almacenRef.current) return
    const $el = window.$(almacenRef.current)
    if ($el.data('select2')) $el.select2('destroy')
    $el.select2({ placeholder: 'Seleccione un almacén', width: '100%' })
      .on('change.select2', e => setForm(f => ({ ...f, id_almacen: e.target.value })))
    if (!solicitudActual && almacenesFiltrados.length === 1) {
      setForm(f => ({ ...f, id_almacen: String(almacenesFiltrados[0].id_almacen) }))
    } else if (!solicitudActual && form.id_almacen && !almacenesFiltrados.find(a => String(a.id_almacen) === form.id_almacen)) {
      setForm(f => ({ ...f, id_almacen: '' }))
    }
  }, [solicitanteEsEncargado])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAgregarProducto = () => {
    if (solicitudActual) return
    if (!prodSel.id_producto || prodSel.cantidad <= 0) return
    const id   = String(prodSel.id_producto)
    const cant = parseInt(prodSel.cantidad) || 1
    const info = datos?.productos?.find(p => String(p.id_producto) === id)
    const nombre = info?.nombre_producto || id
    setProductos(prev => {
      const existe = prev.find(p => p.id_producto === id)
      if (existe) return prev.map(p => p.id_producto === id ? { ...p, cantidad: p.cantidad + cant } : p)
      return [...prev, { id_producto: id, nombre, cantidad: cant }]
    })
    setProdSel({ id_producto: '', cantidad: 1 })
  }

  const handleEnviar = async () => {
    if (solicitudActual) return
    if (!form.matricula.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa la matrícula del solicitante.' }); return
    }
    if (desdeAlertas && !solicitanteEsEncargado) {
      window.Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo un encargado de almacén puede generar una solicitud de reabastecimiento.' })
        .then(() => { setDesdeAlertas(false); setProductos([]); setForm(f => ({ ...f, id_almacen: '' })) })
      return
    }
    if (!personalValido) {
      window.Swal.fire({ icon: 'warning', title: 'Personal inválido', text: 'La matrícula no está registrada. Verifica o usa el escáner QR.' }); return
    }
    if (!form.nombre.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el nombre del solicitante.' }); return
    }
    if (!form.id_almacen) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Selecciona un almacén de destino.' }); return
    }
    if (productos.length === 0) {
      window.Swal.fire({ icon: 'warning', title: 'Sin productos', text: 'Agrega al menos un producto.' }); return
    }

    const payload = {
      id_almacen:              form.id_almacen,
      id_personal:             form.matricula.trim(),
      observaciones_solicitud: form.observaciones.trim(),
      productos: productos.map(p => ({ id_producto: p.id_producto, cantidad: p.cantidad })),
    }

    try {
      const res = await fetch('/Solicitudes/crear/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(payload),
      })
      const rawText = await res.text()
      let result
      try { result = JSON.parse(rawText) } catch { throw new Error('Respuesta inválida del servidor: ' + rawText) }
      if (res.ok) {
        setSolicitudActual(result.solicitud)
        setProductos(result.solicitud.productos)
        setCheckedItems(new Set())
        if (desdeAlertas) setCampanaVisible(false)
        setDesdeAlertas(false)
        window.Swal.fire({ icon: 'success', title: 'Solicitud creada', text: 'Solicitud registrada correctamente.', timer: 2000, showConfirmButton: false })
      } else {
        throw new Error(result.message || result.error || rawText)
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  const handleMatriculaChange = (value) => {
    setForm(f => ({ ...f, matricula: value, nombre: '', id_rol: '' }))
    resetPersonal()
  }

  const handleNuevaSolicitud = () => {
    setSolicitudActual(null)
    setForm(formVacio)
    setProductos([])
    setProdSel({ id_producto: '', cantidad: 1 })
    resetPersonal()
    setCheckedItems(new Set())
    document.getElementById('nueva-solicitud-container')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCancelar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Cancelar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No', confirmButtonColor: '#dc3545',
    })
    if (!conf.isConfirmed) return
    try {
      const res = await fetch(`/Solicitudes/cancelar/${solicitudActual.id_solicitud}/`, {
        method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const result = await res.json()
      if (res.ok) {
        window.Swal.fire({ icon: 'success', title: 'Cancelada', text: 'Solicitud cancelada.', timer: 2000, showConfirmButton: false })
          .then(() => location.reload())
      } else {
        throw new Error(result.message || result.error)
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  const handleAprobar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Aprobar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'No', confirmButtonColor: '#28a745',
    })
    if (!conf.isConfirmed) return
    try {
      const res = await fetch(`/Solicitudes/aprobar/${solicitudActual.id_solicitud}/`, {
        method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const result = await res.json()
      if (res.ok) {
        setSolicitudActual(s => ({ ...s, estatus: 'APROBADA' }))
        window.Swal.fire({ icon: 'success', title: 'Aprobada', text: 'Solicitud aprobada correctamente.', timer: 2000, showConfirmButton: false })
      } else {
        window.Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo aprobar.' })
      }
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al aprobar la solicitud.' })
    }
  }

  const handleCheck = async (id_producto) => {
    const nuevos = new Set(checkedItems)
    if (nuevos.has(id_producto)) {
      nuevos.delete(id_producto)
      setCheckedItems(nuevos)
      return
    }
    nuevos.add(id_producto)
    setCheckedItems(nuevos)
    if (nuevos.size === productos.length) {
      const conf = await window.Swal.fire({
        icon: 'success', title: 'Todos los productos verificados', text: '¿Deseas aprobar la solicitud?',
        showCancelButton: true, confirmButtonText: 'Sí, aprobar', cancelButtonText: 'No por ahora',
        confirmButtonColor: '#28a745',
      })
      if (conf.isConfirmed) await handleAprobar()
      else {
        nuevos.delete(id_producto)
        setCheckedItems(new Set(nuevos))
      }
    }
  }

  const handleGenerarDesdeAlertas = () => {
    sessionStorage.removeItem('alertas_stock_vistas')
    setModalAlertas(false)
    setDesdeAlertas(true)
    const idCentral = datos?.ids_almacen_central?.[0]
    setForm(f => ({ ...f, id_almacen: idCentral ? String(idCentral) : '' }))
    setProductos(alertasStock.map(a => ({ id_producto: String(a.id_producto), nombre: a.nombre_producto, cantidad: a.faltante })))
  }

  const handleBuscarSolicitud = async () => {
    if (!buscarId.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el ID de la solicitud.' }); return
    }
    try {
      const res  = await fetch(`/Solicitudes/buscar/${buscarId}/`)
      const data = await res.json()
      if (!res.ok) {
        window.Swal.fire({ icon: 'info', title: 'No encontrada', text: data.error || 'Solicitud no encontrada.' }); return
      }
      const sol = data.solicitud
      setForm({ matricula: String(sol.matricula || ''), nombre: sol.solicitante || '', id_rol: String(sol.id_rol || ''), id_almacen: String(sol.id_almacen || ''), observaciones: '' })
      setProductos(sol.productos)
      setPersonalValido(true)
      setSolicitudActual(sol)
      setCheckedItems(new Set())
      setDesdeAlertas(false)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al buscar la solicitud.' })
    }
  }

  const handleExportar = () => {
    if (!solicitudActual) return
    window.open(`/Solicitudes/exportar/pdf/${solicitudActual.id_solicitud}/`)
  }

  return {
    // Estado
    form, setForm, productos, setProductos, prodSel, setProdSel,
    solicitudActual, setSolicitudActual, buscarId, setBuscarId,
    checkedItems, desdeAlertas,
    // Personal
    personalValido, personalStatus,
    // Derivados
    solicitanteEsEncargado, almacenesFiltrados, productosFiltrados, accionable,
    // Refs para JSX
    rolCallbackRef, almacenCallbackRef, productoCallbackRef,
    // Handlers
    handleAgregarProducto, handleEnviar, handleNuevaSolicitud,
    handleCancelar, handleAprobar, handleCheck,
    handleGenerarDesdeAlertas, handleBuscarSolicitud, handleExportar,
    // De usePersonal
    procesarQRPersonal, handleMatriculaBlur, handleMatriculaChange,
  }
}
