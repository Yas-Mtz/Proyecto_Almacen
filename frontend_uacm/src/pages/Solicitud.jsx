import { useState, useEffect, useRef, useCallback } from 'react'

function getCookie(name) {
  let value = null
  if (document.cookie)
    document.cookie.split(';').forEach(c => {
      const t = c.trim()
      if (t.startsWith(name + '=')) value = decodeURIComponent(t.substring(name.length + 1))
    })
  return value
}

const APP_URLS = {
  crear_solicitud:    '/Solicitudes/crear/',
  buscar_personal_qr: '/Solicitudes/buscar-personal/',
  cancelar_solicitud: '/Solicitudes/cancelar/',
  aprobar_solicitud:  '/Solicitudes/aprobar/',
  buscar_solicitud:   '/Solicitudes/buscar/',
  exportar_pdf:       '/Solicitudes/exportar/pdf/',
  exportar_csv:       '/Solicitudes/exportar/csv/',
}

const statusMap = {
  ok:       { cls: 'personal-ok',      html: '<i class="fas fa-check-circle"></i> Personal encontrado' },
  error:    { cls: 'personal-error',   html: '<i class="fas fa-times-circle"></i> No encontrado en el sistema' },
  cargando: { cls: 'personal-loading', html: '<i class="fas fa-spinner fa-spin"></i> Verificando...' },
}

const clsMap = {
  SOLICITADA: 'status-solicitado',
  APROBADA:   'status-aprobado',
  CANCELADA:  'status-cancelado',
  COMPLETADA: 'status-completado',
}

