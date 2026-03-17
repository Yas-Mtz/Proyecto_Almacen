import { useState, useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_INTERVAL = 120000   // 2 minutos
const SESSION_CHECK_INTERVAL = 300000 // 5 minutos

const tarjetas = [
  { titulo: 'Gestión de Productos',  icono: 'fa-boxes',        color: 'blue',   url: '/GestiondeProductos/', stat: 'total_productos',       unidad: 'productos'  },
  { titulo: 'Reportes e Inventario', icono: 'fa-chart-line',   color: 'navy',   url: '/Reportes/',           stat: 'total_solicitudes',     unidad: 'solicitudes'},
  { titulo: 'Solicitud de Artículos',icono: 'fa-shopping-cart',color: 'teal',   url: '/Solicitudes/',        stat: 'solicitudes_pendientes',unidad: 'pendientes' },
  { titulo: 'Gestión de Personal',   icono: 'fa-users',        color: 'violet', url: '#',                    stat: 'total_personal',        unidad: 'miembros'   },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name) {
  let value = null
  if (document.cookie) {
    document.cookie.split(';').forEach(c => {
      const cookie = c.trim()
      if (cookie.startsWith(name + '='))
        value = decodeURIComponent(cookie.substring(name.length + 1))
    })
  }
  return value
}

function getCSRFToken() {
  return getCookie('csrftoken')
}

// ── Componente ────────────────────────────────────────────────────────────────

function Home() {
  const [datos, setDatos]               = useState(null)
  const [saludo, setSaludo]             = useState('Bienvenido')
  const [sessionStatus, setSessionStatus] = useState('active')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [sessionInfo, setSessionInfo]   = useState(null)

  const heartbeatRef    = useRef(null)
  const sessionCheckRef = useRef(null)

  // ── Limpiar intervalos ──────────────────────────────────────────────────────
  const clearIntervals = useCallback(() => {
    if (heartbeatRef.current)    { clearInterval(heartbeatRef.current);    heartbeatRef.current = null }
    if (sessionCheckRef.current) { clearInterval(sessionCheckRef.current); sessionCheckRef.current = null }
  }, [])

  // ── Alerta sesión expirada ──────────────────────────────────────────────────
  const showSessionExpiredAlert = useCallback((redirectUrl) => {
    window.Swal.fire({
      icon: 'warning',
      title: 'Sesión Expirada',
      text: 'Tu sesión ha expirado. Serás redirigido al login.',
      timer: 5000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: true,
      confirmButtonText: 'Ir al Login',
      confirmButtonColor: '#640404',
    }).then(() => { window.location.href = redirectUrl })
  }, [])

  // ── Heartbeat ───────────────────────────────────────────────────────────────
  const performHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/login/ping-session/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) { setSessionStatus('warning'); return }
      const data = await res.json()
      if (data.redirect)              { clearIntervals(); showSessionExpiredAlert(data.redirect) }
      else if (data.status === 'success') setSessionStatus('active')
      else                                setSessionStatus('warning')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Verificar sesión ────────────────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return
      const data = await res.json()
      if (!data.session_active) { clearIntervals(); showSessionExpiredAlert('/login/') }
      else setSessionStatus('active')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Verificación inmediata ──────────────────────────────────────────────────
  const checkSessionImmediately = useCallback(async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return
      const data = await res.json()
      if (!data.session_active) { clearIntervals(); showSessionExpiredAlert('/login/') }
      else setSessionStatus('active')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Mostrar info de sesión en modal ────────────────────────────────────────
  const showSessionInfo = async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const data = await res.json()
      setSessionInfo(data)
      setDropdownOpen(false)
      setModalOpen(true)
    } catch {
      window.Swal.fire({
        icon: 'error', title: 'Error',
        text: 'No se pudo obtener la información de la sesión.',
        confirmButtonText: 'Aceptar', confirmButtonColor: '#640404',
      })
    }
  }

  // ── Próximamente ────────────────────────────────────────────────────────────
  const showComingSoon = (e) => {
    e.preventDefault()
    window.Swal.fire({
      icon: 'info', title: 'Próximamente',
      text: 'Esta funcionalidad estará disponible en futuras actualizaciones.',
      confirmButtonText: 'Entendido', confirmButtonColor: '#640404',
    })
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Saludo dinámico
  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 12)       setSaludo('Buenos días')
    else if (h >= 12 && h < 19) setSaludo('Buenas tardes')
    else                         setSaludo('Buenas noches')
  }, [])

  // Cargar datos del dashboard
  useEffect(() => {
    fetch('/home/stats/')
      .then(r => r.json())
      .then(setDatos)
      .catch(() => setDatos({
        persona_nombre: 'Usuario', user_role: 'Usuario',
        total_productos: 0, total_solicitudes: 0,
        solicitudes_pendientes: 0, total_personal: 0, productos_bajo_stock: 0,
      }))
  }, [])

  // Heartbeat
  useEffect(() => {
    performHeartbeat()
    heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
    return () => clearIntervals()
  }, [performHeartbeat, clearIntervals])

  // Verificación periódica de sesión
  useEffect(() => {
    sessionCheckRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL)
    return () => { if (sessionCheckRef.current) clearInterval(sessionCheckRef.current) }
  }, [checkSession])

  // Visibilidad de página
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL * 2)
        }
      } else {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
          performHeartbeat()
        }
        checkSessionImmediately()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [performHeartbeat, checkSessionImmediately])

  // Limpiar al salir
  useEffect(() => {
    const handleUnload = () => clearIntervals()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [clearIntervals])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (!e.target.closest('#userProfile')) setDropdownOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [dropdownOpen])

  // Cerrar dropdown/modal con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setModalOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!datos) return <p style={{ padding: '2rem' }}>Cargando...</p>

  const statusClass = sessionStatus === 'active' ? 'active' : sessionStatus === 'warning' ? 'warning' : 'error'
  const statusColor = sessionStatus === 'active' ? '#28a745' : sessionStatus === 'warning' ? '#ffc107' : '#dc3545'
  const statusTitle = sessionStatus === 'active' ? 'Sesión activa' : sessionStatus === 'warning' ? 'Problemas de conexión' : 'Sesión inválida'

  return (
    <>
      {/* Header */}
      <header>
        <div className="header-content">
          <div className="logo-section">
            <img src="/static/media/logouacm.jpg" alt="Logo UACM" className="header-logo" />
            <div className="header-title">
              <h1>Sistema de Inventario</h1>
              <p className="header-subtitle">Universidad Autónoma de la Ciudad de México</p>
            </div>
          </div>

          <div className={`user-profile${dropdownOpen ? ' active' : ''}`} id="userProfile" onClick={() => setDropdownOpen(o => !o)}>
            <div className="user-info">
              <span className="user-name">{datos.persona_nombre}</span>
              <span className="user-role">{datos.user_role}</span>
            </div>
            <div className="user-avatar">
              <i className="fas fa-user"></i>
            </div>
            <span className={`session-status ${statusClass}`} title={statusTitle}>
              <i className="fas fa-circle" style={{ color: statusColor }}></i>
            </span>

            <div className="dropdown-menu" id="dropdownMenu">
              <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); showSessionInfo() }} className="dropdown-item">
                <i className="fas fa-info-circle"></i>
                <span>Estado de Sesión</span>
              </a>
              <a href="/login/logout/" className="dropdown-item logout">
                <i className="fas fa-sign-out-alt"></i>
                <span>Cerrar Sesión</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main>
        <div className="container">

          {/* Bienvenida */}
          <div className="welcome-section">
            <span className="greeting-badge">{saludo}</span>
            <h2 className="welcome-title">{datos.persona_nombre}</h2>
            <span className="role-badge">{datos.user_role}</span>
          </div>

          {/* Alerta stock bajo */}
          {datos.productos_bajo_stock > 0 && (
            <div className="alert-banner">
              <i className="fas fa-exclamation-triangle"></i>
              <span>
                <strong>{datos.productos_bajo_stock} producto{datos.productos_bajo_stock !== 1 ? 's' : ''}</strong> requieren reabastecimiento
              </span>
              <a href="/Reportes/" className="alert-link">
                Ver inventario <i className="fas fa-arrow-right"></i>
              </a>
            </div>
          )}

          {/* Tarjetas */}
          <div className="hcards-grid">
            {tarjetas.map((t, i) => (
              <a key={i} href={t.url} className="hcard" style={{ '--hcard-index': i }}
                onClick={t.url === '#' ? showComingSoon : undefined}>
                <div className={`hcard-icon ${t.color}`}>
                  <i className={`fas ${t.icono}`}></i>
                </div>
                <div className="hcard-info">
                  <span className="hcard-title">{t.titulo}</span>
                  <span className="hcard-stat">{datos[t.stat]} <em>{t.unidad}</em></span>
                </div>
                <i className="fas fa-arrow-right hcard-arrow"></i>
              </a>
            ))}
          </div>

        </div>
      </main>

      {/* Modal de sesión */}
      {modalOpen && (
        <div className="session-modal" style={{ display: 'block' }} onClick={(e) => {
          if (e.target.classList.contains('session-modal') || e.target.classList.contains('modal-overlay'))
            setModalOpen(false)
        }}>
          <div className="modal-overlay"></div>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
            <div className="modal-header">
              <i className="fas fa-info-circle"></i>
              <h3>Información de Sesión</h3>
            </div>
            <div className="modal-body">
              {sessionInfo ? (
                <>
                  <p><strong><i className="fas fa-user"></i> Usuario:</strong> <span>{sessionInfo.username}</span></p>
                  <p><strong><i className="fas fa-signal"></i> Estado:</strong>{' '}
                    {sessionInfo.session_active
                      ? <span style={{ color: '#28a745', fontWeight: 700 }}><i className="fas fa-check-circle"></i> Activa</span>
                      : <span style={{ color: '#dc3545', fontWeight: 700 }}><i className="fas fa-times-circle"></i> Inactiva</span>}
                  </p>
                  <p><strong><i className="fas fa-clock"></i> Timeout:</strong> <span>{sessionInfo.stats?.timeout_minutes} minutos</span></p>
                  <p><strong><i className="fas fa-calendar-check"></i> Última Verificación:</strong>{' '}
                    <span>{new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </p>
                </>
              ) : <p>Cargando...</p>}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <p>"Nada Humano Me Es Ajeno"</p>
        <p className="footer-copy">Sistema de Gestión UACM © 2026</p>
      </footer>
    </>
  )
}

export default Home
