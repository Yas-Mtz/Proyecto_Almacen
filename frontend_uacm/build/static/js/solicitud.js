// Variables globales
let solicitudActual = null;
let scannerActive = false;
let qrStream = null;

// Obtener URLs desde el template
const APP_URLS = {
  crear_solicitud: document.getElementById("form-solicitud").dataset.url,
  buscar_personal: "/Solicitudes/buscar-personal/",
  exportar_pdf: "/exportar/pdf/",
  exportar_csv: "/exportar/csv/",
  cancelar_solicitud: "/cancelar/",
  actualizar_estatus: "/actualizar-estatus/",
};

document.addEventListener("DOMContentLoaded", function () {
  // ============ Lector QR ============
  const qrScannerBtn = document.getElementById("qr-scanner-btn");
  const qrScannerStopBtn = document.getElementById("qr-scanner-stop-btn");
  const qrVideo = document.getElementById("qr-video");
  const qrCanvas = document.getElementById("qr-canvas");
  const qrResult = document.getElementById("qr-result");

  // Iniciar escáner QR
  qrScannerBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      qrVideo.srcObject = qrStream;

      await qrVideo.play();

      qrVideo.style.display = "block";
      qrScannerBtn.style.display = "none";
      qrScannerStopBtn.style.display = "inline-block";
      scannerActive = true;
      scanQRCode();
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      qrResult.textContent = "Error al acceder a la cámara: " + err.message;
      qrResult.style.color = "red";
    }
  });

  // Detener escáner QR
  qrScannerStopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    stopQRScanner();
  });

  // ============ Manejador para agregar productos ============
  document.getElementById("btn-agregar").addEventListener("click", function () {
    const productoSelect = document.getElementById("producto");
    const cantidadInput = document.getElementById("cantidad");
    const productoId = productoSelect.value;
    const productoNombre =
      productoSelect.options[productoSelect.selectedIndex].getAttribute(
        "data-nombre"
      );
    const cantidad = cantidadInput.value;

    if (productoId && cantidad > 0) {
      const tbody = document.getElementById("productos-seleccionados");
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${productoId}</td>
                <td>${productoNombre}</td>
                <td>${cantidad}</td>
                <td><button class="btn-remove" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>
            `;
      tbody.appendChild(tr);

      // Resetear selección
      productoSelect.value = "";
      cantidadInput.value = 1;
    }
  });

  // ============ Manejador para enviar solicitud ============
  document
    .getElementById("form-solicitud")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const productos = [];
      document
        .querySelectorAll("#productos-seleccionados tr")
        .forEach((row) => {
          productos.push({
            id_producto: row.cells[0].textContent,
            cantidad: row.cells[2].textContent,
          });
        });

      const data = {
        id_almacen: document.getElementById("almacen").value,
        id_personal: document.getElementById("id_personal").value,
        observaciones_solicitud: document.getElementById("observaciones").value,
        productos: productos,
        exportar: document.querySelector('input[name="export-format"]:checked')
          ?.value,
      };

      try {
        const response = await fetch(APP_URLS.crear_solicitud, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify(data),
        });

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const errorText = await response.text();
          throw new Error(errorText || "Respuesta no válida del servidor");
        }

        const result = await response.json();
        if (response.ok && result.status === "success") {
          mostrarDetalleSolicitud(result.solicitud);
          alert("Solicitud creada exitosamente");
        } else {
          throw new Error(result.message || "Error al crear la solicitud");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error: " + error.message);
      }
    });

  // ============ Resto de manejadores ============
  document.getElementById("btn-pdf").addEventListener("click", function () {
    if (solicitudActual) {
      window.open(
        `${APP_URLS.exportar_pdf}${solicitudActual.id_solicitud}/`,
        "_blank"
      );
    }
  });

  document.getElementById("btn-csv").addEventListener("click", function () {
    if (solicitudActual) {
      window.open(
        `${APP_URLS.exportar_csv}${solicitudActual.id_solicitud}/`,
        "_blank"
      );
    }
  });

  document.getElementById("btn-print").addEventListener("click", function () {
    window.print();
  });

  document
    .getElementById("btn-cancelar-solicitud")
    .addEventListener("click", async function () {
      if (
        solicitudActual &&
        confirm("¿Estás seguro de cancelar esta solicitud?")
      ) {
        try {
          const response = await fetch(
            `${APP_URLS.cancelar_solicitud}${solicitudActual.id_solicitud}/`,
            {
              method: "POST",
              headers: { "X-CSRFToken": getCookie("csrftoken") },
            }
          );
          const result = await response.json();
          if (response.ok && result.status === "success") {
            alert("Solicitud cancelada exitosamente");
            location.reload();
          } else {
            throw new Error(result.message || "Error al cancelar la solicitud");
          }
        } catch (error) {
          alert("Error: " + error.message);
        }
      }
    });

  document
    .getElementById("btn-actualizar-estatus")
    .addEventListener("click", async function () {
      if (solicitudActual) {
        const nuevoEstatus = document.getElementById("cambio-estatus").value;
        const motivo = document.getElementById("motivo").value;
        try {
          const response = await fetch(
            `${APP_URLS.actualizar_estatus}${solicitudActual.id_solicitud}/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
              },
              body: JSON.stringify({ estatus: nuevoEstatus, motivo: motivo }),
            }
          );
          const result = await response.json();
          if (response.ok && result.status === "success") {
            alert("Estatus actualizado correctamente");
            location.reload();
          } else {
            throw new Error(result.message || "Error al actualizar el estatus");
          }
        } catch (error) {
          alert("Error: " + error.message);
        }
      }
    });
});