export default function Solicitud() {
  const [datos, setDatos]                     = useState(null)
  const [form, setForm]                       = useState({ matricula: '', nombre: '', id_rol: '', id_almacen: '', observaciones: '' })
  const [productos, setProductos]             = useState([])
  const [prodSel, setProdSel]                 = useState({ id_producto: '', cantidad: 1 })
  const [solicitudActual, setSolicitudActual] = useState(null)
  const [personalValido, setPersonalValido]   = useState(false)
  const [personalStatus, setPersonalStatus]   = useState(null)
  const [qrModo, setQrModo]                   = useState(null)
  const [qrInput, setQrInput]                 = useState('')
  const [buscarId, setBuscarId]               = useState('')
  const [exportOpen, setExportOpen]           = useState(false)
  const [exportFormato, setExportFormato]     = useState('pdf')
  const [dropdownOpen, setDropdownOpen]       = useState(false)

  const qrInputRef  = useRef(null)
  const rolRef      = useRef(null)
  const almacenRef  = useRef(null)
  const productoRef = useRef(null)

  // ── Callback refs: Select2 se inicializa en el mismo commit que el elemento ──
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
    window.$(el).select2({ placeholder: 'Seleccione un producto', width: '100%' })
      .on('change.select2', e => setProdSel(s => ({ ...s, id_producto: e.target.value })))
  }, [])

  // ── Cargar catálogos ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/Solicitudes/datos/')
      .then(r => r.json())
      .then(d => {
        setDatos(d)
        if (!d.es_encargado) {
          setForm(f => ({
            ...f,
            matricula: String(d.persona_id || ''),
            nombre:    d.persona_nombre_completo || '',
            id_rol:    String(d.persona_id_rol || ''),
          }))
          setPersonalValido(true)
          setPersonalStatus('ok')
        }
      })
      .catch(() => setDatos({}))
  }, [])

  // ── Foco en input QR al abrir overlay ─────────────────────────────────────
  useEffect(() => {
    if (qrModo && qrInputRef.current) {
      setTimeout(() => qrInputRef.current?.focus(), 100)
    }
  }, [qrModo])

  // ── Cerrar dropdown al hacer click fuera ──────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return
    const h = e => { if (!e.target.closest('#userProfile')) setDropdownOpen(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [dropdownOpen])

  // ── Cerrar export al hacer click fuera ────────────────────────────────────
  useEffect(() => {
    if (!exportOpen) return
    const h = () => setExportOpen(false)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [exportOpen])

  // ── Sincronizar React → Select2 (después de que callback ref inicializó) ───
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

  const esEncargado = datos?.es_encargado
  const accionable  = solicitudActual?.estatus === 'SOLICITADA'

  // ── Agregar producto a tabla ───────────────────────────────────────────────
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

  // ── Enviar solicitud ───────────────────────────────────────────────────────
  const handleEnviar = async () => {
    if (solicitudActual) return
    if (!form.matricula.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa la matrícula del solicitante.' }); return
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

    const data = {
      id_almacen:              form.id_almacen,
      id_personal:             form.matricula.trim(),
      observaciones_solicitud: form.observaciones.trim(),
      productos: productos.map(p => ({ id_producto: p.id_producto, cantidad: p.cantidad })),
    }

    try {
      const res = await fetch(APP_URLS.crear_solicitud, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body:    JSON.stringify(data),
      })
      const rawText = await res.text()
      let result
      try { result = JSON.parse(rawText) } catch { throw new Error('Respuesta inválida del servidor: ' + rawText) }

      if (res.ok) {
        setSolicitudActual(result.solicitud)
        setProductos(result.solicitud.productos)
        window.Swal.fire({ icon: 'success', title: 'Solicitud creada', text: 'Solicitud registrada correctamente.', timer: 2000, showConfirmButton: false })
      } else {
        throw new Error(result.message || result.error || rawText)
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  // ── Cancelar solicitud ─────────────────────────────────────────────────────
  const handleCancelar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Cancelar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No', confirmButtonColor: '#dc3545',
    })
    if (!conf.isConfirmed) return

    try {
      const res = await fetch(`${APP_URLS.cancelar_solicitud}${solicitudActual.id_solicitud}/`, {
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

  // ── Aprobar solicitud ──────────────────────────────────────────────────────
  const handleAprobar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Aprobar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'No', confirmButtonColor: '#28a745',
    })
    if (!conf.isConfirmed) return

    try {
      const res = await fetch(`${APP_URLS.aprobar_solicitud}${solicitudActual.id_solicitud}/`, {
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

  // ── QR Personal ────────────────────────────────────────────────────────────
  const procesarQRPersonal = async (qrData) => {
    try {
      const res  = await fetch(`${APP_URLS.buscar_personal_qr}?qr_data=${encodeURIComponent(qrData)}`, {
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const data = await res.json()
      if (!res.ok) {
        window.Swal.fire({ icon: 'error', title: 'No encontrado', text: data.error || 'No se encontró el personal.' }); return
      }
      setForm(f => ({ ...f, matricula: String(data.matricula), nombre: data.nombre, id_rol: String(data.id_rol) }))
      setPersonalValido(true)
      setPersonalStatus('ok')
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al leer el QR de personal.' })
    }
  }

  // ── QR Producto ────────────────────────────────────────────────────────────
  const procesarQRProducto = (qrData) => {
    const partes = qrData.split(' - ')
    if (partes.length < 2) {
      window.Swal.fire({ icon: 'warning', title: 'QR no reconocido', text: 'Formato de QR de producto no reconocido.' }); return
    }
    const idProducto = partes[0].trim()
    const existe = datos?.productos?.find(p => String(p.id_producto) === idProducto)
    if (!existe) {
      window.Swal.fire({ icon: 'warning', title: 'No encontrado', text: `Producto con ID ${idProducto} no encontrado en la lista.` }); return
    }
    setProdSel(s => ({ ...s, id_producto: idProducto }))
  }

  // ── Enter en input QR ──────────────────────────────────────────────────────
  const handleQrEnter = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const contenido = qrInput.trim()
    const modo = qrModo
    setQrModo(null)
    setQrInput('')
    if (!contenido) return
    if (modo === 'personal')      await procesarQRPersonal(contenido)
    else if (modo === 'producto') procesarQRProducto(contenido)
  }

  // ── Validar personal en blur (solo encargado) ──────────────────────────────
  const handleMatriculaBlur = async () => {
    if (!esEncargado) return
    const valor = form.matricula.trim()
    if (!valor) { setPersonalStatus(null); return }
    setPersonalStatus('cargando')
    try {
      const res  = await fetch(`${APP_URLS.buscar_personal_qr}?qr_data=${encodeURIComponent(valor)}`)
      const data = await res.json()
      if (res.ok) {
        setForm(f => ({ ...f, nombre: data.nombre, id_rol: String(data.id_rol) }))
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

  // ── Buscar solicitud por ID ────────────────────────────────────────────────
  const handleBuscarSolicitud = async () => {
    if (!buscarId.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el ID de la solicitud.' }); return
    }
    try {
      const res  = await fetch(`${APP_URLS.buscar_solicitud}${buscarId}/`)
      const data = await res.json()
      if (!res.ok) {
        window.Swal.fire({ icon: 'info', title: 'No encontrada', text: data.error || 'Solicitud no encontrada.' }); return
      }
      const sol = data.solicitud
      setForm({
        matricula:    String(sol.matricula || ''),
        nombre:       sol.solicitante || '',
        id_rol:       String(sol.id_rol || ''),
        id_almacen:   String(sol.id_almacen || ''),
        observaciones: '',
      })
      setProductos(sol.productos)
      setPersonalValido(true)
      setSolicitudActual(sol)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al buscar la solicitud.' })
    }
  }

  // ── Exportar ───────────────────────────────────────────────────────────────
  const handleExportar = () => {
    if (!solicitudActual) return
    if (exportFormato === 'pdf') window.open(`${APP_URLS.exportar_pdf}${solicitudActual.id_solicitud}/`)
    if (exportFormato === 'csv') window.open(`${APP_URLS.exportar_csv}${solicitudActual.id_solicitud}/`)
    setExportOpen(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!datos) return <p style={{ padding: '2rem' }}>Cargando...</p>

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/static/media/logouacm.jpg" alt="UACM" className="header-logo" />
            <a href="/home/" className="home-button" aria-label="Inicio"><i className="fas fa-home"></i></a>
            <div className="header-title">
              <h1>Solicitud de Artículos</h1>
              <p className="header-subtitle">Registro, consulta y control de solicitudes</p>
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

      <main className="main-content">
        <div className="content-wrapper">

          {/* Buscar solicitud */}
          <section className="card">
            <h3><i className="fas fa-search"></i> Buscar Solicitud</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>ID de la solicitud</label>
                <input type="number" placeholder="Ej. 1024" value={buscarId}
                  onChange={e => setBuscarId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBuscarSolicitud()} />
              </div>
              <div className="form-actions-inline">
                <button type="button" className="btn btn-primary" onClick={handleBuscarSolicitud}>
                  <i className="fas fa-search"></i> Buscar
                </button>
              </div>
            </div>
          </section>

          {/* Nueva solicitud */}
          <section className="card" id="nueva-solicitud-container">
            <h3><i className="fas fa-file-alt"></i> Nueva Solicitud</h3>
            <div className="two-col-layout">

              {/* ── Columna izquierda: Datos del solicitante ── */}
              <div className="col-solicitante">

                {esEncargado && !solicitudActual && (
                  <div className="qr-scan-row">
                    <button type="button" className="btn btn-qr" onClick={() => setQrModo('personal')}>
                      <i className="fas fa-qrcode"></i> Escanear QR de Personal
                    </button>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-id-card"></i> Matrícula</label>
                    <input type="text" placeholder="Ej. 2024001" autoComplete="off"
                      value={form.matricula}
                      readOnly={!esEncargado || !!solicitudActual}
                      onChange={e => {
                        setForm(f => ({ ...f, matricula: e.target.value, nombre: '', id_rol: '' }))
                        setPersonalValido(false)
                        setPersonalStatus(null)
                      }}
                      onBlur={handleMatriculaBlur} />
                    {personalStatus && (
                      <span className={`personal-status ${statusMap[personalStatus]?.cls}`}
                        dangerouslySetInnerHTML={{ __html: statusMap[personalStatus]?.html }} />
                    )}
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Nombre</label>
                    <input type="text" placeholder="Nombre completo" value={form.nombre}
                      readOnly={!!solicitudActual || (!esEncargado) || !!form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-briefcase"></i> Cargo</label>
                    <select ref={rolCallbackRef}
                      disabled={!!solicitudActual || !esEncargado || !!form.id_rol}>
                      <option value="">Seleccione un cargo</option>
                      {datos.roles?.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-warehouse"></i> Almacén destino</label>
                    <select ref={almacenCallbackRef} disabled={!!solicitudActual}>
                      <option value="">Seleccione un almacén</option>
                      {datos.almacenes?.map(a => <option key={a.id_almacen} value={a.id_almacen}>{a.tipo_almacen}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-calendar-alt"></i> Fecha</label>
                    <input type="text" readOnly value={new Date().toLocaleString('es-MX', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })} />
                  </div>
                </div>

                <div className="form-group obs-group">
                  <label><i className="fas fa-sticky-note"></i> Observaciones</label>
                  <textarea rows={3} placeholder="Observaciones adicionales..."
                    value={form.observaciones} disabled={!!solicitudActual}
                    onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
                </div>

                {!solicitudActual && (
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={handleEnviar}>
                      <i className="fas fa-paper-plane"></i> Enviar Solicitud
                    </button>
                  </div>
                )}
              </div>

              {/* ── Columna derecha: Productos ── */}
              <div className="col-productos">

                {!solicitudActual && (
                  <div id="panel-crear-productos">
                    <h4 className="subsection-title"><i className="fas fa-boxes"></i> Productos Solicitados</h4>
                    <div className="qr-scan-row">
                      <button type="button" className="btn btn-qr" onClick={() => setQrModo('producto')}>
                        <i className="fas fa-qrcode"></i> Escanear QR de Producto
                      </button>
                    </div>
                    <div className="form-grid product-selector">
                      <div className="form-group">
                        <label><i className="fas fa-box"></i> Producto</label>
                        <select ref={productoCallbackRef}>
                          <option value="">Seleccione un producto</option>
                          {datos.productos?.map(p => (
                            <option key={p.id_producto} value={p.id_producto}>
                              {p.nombre_producto} ({p.cantidad})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-sort-numeric-up"></i> Cantidad</label>
                        <input type="number" min={1} value={prodSel.cantidad}
                          onChange={e => setProdSel(s => ({ ...s, cantidad: e.target.value }))} />
                      </div>
                      <div className="form-group form-group-btn">
                        <button type="button" className="btn btn-add" onClick={handleAgregarProducto}>
                          <i className="fas fa-plus"></i> Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabla de productos */}
                <div className="tabla-scroll-wrapper">
                  <table id="tabla-productos">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        {!solicitudActual && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(p => (
                        <tr key={p.id_producto}>
                          <td>{p.id_producto}</td>
                          <td>{p.nombre || p.nombre_producto}</td>
                          <td>{p.cantidad}</td>
                          {!solicitudActual && (
                            <td>
                              <button type="button" className="btn-remove"
                                onClick={() => setProductos(prev => prev.filter(x => x.id_producto !== p.id_producto))}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Panel de confirmación */}
                {solicitudActual && (
                  <div id="panel-confirmacion">
                    <div className="confirm-id-badge">
                      <span className="confirm-label">
                        <i className="fas fa-check-circle"></i> Solicitud registrada
                      </span>
                      <span className="confirm-id"># <span>{solicitudActual.id_solicitud}</span></span>
                    </div>
                    <div className="confirm-footer">
                      <span className={`status-badge ${clsMap[solicitudActual.estatus] || 'status-solicitado'}`}>
                        {solicitudActual.estatus}
                      </span>
                      <div className="confirm-actions">
                        <div className={`export-wrapper${exportOpen ? ' active' : ''}`}
                          onClick={e => e.stopPropagation()}>
                          <button type="button" className="btn-export"
                            onClick={() => setExportOpen(o => !o)}>
                            <i className="fas fa-download"></i> Exportar
                          </button>
                          <div className="export-options">
                            <label>
                              <input type="radio" name="export-format" value="pdf"
                                checked={exportFormato === 'pdf'} onChange={() => setExportFormato('pdf')} /> PDF
                            </label>
                            <label>
                              <input type="radio" name="export-format" value="csv"
                                checked={exportFormato === 'csv'} onChange={() => setExportFormato('csv')} /> CSV
                            </label>
                            <button className="btn-confirm-export" onClick={handleExportar}>
                              <i className="fas fa-download"></i> Descargar
                            </button>
                          </div>
                        </div>
                        {accionable && esEncargado && (
                          <button className="btn btn-success" onClick={handleAprobar}>
                            <i className="fas fa-check-circle"></i> Aprobar
                          </button>
                        )}
                        {accionable && (
                          <button className="btn btn-danger" onClick={handleCancelar}>
                            <i className="fas fa-times-circle"></i> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>

        </div>
      </main>

      {/* QR Overlay */}
      {qrModo && (
        <div className="qr-overlay" style={{ display: 'flex' }}>
          <div className="qr-box">
            <i className="fas fa-qrcode qr-icon"></i>
            <p>{qrModo === 'personal' ? 'Apunte el lector al QR del personal' : 'Apunte el lector al QR del producto'}</p>
            <input type="text" ref={qrInputRef} autoComplete="off" placeholder="Esperando escaneo..."
              value={qrInput} onChange={e => setQrInput(e.target.value)} onKeyDown={handleQrEnter} />
            <button type="button" className="btn btn-secondary"
              onClick={() => { setQrModo(null); setQrInput('') }}>
              <i className="fas fa-times"></i> Cancelar
            </button>
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
