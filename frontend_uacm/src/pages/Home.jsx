import { useState, useEffect } from 'react'

// Tarjetas del dashboard
const tarjetas = [
  { titulo: 'Gestión de Productos', icono: 'fa-boxes',       color: 'blue',   url: '/GestiondeProductos/', stat: 'total_productos',       unidad: 'productos'  },
  { titulo: 'Reportes e Inventario', icono: 'fa-chart-line', color: 'navy',   url: '/Reportes/',           stat: 'total_solicitudes',      unidad: 'solicitudes'},
  { titulo: 'Solicitud de Artículos', icono: 'fa-shopping-cart', color: 'teal', url: '/Solicitudes/',       stat: 'solicitudes_pendientes', unidad: 'pendientes' },
  { titulo: 'Gestión de Personal',   icono: 'fa-users',      color: 'violet', url: '#',                    stat: 'total_personal',         unidad: 'miembros'   },
]

function Home() {
  const [datos, setDatos] = useState(null)
  const [saludo, setSaludo] = useState('Bienvenido')

  // Saludo dinámico según la hora
  useEffect(() => {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 12)       setSaludo('Buenos días')
    else if (hora >= 12 && hora < 19) setSaludo('Buenas tardes')
    else                               setSaludo('Buenas noches')
  }, [])

  // Pedir datos al backend Django
  useEffect(() => {
    fetch('/home/stats/')
      .then(res => res.json())
      .then(data => setDatos(data))
      .catch(() => {
        // Si falla, usar datos de ejemplo para no romper la vista
        setDatos({
          persona_nombre: 'Usuario',
          user_role: 'Usuario',
          total_productos: 0,
          total_solicitudes: 0,
          solicitudes_pendientes: 0,
          total_personal: 0,
          productos_bajo_stock: 0,
        })
      })
  }, [])

  if (!datos) return <p style={{ padding: '2rem' }}>Cargando...</p>

  return (
    <>
      {/* Header */}
      <header>
        <div className="header-content">
          <div className="logo-section">
            <div className="header-title">
              <h1>Sistema de Inventario</h1>
              <p className="header-subtitle">Universidad Autónoma de la Ciudad de México</p>
            </div>
          </div>
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{datos.persona_nombre}</span>
              <span className="user-role">{datos.user_role}</span>
            </div>
            <div className="user-avatar">
              <i className="fas fa-user"></i>
            </div>
            <a href="/login/logout/" className="dropdown-item logout" style={{ marginLeft: '1rem' }}>
              <i className="fas fa-sign-out-alt"></i>
            </a>
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
              <a key={i} href={t.url} className="hcard" style={{ '--hcard-index': i }}>
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

      {/* Footer */}
      <footer>
        <p>"Nada Humano Me Es Ajeno"</p>
        <p className="footer-copy">Sistema de Gestión UACM © 2024</p>
      </footer>
    </>
  )
}

export default Home
