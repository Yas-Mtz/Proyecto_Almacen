import { useState, useEffect } from 'react'

function getCookie(name) {
  let value = null
  if (document.cookie)
    document.cookie.split(';').forEach(c => {
      const t = c.trim()
      if (t.startsWith(name + '=')) value = decodeURIComponent(t.substring(name.length + 1))
    })
  return value
}

export default function Reportes() {
  const [datos, setDatos]                 = useState(null)
  const [form, setForm]                   = useState({ fecha_inicio: '', fecha_fin: '', formato: 'PDF' })
  const [resultados, setResultados]       = useState([])
  const [inventario, setInventario]       = useState([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [mostrarInventario, setMostrarInventario] = useState(false)
  const [loadingReporte, setLoadingReporte]       = useState(false)
  const [loadingInventario, setLoadingInventario] = useState(false)
  const [dropdownOpen, setDropdownOpen]   = useState(false)

  // ── Cargar info de usuario ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/Reportes/datos/')
      .then(r => r.json())
      .then(setDatos)
      .catch(() => setDatos({ persona_nombre: 'Usuario', user_role: 'Usuario' }))
  }, [])

  // ── Cerrar dropdown al hacer click fuera ──────────────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return
    const h = e => { if (!e.target.closest('#userProfile')) setDropdownOpen(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [dropdownOpen])

  // ── Generar reporte de solicitudes ────────────────────────────────────────
  const handleGenerarReporte = async (e) => {
    e.preventDefault()
    if (!form.fecha_inicio || !form.fecha_fin) {
      window.Swal.fire({ icon: 'warning', title: 'Fechas requeridas', text: 'Selecciona ambas fechas.' }); return
    }
    if (form.fecha_inicio > form.fecha_fin) {
      window.Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha de inicio no puede ser mayor que la fecha de fin.' }); return
    }

    setLoadingReporte(true)
    try {
      const fd = new FormData()
      fd.append('fecha_inicio', form.fecha_inicio)
      fd.append('fecha_fin',    form.fecha_fin)
      fd.append('formato',      form.formato)

      const res  = await fetch('/Reportes/reporte_solicitudes/', {
        method:  'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body:    fd,
      })
      const data = await res.json()

      if (data.url) {
        const a = document.createElement('a')
        a.href = data.url; a.download = 'reporte'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        return
      }

      const filas = data.productos || data.datos || []
      if (filas.length === 0) {
        window.Swal.fire({ icon: 'info', title: 'Sin resultados', text: 'No se encontraron resultados para ese período.' }); return
      }
      setResultados(filas)
      setMostrarResultados(true)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al generar el reporte.' })
    } finally {
      setLoadingReporte(false)
    }
  }

  // ── Cargar inventario general ──────────────────────────────────────────────
  const handleVerInventario = async () => {
    setLoadingInventario(true)
    try {
      const res  = await fetch('/Reportes/inventario/')
      const data = await res.json()

      if (!data.articulos || data.articulos.length === 0) {
        window.Swal.fire({ icon: 'info', title: 'Sin artículos', text: 'No hay artículos en inventario.' }); return
      }
      setInventario(data.articulos)
      setMostrarInventario(true)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al cargar el inventario.' })
    } finally {
      setLoadingInventario(false)
    }
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
              <h1>Reportes</h1>
              <p className="header-subtitle">Solicitudes e Inventarios</p>
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

          {/* Reporte de solicitudes */}
          <section className="card">
            <h3>Reporte de Solicitudes</h3>
            <form onSubmit={handleGenerarReporte}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Fecha fin</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Formato</label>
                  <select value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}>
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loadingReporte}>
                  <i className="fas fa-chart-bar"></i> {loadingReporte ? 'Generando...' : 'Generar reporte'}
                </button>
              </div>
            </form>

            {mostrarResultados && (
              <div id="resultados-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Almacén</th>
                      <th>Artículo</th>
                      <th>Cantidad</th>
                      <th>Solicitante</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((item, i) => (
                      <tr key={i}>
                        <td>{item.id_solicitud   || '-'}</td>
                        <td>{item.almacen_direccion || '-'}</td>
                        <td>{item.nom_articulo    || '-'}</td>
                        <td>{item.cantidad        || '-'}</td>
                        <td>{item.nombre_persona  || '-'}</td>
                        <td>{item.fecha_sol       || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Inventario general */}
          <section className="card">
            <h3>Inventario General</h3>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={handleVerInventario} disabled={loadingInventario}>
                <i className="fas fa-boxes"></i> {loadingInventario ? 'Cargando...' : 'Ver inventario'}
              </button>
            </div>

            {mostrarInventario && (
              <div id="inventario-container">
                <table>
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map((item, i) => (
                      <tr key={i}>
                        <td>{item.nom_articulo  || '-'}</td>
                        <td>{item.desc_articulo || '-'}</td>
                        <td>{item.cantidad      || '-'}</td>
                        <td>{item.nomb_estatus  || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>

      <footer className="footer">
        <p>"Nada Humano Me Es Ajeno"</p>
        <p className="footer-copy">Sistema de Gestión UACM © 2026</p>
      </footer>
    </>
  )
}