// ============ Funciones para el lector QR ============
function scanQRCode() {
  if (!scannerActive) return;

  const context = document
    .getElementById("qr-canvas")
    .getContext("2d", { willReadFrequently: true });
  const video = document.getElementById("qr-video");
  const canvas = document.getElementById("qr-canvas");

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code) {
      stopQRScanner();
      processQRCode(code.data);
      return;
    }
  }

  requestAnimationFrame(scanQRCode);
}

function stopQRScanner() {
  scannerActive = false;
  if (qrStream) {
    qrStream.getTracks().forEach((track) => track.stop());
  }
  document.getElementById("qr-video").style.display = "none";
  document.getElementById("qr-scanner-btn").style.display = "inline-block";
  document.getElementById("qr-scanner-stop-btn").style.display = "none";
}

async function processQRCode(qrData) {
  const qrResult = document.getElementById("qr-result");
  qrResult.textContent = "Procesando código QR...";
  qrResult.style.color = "blue";

  try {
    // Extraer ID del personal del código QR
    const idPersonal = await obtenerIdPersonalDesdeQR(qrData);

    // Actualizar campos del formulario
    document.getElementById("id_personal").value = idPersonal;

    // Mostrar resultado al usuario
    qrResult.textContent = `ID de personal asignado: ${idPersonal}`;
    qrResult.style.color = "green";

    // Opcional: Buscar y mostrar información adicional del personal
    try {
      const infoPersonal = await buscarInformacionPersonal(idPersonal);
      if (infoPersonal) {
        document.getElementById("matricula").value =
          infoPersonal.matricula || "";
        document.getElementById("nombre").value = infoPersonal.nombre || "";
        document.getElementById("id_rol").value = infoPersonal.cargo_id || "";
        qrResult.textContent = `Personal asignado: ${infoPersonal.nombre} (${infoPersonal.matricula})`;
      }
    } catch (error) {
      console.log("No se pudo obtener información adicional del personal");
    }
  } catch (error) {
    console.error("Error procesando QR:", error);
    qrResult.textContent = "Error: " + error.message;
    qrResult.style.color = "red";
  }
}

async function obtenerIdPersonalDesdeQR(qrData) {
  // 1. Intentar extraer ID numérico directamente
  const idNumerico = extraerIdNumerico(qrData);
  if (idNumerico) return idNumerico;

  // 2. Si no es numérico, extraer código de URL
  const codigoQR = extraerCodigoDeURL(qrData);
  if (!codigoQR) throw new Error("Formato de código QR no reconocido");

  // 3. Buscar en el backend el ID correspondiente al código
  try {
    const response = await fetch(
      `${APP_URLS.buscar_personal}?codigo=${encodeURIComponent(codigoQR)}`
    );

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // Si el backend no está configurado, usar el código como ID temporal
      console.warn(
        "El backend no devolvió JSON, usando código QR como ID temporal"
      );
      return codigoQR;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "No se encontró personal con ese código");
    }

    return data.data.id_personal;
  } catch (error) {
    console.error("Error al buscar personal:", error);
    // Si hay error de conexión, usar el código como ID temporal
    console.warn(
      "Usando código QR como ID temporal debido a error de conexión"
    );
    return codigoQR;
  }
}

function extraerIdNumerico(qrData) {
  // Intenta convertir directamente a número
  const id = parseInt(qrData);
  return isNaN(id) ? null : id;
}

function extraerCodigoDeURL(qrData) {
  try {
    // Si es una URL, extraemos el último segmento
    if (qrData.startsWith("http")) {
      const url = new URL(qrData);
      const pathParts = url.pathname.split("/");
      return pathParts[pathParts.length - 1];
    }
    return qrData; // Si no es URL, devolvemos el dato original
  } catch {
    return qrData; // Si falla el parsing, devolvemos el dato original
  }
}

async function buscarInformacionPersonal(idPersonal) {
  try {
    const response = await fetch(
      `${APP_URLS.buscar_personal}?id=${idPersonal}`
    );

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// ============ Funciones auxiliares ============
function mostrarDetalleSolicitud(solicitud) {
  solicitudActual = solicitud;
  document.getElementById("solicitud-id").textContent = solicitud.id_solicitud;
  document.getElementById("solicitud-fecha").textContent =
    solicitud.fecha_creacion;
  document.getElementById("solicitud-estatus").textContent = solicitud.estatus;
  document.getElementById("solicitud-almacen").textContent = solicitud.almacen;
  document.getElementById("solicitud-observaciones").textContent =
    solicitud.observaciones || "N/A";

  const productosBody = document.getElementById("detalle-productos");
  productosBody.innerHTML = "";
  solicitud.productos.forEach((producto) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${producto.id_producto}</td>
      <td>${producto.nombre}</td>
      <td>${producto.cantidad}</td>
    `;
    productosBody.appendChild(tr);
  });

  document.getElementById("detalle-solicitud").style.display = "block";
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    document.cookie.split(";").forEach((cookie) => {
      const [key, val] = cookie.trim().split("=");
      if (key === name) cookieValue = decodeURIComponent(val);
    });
  }
  return cookieValue;
}
