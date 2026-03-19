import { useState, useEffect } from 'react'

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

function Login() {
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [nextUrl, setNextUrl]         = useState('/home/')

  // Leer parámetro ?next= de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    if (next) setNextUrl(next)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar campos vacíos
    if (!username.trim() || !password.trim()) {
      window.Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, complete todos los campos.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#640404',
      })
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('next', nextUrl)
    formData.append('csrfmiddlewaretoken', getCookie('csrftoken'))

    try {
      const res = await fetch('/login/', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        window.location.href = data.redirect || '/home/'
      } else {
        window.Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Usuario o contraseña incorrectos.',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#640404',
        })
        setLoading(false)
      }
    } catch {
      window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error en el sistema. Por favor intente más tarde.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#640404',
      })
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <h2 className="welcome-message">¡Bienvenido!</h2>
      <p className="subtitle">Accede a tu cuenta UACM</p>

      <div className="logo">
        <img src="/static/media/logouacm.jpg" alt="Logo UACM" className="circular-logo" />
      </div>

      <form onSubmit={handleSubmit} id="loginForm">
        <div className="form-group">
          <label htmlFor="username">
            <i className="fas fa-user"></i> Usuario
          </label>
          <div className="sec-2">
            <input
              type="text"
              id="username"
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">
            <i className="fas fa-lock"></i> Contraseña
          </label>
          <div className="sec-2">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="············"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              aria-label="Mostrar u ocultar contraseña"
              onClick={() => setShowPassword(v => !v)}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <button type="submit" className="login" id="loginBtn" disabled={loading}>
          <span className="btn-text">{loading ? 'Verificando...' : 'Ingresar al Sistema'}</span>
          {loading && <i className="fas fa-spinner fa-spin loading-spinner"></i>}
        </button>
      </form>

      <div className="login-footer">
        <p>Sistema de Gestión UACM © 2026</p>
      </div>
    </div>
  )
}

export default Login
