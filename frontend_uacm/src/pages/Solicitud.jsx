import { useState, useEffect } from 'react'
import { useDatos } from '../hooks/useDatos'
import { useSolicitud } from '../hooks/useSolicitud'
import { useQr } from '../hooks/useQr'
import { useNuevoProducto } from '../hooks/useNuevoProducto'
import { useRecepcion } from '../hooks/useRecepcion'
import { useLimites } from '../hooks/useLimites'

const statusMap = {
  ok:       { cls: 'personal-ok',      html: '<i class="fas fa-check-circle"></i> Personal encontrado' },
  error:    { cls: 'personal-error',   html: '<i class="fas fa-times-circle"></i> No encontrado en el sistema' },
  cargando: { cls: 'personal-loading', html: '<i class="fas fa-spinner fa-spin"></i> Verificando...' },
}

const clsMap = {
  SOLICITADA:      'status-solicitado',
  APROBADA:        'status-aprobado',
  CANCELADA:       'status-cancelado',
  ENTREGA_PARCIAL: 'status-parcial',
  COMPLETADA:      'status-completada',
}

export default function Solicitud() {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { datos, setDatos, alertasStock, campanaVisible, setCampanaVisible, modalAlertas, setModalAlertas, handleDejarPendiente } = useDatos()

  const {
    form, setForm, productos, setProductos, prodSel, setProdSel,
    solicitudActual, setSolicitudActual, buscarId, setBuscarId,
    checkedItems, personalValido, personalStatus,
    solicitanteEsEncargado, almacenesFiltrados, productosFiltrados, accionable,
    rolCallbackRef, almacenCallbackRef, productoCallbackRef,
    handleAgregarProducto, handleEnviar, handleNuevaSolicitud,
    handleCancelar, handleAprobar, handleCheck,
    handleGenerarDesdeAlertas, handleBuscarSolicitud, handleExportar,
    procesarQRPersonal, handleMatriculaBlur, handleMatriculaChange,
  } = useSolicitud({ datos, alertasStock, setModalAlertas, setCampanaVisible })

  const { qrModo, setQrModo, qrInput, setQrInput, qrInputRef, handleQrEnter } = useQr({ datos, setProdSel, procesarQRPersonal })

  const { modalNuevoProd, setModalNuevoProd, catalogosModal, formNuevoProd, setFormNuevoProd, abrirModalNuevoProd, handleGuardarNuevoProd } = useNuevoProducto({ setDatos, setProdSel })

  const { modalRecepcion, setModalRecepcion, recepcionItems, setRecepcionItems, abrirModalRecepcion, handleConfirmarRecepcion } = useRecepcion({ solicitudActual, setSolicitudActual })

  const { modalLimites, setModalLimites, limites, formLimite, setFormLimite, limiteProdRef, limitePeriRef, abrirModalLimites, handleGuardarLimite, handleEliminarLimite } = useLimites({ datos })

  useEffect(() => {
    if (!dropdownOpen) return
    const h = e => { if (!e.target.closest('#userProfile')) setDropdownOpen(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [dropdownOpen])

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {datos.user_role?.toLowerCase().includes('encargado') && (
              <button
                type="button"
                onClick={abrirModalLimites}
                style={{
                  background: 'none', border: '1px solid #640404', color: '#640404',
                  cursor: 'pointer', fontSize: '0.8rem', padding: '4px 10px',
                  borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
                title="Gestionar límites de solicitud"
              >
                <i className="fas fa-sliders-h"></i> Límites
              </button>
            )}
            {campanaVisible && (
              <button
                type="button"
                onClick={() => setModalAlertas(o => !o)}
                style={{
                  position: 'relative', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '1.3rem', color: '#C9A84C', padding: '4px 8px',
                }}
                title={`${alertasStock.length} producto(s) con stock bajo`}
              >
                <i className="fas fa-bell"></i>
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#dc3545', color: '#fff',
                  borderRadius: '50%', fontSize: '0.6rem',
                  width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {alertasStock.length}
                </span>
              </button>
            )}
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
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">

          {/* Buscar solicitud */}
          <section className="card buscar-section">
            <h3><i className="fas fa-search"></i> Buscar Solicitud</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>ID de la solicitud</label>
                <input type="text" inputMode="numeric" placeholder="Ej. 1024" value={buscarId}
                  onChange={e => { if (/^\d*$/.test(e.target.value)) setBuscarId(e.target.value) }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.75rem', borderBottom: '2px solid rgba(100,4,4,.12)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, border: 'none', padding: 0 }}><i className="fas fa-file-alt"></i> Nueva Solicitud</h3>
              {solicitudActual && (
                <button
                  type="button"
                  onClick={handleNuevaSolicitud}
                  style={{
                    background: 'none', border: '1px solid #640404',
                    color: '#640404', cursor: 'pointer', fontSize: '0.8rem',
                    padding: '3px 10px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                  title="Limpiar formulario y crear nueva solicitud"
                >
                  <i className="fas fa-plus"></i> Nueva
                </button>
              )}
            </div>
            <div className="two-col-layout">

              {/* ── Columna izquierda: Datos del solicitante ── */}
              <div className="col-solicitante">
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-id-card"></i> Matrícula</label>
                    <input type="text" placeholder="Ej. 2024001" autoComplete="off"
                      value={form.matricula}
                      readOnly={!!solicitudActual}
                      onChange={e => handleMatriculaChange(e.target.value)}
                      onBlur={() => handleMatriculaBlur(form.matricula)} />
                    {personalStatus && (
                      <span className={`personal-status ${statusMap[personalStatus]?.cls}`}
                        dangerouslySetInnerHTML={{ __html: statusMap[personalStatus]?.html }} />
                    )}
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Nombre</label>
                    <input type="text" placeholder="Nombre completo" value={form.nombre}
                      readOnly={!!solicitudActual || !!form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-briefcase"></i> Cargo</label>
                    <select ref={rolCallbackRef} disabled={!!solicitudActual || !!form.id_rol}>
                      <option value="">Seleccione un cargo</option>
                      {datos.roles?.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-warehouse"></i> Almacén destino</label>
                    <select ref={almacenCallbackRef} disabled={!!solicitudActual}>
                      <option value="">Seleccione un almacén</option>
                      {almacenesFiltrados.map(a => <option key={a.id_almacen} value={a.id_almacen}>{a.tipo_almacen}</option>)}
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
                      <button type="button" className="btn-icon btn-icon-qr" title="Escanear QR" onClick={() => setQrModo('scan')}>
                        <i className="fas fa-qrcode"></i>
                      </button>
                      <button type="button" className="btn-icon btn-icon-new" title="Registrar nuevo producto" onClick={abrirModalNuevoProd}>
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <div className="form-grid product-selector">
                      <div className="form-group">
                        <label><i className="fas fa-box"></i> Producto</label>
                        <select ref={productoCallbackRef}>
                          <option value="">Seleccione un producto</option>
                          {productosFiltrados.map(p => (
                            <option key={p.id_producto} value={p.id_producto} data-status={p.nombre_estatus || ''}>
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
                        {accionable && <th title="Verificado"><i className="fas fa-check-double"></i></th>}
                        {!solicitudActual && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(p => {
                        const checked = checkedItems.has(p.id_producto)
                        return (
                          <tr key={p.id_producto} style={checked ? { background: '#f0faf0' } : {}}>
                            <td>{p.id_producto}</td>
                            <td>{p.nombre || p.nombre_producto}</td>
                            <td>
                              {!solicitudActual ? (
                                <div className="qty-control">
                                  <button type="button" className="btn-qty"
                                    onClick={() => setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))}>
                                    −
                                  </button>
                                  <span>{p.cantidad}</span>
                                  <button type="button" className="btn-qty"
                                    onClick={() => setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad: x.cantidad + 1 } : x))}>
                                    +
                                  </button>
                                </div>
                              ) : p.cantidad}
                            </td>
                            {accionable && (
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox" checked={checked}
                                  onChange={() => handleCheck(p.id_producto)}
                                  style={{ width: '18px', height: '18px', accentColor: '#28a745', cursor: 'pointer' }}
                                />
                              </td>
                            )}
                            {!solicitudActual && (
                              <td>
                                <button type="button" className="btn-remove"
                                  onClick={() => setProductos(prev => prev.filter(x => x.id_producto !== p.id_producto))}>
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
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
                        <button type="button" className="btn-export" onClick={handleExportar}>
                          <i className="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                        {accionable && (
                          <button className="btn btn-danger" onClick={handleCancelar}>
                            <i className="fas fa-times-circle"></i> Cancelar
                          </button>
                        )}
                        {solicitudActual?.estatus === 'APROBADA' && (
                          <button type="button" className="btn btn-primary" onClick={abrirModalRecepcion}>
                            <i className="fas fa-clipboard-check"></i> Registrar recepción
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

      {/* Modal Nuevo Producto */}
      {modalNuevoProd && (
        <div className="qr-overlay" style={{ display: 'flex', alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="qr-box" style={{ maxWidth: '540px', width: '100%', textAlign: 'left', alignItems: 'stretch', margin: 'auto' }}>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.75rem', borderBottom: '2px solid rgba(100,4,4,.12)', color: '#1a1a1a' }}>
              <i className="fas fa-plus-circle" style={{ color: '#640404' }}></i> Registrar Nuevo Producto
            </h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" placeholder="Nombre del producto" value={formNuevoProd.nombre}
                  onChange={e => setFormNuevoProd(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input type="text" placeholder="Descripción opcional" value={formNuevoProd.descripcion}
                  onChange={e => setFormNuevoProd(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Categoría *</label>
                <select value={formNuevoProd.id_categoria}
                  onChange={e => setFormNuevoProd(f => ({ ...f, id_categoria: e.target.value }))}>
                  <option value="">Seleccione...</option>
                  {catalogosModal?.categorias_list?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Unidad *</label>
                <select value={formNuevoProd.id_unidad}
                  onChange={e => setFormNuevoProd(f => ({ ...f, id_unidad: e.target.value }))}>
                  <option value="">Seleccione...</option>
                  {catalogosModal?.unidades_list?.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Stock mínimo</label>
                <input type="number" min={0} value={formNuevoProd.stock_minimo}
                  onChange={e => setFormNuevoProd(f => ({ ...f, stock_minimo: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalNuevoProd(false)}>
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleGuardarNuevoProd}>
                <i className="fas fa-save"></i> Guardar producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal alertas de stock bajo */}
      {modalAlertas && (
        <div className="qr-overlay" style={{ display: 'flex', alignItems: 'center', padding: '2rem 1rem' }}>
          <div className="qr-box" style={{ maxWidth: '620px', width: '100%', textAlign: 'left', alignItems: 'stretch', margin: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.75rem', borderBottom: '2px solid rgba(220,53,69,.2)', color: '#dc3545', flexShrink: 0 }}>
              <i className="fas fa-exclamation-triangle"></i> Productos con stock bajo
              <span style={{ marginLeft: 'auto', background: '#dc3545', color: '#fff', borderRadius: '999px', fontSize: '0.75rem', padding: '2px 10px', fontWeight: 700 }}>
                {alertasStock.length} producto{alertasStock.length !== 1 ? 's' : ''}
              </span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem', flexShrink: 0 }}>
              Los siguientes productos activos están por debajo de su stock mínimo:
            </p>
            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1rem', border: '1px solid #e5e5e5', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#6B0F1A', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Producto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actual</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Mínimo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasStock.map((a, i) => (
                    <tr key={a.id_producto} style={{ background: i % 2 === 0 ? '#fff' : '#fdf3f3' }}>
                      <td style={{ padding: '7px 12px' }}>{a.nombre_producto}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#dc3545', fontWeight: 700 }}>{a.cantidad}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>{a.stock_minimo}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>+{a.faltante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={handleDejarPendiente}>
                <i className="fas fa-bell"></i> Dejar pendiente
              </button>
              <button type="button" className="btn btn-primary" onClick={handleGenerarDesdeAlertas}>
                <i className="fas fa-file-alt"></i> Generar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Recepción */}
      {modalRecepcion && (
        <div className="qr-overlay" style={{ display: 'flex', alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="qr-box" style={{ maxWidth: '580px', width: '100%', textAlign: 'left', alignItems: 'stretch', margin: 'auto' }}>
            <h4 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.75rem', borderBottom: '2px solid rgba(100,4,4,.12)', color: '#1a1a1a' }}>
              <i className="fas fa-clipboard-check" style={{ color: '#640404' }}></i> Registrar Recepción
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
              Indica la cantidad que realmente se recibió de cada producto. Si es menor a lo solicitado se registrará como entrega parcial.
            </p>
            <div style={{ overflowY: 'auto', maxHeight: '50vh', border: '1px solid #e5e5e5', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#6B0F1A', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Producto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Solicitado</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {recepcionItems.map((p, i) => (
                    <tr key={p.id_producto} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '7px 12px' }}>{p.nombre}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#555' }}>{p.cantidad}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <input
                          type="number" min={0} max={p.cantidad}
                          value={p.cantidad_recibida}
                          onChange={e => {
                            const val = Math.min(p.cantidad, Math.max(0, parseInt(e.target.value) || 0))
                            setRecepcionItems(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, cantidad_recibida: val } : x))
                          }}
                          style={{ width: '70px', textAlign: 'center', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalRecepcion(false)}>
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmarRecepcion}>
                <i className="fas fa-check"></i> Confirmar recepción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Overlay */}
      {qrModo && (
        <div className="qr-overlay" style={{ display: 'flex' }}>
          <div className="qr-box">
            <i className="fas fa-qrcode qr-icon"></i>
            <p>Apunte el lector al código QR</p>
            <input type="text" ref={qrInputRef} autoComplete="off" placeholder="Esperando escaneo..."
              value={qrInput} onChange={e => setQrInput(e.target.value)} onKeyDown={handleQrEnter} />
            <button type="button" className="btn btn-secondary"
              onClick={() => { setQrModo(null); setQrInput('') }}>
              <i className="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal Gestión de Límites */}
      {modalLimites && (
        <div className="qr-overlay" style={{ display: 'flex', alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="qr-box" style={{ maxWidth: '640px', width: '100%', textAlign: 'left', alignItems: 'stretch', margin: 'auto' }}>
            <h4 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.75rem', borderBottom: '2px solid rgba(100,4,4,.12)', color: '#1a1a1a' }}>
              <i className="fas fa-sliders-h" style={{ color: '#640404' }}></i> Límites de Solicitud por Producto
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 140px auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Producto</label>
                <select ref={limiteProdRef}>
                  <option value="">Seleccione...</option>
                  {datos.productos?.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Máximo</label>
                <input type="number" min={1} value={formLimite.cantidad_maxima}
                  onChange={e => setFormLimite(f => ({ ...f, cantidad_maxima: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Periodo</label>
                <select ref={limitePeriRef}>
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleGuardarLimite}>
                <i className="fas fa-save"></i> Guardar
              </button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '45vh', border: '1px solid #e5e5e5', borderRadius: '6px', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                <thead>
                  <tr style={{ background: '#6B0F1A', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Producto</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Máximo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Periodo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {limites.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Sin límites configurados</td></tr>
                  )}
                  {limites.map((l, i) => (
                    <tr key={l.id_limite} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '7px 12px' }}>{l.nombre_producto}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{l.cantidad_maxima}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', textTransform: 'capitalize' }}>{l.periodo}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <button type="button" className="btn-remove" onClick={() => handleEliminarLimite(l.id_limite)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalLimites(false)}>
                <i className="fas fa-times"></i> Cerrar
              </button>
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
