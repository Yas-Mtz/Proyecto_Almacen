import { useState, useEffect } from 'react'

export function useDatos() {
  const [datos, setDatos] = useState(null)
  const [alertasStock, setAlertasStock] = useState([])
  const [campanaVisible, setCampanaVisible] = useState(false)
  const [modalAlertas, setModalAlertas] = useState(false)

  useEffect(() => {
    fetch('/Solicitudes/datos/')
      .then(r => r.json())
      .then(d => setDatos(d))
      .catch(() => setDatos({}))

    fetch('/Solicitudes/alertas-stock/')
      .then(r => r.json())
      .then(d => {
        if (d.alertas && d.alertas.length > 0) {
          setAlertasStock(d.alertas)
          setCampanaVisible(true)
          if (!sessionStorage.getItem('alertas_stock_vistas')) setModalAlertas(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleDejarPendiente = () => {
    sessionStorage.setItem('alertas_stock_vistas', '1')
    setModalAlertas(false)
  }

  return { datos, setDatos, alertasStock, campanaVisible, setCampanaVisible, modalAlertas, setModalAlertas, handleDejarPendiente }
}
