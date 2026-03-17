import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookie(name) {
  let value = null
  if (document.cookie)
    document.cookie.split(';').forEach(c => {
      const t = c.trim()
      if (t.startsWith(name + '=')) value = decodeURIComponent(t.substring(name.length + 1))
    })
  return value
}

const formVacio = {
  id_producto: '', nombre_producto: '', descripcion_producto: '',
  observaciones: '', cantidad: '0', stock_minimo: '',
  id_estatus: '', id_categoria: '', id_marca: '', id_unidad: '',
  action: 'add',
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function GestionDeProductos() {
  const [datos, setDatos]               = useState(null)
  const [form, setForm]                 = useState(formVacio)
  const [modo, setModo]                 = useState('add')
  const [buscarId, setBuscarId]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [qrOpen, setQrOpen]             = useState(false)
  const [imageModal, setImageModal]     = useState({ open: false, src: '', nombre: '', id: '', categoria: '' })
  const [imagen, setImagen]             = useState({ preview: null, nombre: 'No se seleccionó archivo', nueva: false, file: null })
  const [qr, setQr]                     = useState({ id: '----', nombre: '----', url: null })
  const [semaforo, setSemaforo]         = useState({ estado: 'none', detalle: '', warning: '' })
  const [validacion, setValidacion]     = useState({ msg: '', tipo: 'info', disabled: false })
  const [descripcionLen, setDescripcionLen] = useState(0)
  const [observacionesLen, setObservacionesLen] = useState(0)
  const [stockInfo, setStockInfo]       = useState({ mostrar: false, display: '' })
  const [camposError, setCamposError]   = useState(new Set())

  const cantidadActualBD    = useRef(0)
  const alertaStockRef      = useRef(false)
  const nextIdRef           = useRef('')
  const validacionTimeout   = useRef(null)
  const qrAutoTimeout       = useRef(null)
  const imagenInputRef      = useRef(null)
  const estatusRef          = useRef(null)
  const categoriaRef        = useRef(null)
  const marcaRef            = useRef(null)
  const unidadRef           = useRef(null)

  const $ = () => window.$

  // ── Cargar catálogos e info de usuario ─────────────────────────────────────
  useEffect(() => {
    fetch('/GestiondeProductos/datos/')
      .then(r => r.json())
      .then(d => {
        setDatos(d)
        nextIdRef.current = String(d.next_id)
        setForm(f => ({ ...f, id_producto: String(d.next_id), id_estatus: String(d.estatus_activo || '') }))
      })
      .catch(() => setDatos({}))
  }, [])

  // ── Inicializar Select2 cuando llegan los catálogos ────────────────────────
  useEffect(() => {
    if (!datos || !window.$) return
    const $ = window.$

    const initSelect2 = (ref, opts) => {
      if (!ref.current) return
      $(ref.current).select2(opts)
    }

    initSelect2(estatusRef,   { placeholder: 'Selecciona un estatus',    allowClear: false, width: '100%', minimumResultsForSearch: -1 })
    initSelect2(categoriaRef, { placeholder: 'Selecciona una categoría', allowClear: true,  width: '100%', language: { noResults: () => 'Sin resultados' } })
    initSelect2(marcaRef,     { placeholder: 'Selecciona una marca',     allowClear: true,  width: '100%', language: { noResults: () => 'Sin resultados' } })
    initSelect2(unidadRef,    { placeholder: 'Selecciona una unidad',    allowClear: false, width: '100%', minimumResultsForSearch: Infinity })

    const refs = [estatusRef, categoriaRef, marcaRef, unidadRef]
    const keys = ['id_estatus', 'id_categoria', 'id_marca', 'id_unidad']
    refs.forEach((ref, i) => {
      if (!ref.current) return
      $(ref.current).on('change.select2', e => {
        setForm(f => ({ ...f, [keys[i]]: e.target.value }))
      })
    })

    return () => {
      refs.forEach(ref => {
        try { if (ref.current) $(ref.current).select2('destroy') } catch {}
      })
    }
  }, [datos])

  // ── Sincronizar Select2 cuando React cambia el valor ──────────────────────
  useEffect(() => {
    if (!window.$ || !datos) return
    const $ = window.$
    if (estatusRef.current)   $(estatusRef.current).val(form.id_estatus).trigger('change')
    if (categoriaRef.current) $(categoriaRef.current).val(form.id_categoria).trigger('change')
    if (marcaRef.current)     $(marcaRef.current).val(form.id_marca).trigger('change')
    if (unidadRef.current)    $(unidadRef.current).val(form.id_unidad).trigger('change')
  }, [form.id_estatus, form.id_categoria, form.id_marca, form.id_unidad, datos])

  // ── Semáforo de stock ──────────────────────────────────────────────────────
  const actualizarSemaforo = useCallback((cantidadEfectiva, stockMinimo) => {
    if (!stockMinimo || stockMinimo <= 0) { setSemaforo({ estado: 'none', detalle: '', warning: '' }); return }
    const detalle = `Actual: ${cantidadEfectiva} | Mínimo: ${stockMinimo}`
    if (cantidadEfectiva > stockMinimo * 2) {
      setSemaforo({ estado: 'verde', detalle, warning: '' })
    } else if (cantidadEfectiva > stockMinimo) {
      setSemaforo({ estado: 'amarillo', detalle, warning: '<i class="fas fa-exclamation-triangle"></i> Stock próximo al mínimo' })
    } else {
      setSemaforo({ estado: 'rojo', detalle, warning: '<i class="fas fa-exclamation-triangle"></i> Stock igual o por debajo del mínimo' })
      alertaStockRef.current = true
    }
  }, [form.nombre_producto])

  // ── Verificar stock bajo ───────────────────────────────────────────────────
  const verificarStockBajo = useCallback(() => {
    const stockMinimo = parseInt(form.stock_minimo) || 0
    const delta = parseInt(form.cantidad) || 0
    const cantidadEfectiva = form.action === 'update' ? cantidadActualBD.current + delta : delta
    if (form.action === 'update' && delta !== 0) {
      setStockInfo(s => ({ ...s, display: `${cantidadActualBD.current} → ${cantidadEfectiva}` }))
    } else if (form.action === 'update') {
      setStockInfo(s => ({ ...s, display: String(cantidadActualBD.current) }))
    }
    actualizarSemaforo(cantidadEfectiva, stockMinimo)
  }, [form.cantidad, form.stock_minimo, form.action, actualizarSemaforo])

  useEffect(() => { verificarStockBajo() }, [form.cantidad, form.stock_minimo, verificarStockBajo])

  // ── QR ────────────────────────────────────────────────────────────────────
  const actualizarQR = useCallback((id, nombre) => {
    if (!id || !nombre) return
    const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(nombre)}`
    setQr({ id, nombre, url })
  }, [])

  const limpiarQR = () => setQr({ id: '----', nombre: '----', url: null })

  // QR automático al escribir nombre
  useEffect(() => {
    clearTimeout(qrAutoTimeout.current)
    const id = form.id_producto.trim()
    const nombre = form.nombre_producto.trim()
    if (id && nombre.length >= 3) {
      qrAutoTimeout.current = setTimeout(() => actualizarQR(id, nombre), 900)
    }
    return () => clearTimeout(qrAutoTimeout.current)
  }, [form.nombre_producto, form.id_producto, actualizarQR])

  // ── Validar nombre en tiempo real ─────────────────────────────────────────
  const validarNombreProducto = useCallback((nombre) => {
    if (!nombre || nombre.trim().length === 0) {
      setValidacion({ msg: '', tipo: 'info', disabled: false }); return
    }
    if (form.action === 'update') return
    setValidacion({ msg: '🔄 Verificando disponibilidad...', tipo: 'info', disabled: false })
    fetch(`/GestiondeProductos/verificar-producto/?nombre=${encodeURIComponent(nombre.trim())}`)
      .then(r => r.json())
      .then(data => {
        if (data.existe) {
          setValidacion({
            disabled: true,
            tipo: 'warning',
            msg: `⚠️ <strong>Producto existente:</strong><br>📋 ID: ${data.producto.id_producto}<br>🏷️ Nombre: ${data.producto.nombre_producto}<br>📂 Categoría: ${data.producto.categoria}<br>💡 <button type="button" onclick="window.__cargarProductoExistente(${data.producto.id_producto})" class="btn-link">¿Desea cargarlo para actualizar?</button>`,
          })
        } else {
          setValidacion({ msg: '✅ Nombre disponible', tipo: 'success', disabled: false })
        }
      })
      .catch(() => setValidacion({ msg: '', tipo: 'info', disabled: false }))
  }, [form.action])

  // ── Cargar datos de producto en el formulario ──────────────────────────────
  const cargarDatosProducto = useCallback((producto) => {
    cantidadActualBD.current = parseInt(producto.cantidad) || 0
    alertaStockRef.current = false
    setForm({
      id_producto: String(producto.id_producto),
      nombre_producto: producto.nombre_producto,
      descripcion_producto: producto.descripcion_producto || '',
      observaciones: producto.observaciones || '',
      cantidad: '',
      stock_minimo: String(producto.stock_minimo),
      id_estatus: String(producto.id_estatus),
      id_categoria: String(producto.id_categoria),
      id_marca: String(producto.id_marca),
      id_unidad: String(producto.id_unidad),
      action: 'update',
    })
    setDescripcionLen((producto.descripcion_producto || '').length)
    setObservacionesLen((producto.observaciones || '').length)
    setStockInfo({ mostrar: true, display: String(cantidadActualBD.current) })
    setValidacion({ msg: '', tipo: 'info', disabled: false })
    setModo('edit')
    actualizarQR(producto.id_producto, producto.nombre_producto)
    actualizarSemaforo(cantidadActualBD.current, parseInt(producto.stock_minimo) || 0)

    // Manejar imagen
    if (producto.imagen_url) {
      setImagen({ preview: producto.imagen_url, nombre: producto.imagen_nombre, nueva: false, file: null })
    } else {
      setImagen({ preview: null, nombre: 'No se seleccionó archivo', nueva: false, file: null })
    }
  }, [actualizarQR, actualizarSemaforo])

  // Función global para cargar desde HTML dinámico (mensaje de validación)
  useEffect(() => {
    window.__cargarProductoExistente = (idProducto) => {
      setLoading(true)
      fetch(`/GestiondeProductos/?buscar=${idProducto}`)
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            cargarDatosProducto(data)
            setValidacion({ msg: '', tipo: 'info', disabled: false })
            window.Swal.fire({ icon: 'info', title: 'Producto cargado', text: 'El producto se ha cargado para edición.', timer: 2000, showConfirmButton: false })
          }
        })
        .catch(() => window.Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el producto.' }))
        .finally(() => setLoading(false))
    }
    return () => { delete window.__cargarProductoExistente }
  }, [cargarDatosProducto])

  // ── Búsqueda de producto ───────────────────────────────────────────────────
  const ejecutarBusqueda = useCallback((id) => {
    setLoading(true)
    fetch(`/GestiondeProductos/?buscar=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          cargarDatosProducto(data)
        } else {
          window.Swal.fire({ icon: 'info', title: 'Producto no encontrado', text: 'No se encontró ningún producto con ese ID.' })
        }
      })
      .catch(() => window.Swal.fire({ icon: 'error', title: 'Error en la búsqueda', text: 'Ocurrió un error al buscar el producto.' }))
      .finally(() => setLoading(false))
  }, [cargarDatosProducto])

  const handleBuscar = () => {
    const id = buscarId.trim()
    if (!id || !/^\d+$/.test(id)) {
      window.Swal.fire({ icon: 'warning', title: 'Búsqueda inválida', text: 'Por favor, ingresa un ID de producto válido (solo números).' })
      return
    }
    const tieneNombre = form.nombre_producto.trim() !== ''
    const tieneDesc   = form.descripcion_producto.trim() !== ''
    if (tieneNombre || tieneDesc) {
      window.Swal.fire({
        icon: 'question', title: 'Formulario con datos',
        text: 'El formulario tiene datos sin guardar. ¿Deseas descartarlos y cargar el producto buscado?',
        showCancelButton: true, confirmButtonText: 'Sí, cargar producto',
        cancelButtonText: 'Cancelar', confirmButtonColor: '#640404',
      }).then(r => { if (r.isConfirmed) ejecutarBusqueda(id) })
    } else {
      ejecutarBusqueda(id)
    }
  }

  // ── Validar formulario ────────────────────────────────────────────────────
  const limpiarError = (campo) => setCamposError(s => { const n = new Set(s); n.delete(campo); return n })

  const validarFormulario = () => {
    const required = ['id_producto', 'nombre_producto', 'stock_minimo', 'id_estatus', 'id_categoria', 'id_marca', 'id_unidad']
    if (form.action === 'add') required.push('cantidad')
    const faltantes = required.filter(k => !form[k])
    if (faltantes.length > 0) {
      setCamposError(new Set(faltantes))
      window.Swal.fire({ icon: 'error', title: 'Formulario incompleto o con errores', text: 'Por favor, complete todos los campos requeridos correctamente.' })
      return false
    }
    setCamposError(new Set())
    const cantidadVal = form.cantidad === '' ? 0 : parseInt(form.cantidad)
    if (isNaN(cantidadVal) || cantidadVal < 0) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'La cantidad debe ser un número válido y no negativo.' })
      return false
    }
    const stockMinimo = parseInt(form.stock_minimo)
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'El stock mínimo debe ser un número válido y no negativo.' })
      return false
    }
    if (validacion.disabled) {
      window.Swal.fire({ icon: 'warning', title: 'Producto duplicado', text: 'Ya existe un producto con ese nombre. Por favor, cárguelo para actualizar o use un nombre diferente.' })
      return false
    }
    return true
  }

  // ── Guardar producto ───────────────────────────────────────────────────────
  const handleGuardar = () => {
    if (!validarFormulario()) return
    const cantidadAAgregar = parseInt(form.cantidad) || 0
    const nuevaCantidad = cantidadActualBD.current + cantidadAAgregar

    const fd = new FormData()
    fd.append('id_producto', form.id_producto)
    fd.append('nombre_producto', form.nombre_producto)
    fd.append('descripcion_producto', form.descripcion_producto)
    fd.append('cantidad', nuevaCantidad)
    fd.append('stock_minimo', form.stock_minimo)
    fd.append('id_estatus', form.id_estatus)
    fd.append('id_categoria', form.id_categoria)
    fd.append('id_marca', form.id_marca)
    fd.append('id_unidad', form.id_unidad)
    fd.append('observaciones', form.observaciones)
    fd.append('action', form.action)
    fd.append('csrfmiddlewaretoken', getCookie('csrftoken'))
    if (imagen.nueva && imagen.file) fd.append('imagen_producto', imagen.file)

    setLoading(true)
    fetch('/GestiondeProductos/', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: fd,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          cantidadActualBD.current = nuevaCantidad
          setForm(f => ({ ...f, cantidad: '' }))
          actualizarQR(form.id_producto, form.nombre_producto)
          window.Swal.fire({ icon: 'success', title: 'Producto guardado', html: data.message || 'El producto se guardó correctamente.', width: '500px' })
            .then(() => location.reload())
        } else {
          window.Swal.fire({ icon: 'error', title: 'Error al guardar producto', html: data.message || 'Hubo un problema al guardar el producto.', width: '500px' })
        }
      })
      .catch(() => window.Swal.fire({ icon: 'error', title: 'Error del servidor', text: 'Ocurrió un error en la solicitud al servidor.' }))
      .finally(() => setLoading(false))
  }

  // ── Retirar stock ──────────────────────────────────────────────────────────
  const handleAjustarStock = () => {
    const cantidadActual = cantidadActualBD.current || 0
    window.Swal.fire({
      title: 'Eliminar cantidad', text: `Cantidad actual: ${cantidadActual}`,
      input: 'number', inputValue: 0,
      inputAttributes: { min: 0, max: cantidadActual },
      showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar',
      inputValidator: v => v === '' ? 'Por favor ingresa un valor' : null,
    }).then(result => {
      if (!result.isConfirmed) return
      const ajuste = parseInt(result.value) || 0
      if (ajuste < 0) { window.Swal.fire('Error', 'No se permiten números negativos', 'error'); return }
      if (ajuste > cantidadActual) { window.Swal.fire('Error', 'No puede ajustar más de lo que tiene en stock', 'error'); return }
      const nuevaCantidad = cantidadActual - ajuste
      setForm(f => ({ ...f, cantidad: String(nuevaCantidad) }))

      const fd = new FormData()
      fd.append('id_producto', form.id_producto)
      fd.append('nueva_cantidad', nuevaCantidad)
      fd.append('csrfmiddlewaretoken', getCookie('csrftoken'))

      setLoading(true)
      fetch('/GestiondeProductos/actualizar_stock/', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            cantidadActualBD.current = nuevaCantidad
            window.Swal.fire({ icon: 'success', title: 'Ajuste exitoso', text: 'Se ha ajustado correctamente la cantidad.' })
              .then(() => location.reload())
          }
        })
        .finally(() => setLoading(false))
    })
  }

  // ── Resetear a modo nuevo ──────────────────────────────────────────────────
  const handleNuevo = () => {
    cantidadActualBD.current = 0
    alertaStockRef.current = false
    setForm({ ...formVacio, id_producto: nextIdRef.current, id_estatus: String(datos?.estatus_activo || '') })
    setModo('add')
    setBuscarId('')
    setImagen({ preview: null, nombre: 'No se seleccionó archivo', nueva: false, file: null })
    setQr({ id: '----', nombre: '----', url: null })
    setSemaforo({ estado: 'none', detalle: '', warning: '' })
    setValidacion({ msg: '', tipo: 'info', disabled: false })
    setDescripcionLen(0)
    setObservacionesLen(0)
    setStockInfo({ mostrar: false, display: '' })
    setCamposError(new Set())
  }

  // ── Imagen ────────────────────────────────────────────────────────────────
  const handleImagenChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setImagen({ preview: ev.target.result, nombre: file.name, nueva: true, file })
      reader.readAsDataURL(file)
    } else {
      setImagen({ preview: null, nombre: 'No se seleccionó archivo', nueva: false, file: null })
    }
  }

  // ── Debug funciones globales ───────────────────────────────────────────────
  useEffect(() => {
    window.debugBusqueda = (id) => {
      fetch(`/GestiondeProductos/?buscar=${id}`)
        .then(r => r.json())
        .then(data => { console.log('✅ Respuesta:', data); console.table(data) })
        .catch(e => console.log('❌ Error:', e))
    }
    window.debugImagen = (idProducto) => {
      fetch(`/GestiondeProductos/?buscar=${idProducto}`)
        .then(r => r.json())
        .then(data => {
          if (data.imagen_url) {
            const img = new Image()
            img.onload = () => console.log('✓ Imagen cargada:', img.width, 'x', img.height)
            img.onerror = () => console.log('✗ Error al cargar imagen')
            img.src = data.imagen_url
          }
        })
    }
    window.verImagenCompleta = (imagenUrl, productName, productId, productCategory) => {
      setImageModal({ open: true, src: imagenUrl, nombre: productName, id: productId, categoria: productCategory || 'N/A' })
    }
    return () => {
      delete window.debugBusqueda
      delete window.debugImagen
      delete window.verImagenCompleta
    }
  }, [])

  // ESC para cerrar modal
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setImageModal(m => ({ ...m, open: false })) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!datos) return <p style={{ padding: '2rem' }}>Cargando...</p>

  const esEncargado = datos.user_role?.toLowerCase().includes('encargado')
  const bloqueado   = !esEncargado

  const semaforoLabel = {
    verde:    { text: 'Stock suficiente', cls: 'verde' },
    amarillo: { text: 'Stock moderado — considere reabastecer pronto', cls: 'amarillo' },
    rojo:     { text: '¡Stock crítico! Solicitar reabastecimiento', cls: 'rojo' },
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/static/media/logouacm.jpg" alt="Logo UACM" className="header-logo" />
            <a href="/home/" className="home-button" aria-label="Inicio"><i className="fas fa-home"></i></a>
            <div className="header-title">
              <h1>Gestión de Productos</h1>
              <p className="header-subtitle">Control de inventario del almacén</p>
            </div>
          </div>
          <div className={`user-profile${dropdownOpen ? ' active' : ''}`} id="userProfile" onClick={() => setDropdownOpen(o => !o)}>
            <div className="user-info">
              <span className="user-name">{datos.persona_nombre}</span>
              <span className="user-role">{datos.user_role}</span>
            </div>
            <div className="user-avatar"><i className="fas fa-user"></i></div>
            <div className="dropdown-menu">
              <a href="/home/" className="dropdown-item"><i className="fas fa-home"></i><span>Inicio</span></a>
              <a href="/login/logout/" className="dropdown-item logout"><i className="fas fa-sign-out-alt"></i><span>Cerrar Sesión</span></a>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content" role="main">
        <div className="layout-grid">

          {/* ── COLUMNA IZQUIERDA: Formulario ── */}
          <div className="form-container">
            <h1><i className="fas fa-boxes"></i> Gestión de Productos</h1>

            <div className="form-top-bar">
              <div
                className={`modo-indicator ${modo === 'add' ? 'modo-add' : 'modo-edit'}`}
                onClick={modo === 'edit' ? handleNuevo : undefined}
                style={{ cursor: modo === 'edit' ? 'pointer' : 'default' }}
              >
                <i className={`fas ${modo === 'add' ? 'fa-plus-circle' : 'fa-edit'}`}></i>
                <span>{modo === 'add' ? 'Nuevo producto' : `Editando #${form.id_producto} — ${form.nombre_producto}`}</span>
                {modo === 'edit' && <><span className="modo-separator">|</span><span className="modo-action"><i className="fas fa-undo"></i> Nuevo</span></>}
              </div>
            </div>

            {/* Búsqueda */}
            <div className="search-container" role="search">
              <input type="text" id="buscar" placeholder="Buscar por ID" className="form-control"
                value={buscarId} onChange={e => setBuscarId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()} />
              <button className="search-btn" aria-label="Buscar producto" onClick={handleBuscar}>
                <i className="fas fa-search"></i>
              </button>
            </div>

            {/* Formulario */}
            <form id="product-form" encType="multipart/form-data" noValidate onSubmit={e => e.preventDefault()}>
              <input type="hidden" name="action" value={form.action} />
              <input type="hidden" id="current_product_id" value={form.id_producto} />

              {bloqueado && (
                <div className="sin-permiso-banner">
                  <i className="fas fa-lock"></i>
                  <span>No tienes permisos para registrar o modificar productos. Solo puedes consultar.</span>
                </div>
              )}

              {/* Datos Generales */}
              <div className="form-section">
                <p className="form-section-title"><i className="fas fa-info-circle"></i> Datos Generales</p>
                <div className="form-row form-row-2col">
                  <div className="form-group">
                    <label htmlFor="id_producto"><i className="fas fa-barcode"></i> ID</label>
                    <input type="text" id="id_producto" className="form-control" readOnly value={form.id_producto} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nombre_producto"><i className="fas fa-tag"></i> Nombre {camposError.has('nombre_producto') && <span className="campo-requerido-mark">*</span>}</label>
                    <input type="text" id="nombre_producto" className={`form-control${camposError.has('nombre_producto') ? ' is-invalid' : ''}`} required maxLength={100}
                      value={form.nombre_producto}
                      onChange={e => { limpiarError('nombre_producto'); setForm(f => ({ ...f, nombre_producto: e.target.value })); clearTimeout(validacionTimeout.current); validacionTimeout.current = setTimeout(() => validarNombreProducto(e.target.value), 500) }}
                      onBlur={e => { clearTimeout(validacionTimeout.current); validarNombreProducto(e.target.value) }} />
                    {camposError.has('nombre_producto') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                    {validacion.msg && (
                      <div className={`validation-message validation-${validacion.tipo}`} dangerouslySetInnerHTML={{ __html: validacion.msg }} />
                    )}
                  </div>
                </div>
                <div className="form-row form-row-2col">
                  <div className="form-group">
                    <label htmlFor="descripcion_producto"><i className="fas fa-align-left"></i> Descripción</label>
                    <textarea id="descripcion_producto" className="form-control" rows={3} required maxLength={300}
                      value={form.descripcion_producto}
                      onChange={e => { setForm(f => ({ ...f, descripcion_producto: e.target.value })); setDescripcionLen(e.target.value.length) }} />
                    <div className={`char-counter ${descripcionLen >= 300 ? 'at-limit' : descripcionLen >= 250 ? 'near-limit' : ''}`}>
                      <span>{descripcionLen}</span>/300
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="observaciones"><i className="fas fa-sticky-note"></i> Observaciones</label>
                    <textarea id="observaciones" className="form-control" rows={3} maxLength={300}
                      value={form.observaciones}
                      onChange={e => { setForm(f => ({ ...f, observaciones: e.target.value })); setObservacionesLen(e.target.value.length) }} />
                    <div className={`char-counter ${observacionesLen >= 300 ? 'at-limit' : observacionesLen >= 250 ? 'near-limit' : ''}`}>
                      <span>{observacionesLen}</span>/300
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventario */}
              <div className="form-section">
                <p className="form-section-title"><i className="fas fa-warehouse"></i> Inventario</p>
                <div className="form-row form-row-2col">
                  <div className="form-group">
                    <label htmlFor="cantidad"><i className="fas fa-boxes"></i> <span>{modo === 'edit' ? 'Agregar al stock' : 'Cantidad inicial'}</span> {camposError.has('cantidad') && <span className="campo-requerido-mark">*</span>}</label>
                    {stockInfo.mostrar && (
                      <div className="stock-actual-info" aria-live="polite">
                        <i className="fas fa-warehouse"></i>
                        <span>Stock actual en bodega: <strong>{stockInfo.display}</strong> unidades</span>
                      </div>
                    )}
                    <div className="quantity-controls">
                      <button type="button" className="quantity-btn" aria-label="Reducir cantidad"
                        onClick={() => setForm(f => ({ ...f, cantidad: String(Math.max(0, (parseInt(f.cantidad) || 0) - 1)) }))}>
                        <i className="fas fa-minus"></i>
                      </button>
                      <input type="text" id="cantidad" className={`form-control${camposError.has('cantidad') ? ' is-invalid' : ''}`} value={form.cantidad}
                        placeholder={modo === 'edit' ? '0 = sin cambio' : ''}
                        onChange={e => { limpiarError('cantidad'); setForm(f => ({ ...f, cantidad: e.target.value })) }} />
                      <button type="button" className="quantity-btn" aria-label="Aumentar cantidad"
                        onClick={() => setForm(f => ({ ...f, cantidad: String((parseInt(f.cantidad) || 0) + 1) }))}>
                        <i className="fas fa-plus"></i>
                      </button>
                      {modo === 'edit' && (
                        <button type="button" id="adjust-stock" className="btn btn-secondary" title="Retirar stock" onClick={handleAjustarStock}>
                          <i className="fas fa-minus-circle"></i> Retirar
                        </button>
                      )}
                    </div>
                    {camposError.has('cantidad') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                    {modo === 'edit' && (
                      <div className="cantidad-hint">
                        <i className="fas fa-info-circle"></i> Ingresa la cantidad a <strong>agregar</strong> al stock. Para retirar usa el botón <em>Retirar</em>.
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="stock_minimo"><i className="fas fa-exclamation-triangle"></i> Stock Mínimo {camposError.has('stock_minimo') && <span className="campo-requerido-mark">*</span>}</label>
                    <input type="number" id="stock_minimo" className={`form-control${camposError.has('stock_minimo') ? ' is-invalid' : ''}`} required min={0} step={1}
                      value={form.stock_minimo} onChange={e => { limpiarError('stock_minimo'); setForm(f => ({ ...f, stock_minimo: e.target.value })) }} />
                    {camposError.has('stock_minimo') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                    {semaforo.warning && <div className="input-feedback" id="stock-warning" role="alert" dangerouslySetInnerHTML={{ __html: semaforo.warning }} />}
                    {semaforo.estado !== 'none' && (
                      <div className="semaforo" role="status" aria-live="polite">
                        <div className="semaforo-luces">
                          <div className={`semaforo-luz ${semaforo.estado === 'rojo' ? 'activo-rojo' : ''}`} title="Stock crítico"></div>
                          <div className={`semaforo-luz ${semaforo.estado === 'amarillo' ? 'activo-amarillo' : ''}`} title="Stock moderado"></div>
                          <div className={`semaforo-luz ${semaforo.estado === 'verde' ? 'activo-verde' : ''}`} title="Stock suficiente"></div>
                        </div>
                        <div className="semaforo-info">
                          <span className={`semaforo-etiqueta ${semaforoLabel[semaforo.estado]?.cls}`}>{semaforoLabel[semaforo.estado]?.text}</span>
                          <span className="semaforo-detalle">{semaforo.detalle}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clasificación */}
              <div className="form-section">
                <p className="form-section-title"><i className="fas fa-tags"></i> Clasificación</p>
                <div className="form-row form-row-2x2">
                  <div className="form-group">
                    <label htmlFor="id_estatus"><i className="fas fa-toggle-on"></i> Estatus {camposError.has('id_estatus') && <span className="campo-requerido-mark">*</span>}</label>
                    <div className={camposError.has('id_estatus') ? 'select2-wrapper-error' : ''}>
                      <select id="id_estatus" name="id_estatus" className="form-control" required ref={estatusRef}
                        onChange={() => limpiarError('id_estatus')}>
                        <option value="" disabled>Selecciona un estatus</option>
                        {datos.estatus_list?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                    {camposError.has('id_estatus') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="id_categoria"><i className="fas fa-list"></i> Categoría {camposError.has('id_categoria') && <span className="campo-requerido-mark">*</span>}</label>
                    <div className={camposError.has('id_categoria') ? 'select2-wrapper-error' : ''}>
                      <select id="id_categoria" name="id_categoria" className="form-control" required ref={categoriaRef}
                        onChange={() => limpiarError('id_categoria')}>
                        <option value="" disabled>Selecciona una categoría</option>
                        {datos.categorias_list?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    {camposError.has('id_categoria') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="id_marca"><i className="fas fa-copyright"></i> Marca {camposError.has('id_marca') && <span className="campo-requerido-mark">*</span>}</label>
                    <div className={camposError.has('id_marca') ? 'select2-wrapper-error' : ''}>
                      <select id="id_marca" name="id_marca" className="form-control" required ref={marcaRef}
                        onChange={() => limpiarError('id_marca')}>
                        <option value="" disabled>Selecciona una marca</option>
                        {datos.marcas_list?.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    {camposError.has('id_marca') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="id_unidad"><i className="fas fa-ruler-combined"></i> Unidad de Medida {camposError.has('id_unidad') && <span className="campo-requerido-mark">*</span>}</label>
                    <div className={camposError.has('id_unidad') ? 'select2-wrapper-error' : ''}>
                      <select id="id_unidad" name="id_unidad" className="form-control" required ref={unidadRef}
                        onChange={() => limpiarError('id_unidad')}>
                        <option value="" disabled>Selecciona una unidad</option>
                        {datos.unidades_list?.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                      </select>
                    </div>
                    {camposError.has('id_unidad') && <span className="campo-requerido-msg"><i className="fas fa-exclamation-circle"></i> Campo requerido</span>}
                  </div>
                </div>
              </div>

              <input type="file" id="imagen_producto" accept="image/*" style={{ display: 'none' }} ref={imagenInputRef} onChange={handleImagenChange} />

              <div className="form-actions">
                <button type="button" id="btn-guardar" className="btn btn-primary" disabled={validacion.disabled || loading || bloqueado} onClick={handleGuardar}>
                  <i className="fas fa-save"></i> {modo === 'edit' ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>

          {/* ── COLUMNA DERECHA: Panel lateral ── */}
          <aside className="side-panel">

            {/* Vista previa imagen */}
            <div className="side-card">
              <h3 className="side-card-title"><i className="fas fa-image"></i> Imagen del Producto</h3>
              <div id="image-preview" className="image-preview" style={{ display: imagen.preview ? 'block' : 'none' }}>
                <div className="image-container">
                  <img id="preview-image" src={imagen.preview || '#'} alt="Vista previa" loading="lazy" width={200} height={200}
                    style={{ display: imagen.preview ? 'block' : 'none' }} />
                </div>
              </div>
              <div id="file-name" className="file-name">{imagen.nombre}</div>
              <label htmlFor="imagen_producto" className="file-upload-label" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                <i className="fas fa-upload"></i><span>Seleccionar imagen</span>
              </label>
            </div>

            {/* QR */}
            <div className="qr-container">
              <h2><i className="fas fa-qrcode"></i> Código QR del Producto</h2>
              <button type="button" className="qr-toggle-btn" aria-expanded={qrOpen} onClick={() => setQrOpen(o => !o)}>
                <i className="fas fa-qrcode"></i>
                <span>{qrOpen ? 'Ocultar código QR' : 'Ver código QR'}</span>
                <i className={`fas ${qrOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </button>
              <div className={`qr-collapsible ${qrOpen ? 'open' : ''}`}>
                <div className="qr-content">
                  <div className="qr-info">
                    <h3><i className="fas fa-info-circle"></i> Información del Producto</h3>
                    <div className="qr-info-item"><i className="fas fa-barcode"></i><span>ID:</span> <span>{qr.id}</span></div>
                    <div className="qr-info-item"><i className="fas fa-tag"></i><span>Nombre:</span> <span>{qr.nombre}</span></div>
                  </div>
                  <div className="qr-code">
                    {!qr.url && <div className="qr-placeholder"><i className="fas fa-qrcode"></i><p>Genera un código QR</p></div>}
                    {qr.url && <img src={qr.url} alt="Código QR del producto" loading="lazy" width={200} height={200} />}
                    <button className="btn btn-download" disabled={!qr.url}
                      onClick={() => { if (!qr.url) return; const a = document.createElement('a'); a.href = qr.url; a.download = `QR_${qr.id}_${qr.nombre.replace(/\s+/g,'_')}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a) }}>
                      <i className="fas fa-download"></i> Descargar QR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal imagen completa */}
      {imageModal.open && (
        <div id="imageModal" className="modal" onClick={e => { if (e.target === e.currentTarget) setImageModal(m => ({ ...m, open: false })) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Imagen: {imageModal.nombre}</h3>
              <button type="button" className="close-modal" onClick={() => setImageModal(m => ({ ...m, open: false }))}>&times;</button>
            </div>
            <div className="modal-body">
              <img src={imageModal.src} alt="Imagen del producto" style={{ maxWidth: '100%', height: 'auto' }} />
              <div className="modal-info">
                <p><strong>Producto:</strong> <span>{imageModal.nombre}</span></p>
                <p><strong>ID:</strong> <span>{imageModal.id}</span></p>
                <p><strong>Categoría:</strong> <span>{imageModal.categoria}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>"Nada Humano Me Es Ajeno"</p>
        <p className="footer-copy">Sistema de Gestión UACM © 2026</p>
      </footer>
    </>
  )
}
