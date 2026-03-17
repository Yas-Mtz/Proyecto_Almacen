// ===============================
// VARIABLES GLOBALES
// ===============================
let solicitudActual = null;
let personalValido  = false;

// ===============================
// URLS DEL SISTEMA
// ===============================
const _form = document.getElementById("form-solicitud");
const ES_ENCARGADO = _form?.dataset.encargado === "true";
const APP_URLS = {
  crear_solicitud:    _form?.dataset.url,
  buscar_personal_qr: _form?.dataset.urlPersonalQr,
  cancelar_solicitud: _form?.dataset.urlCancelar,
  aprobar_solicitud:  _form?.dataset.urlAprobar,
  buscar_solicitud:   _form?.dataset.urlBuscar,
  exportar_pdf: "/Solicitudes/exportar/pdf/",
  exportar_csv: "/Solicitudes/exportar/csv/",
};

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  configurarExportar();
  configurarAgregarProducto();
  configurarEnvioSolicitud();
  configurarCancelarSolicitud();
  configurarAprobarSolicitud();
  configurarEscanerQR();
  configurarValidacionPersonal();
  configurarBuscarSolicitud();
});

// =====================================================
// EXPORTAR (solo si hay solicitud)
// =====================================================
function configurarExportar() {
  const wrapper = document.querySelector(".export-wrapper");
  const btn = document.querySelector(".btn-export");

  if (!wrapper || !btn) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!solicitudActual) {
      alert("Primero genera o consulta una solicitud.");
      return;
    }
    wrapper.classList.toggle("active");
  });

  document.addEventListener("click", () => {
    wrapper.classList.remove("active");
  });

  const btnConfirm = document.querySelector(".btn-confirm-export");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", () => {
      if (!solicitudActual) return;

      const formato = document.querySelector(
        'input[name="export-format"]:checked'
      )?.value;

      if (formato === "pdf") {
        window.open(`${APP_URLS.exportar_pdf}${solicitudActual.id_solicitud}/`);
      }
      if (formato === "csv") {
        window.open(`${APP_URLS.exportar_csv}${solicitudActual.id_solicitud}/`);
      }
    });
  }
}

// =====================================================
// AGREGAR PRODUCTOS
// =====================================================
function configurarAgregarProducto() {
  const btnAgregar = document.getElementById("btn-agregar");
  if (!btnAgregar) return;

  btnAgregar.addEventListener("click", () => {
    if (solicitudActual) return;

    const producto = document.getElementById("producto");
    const cantidad = document.getElementById("cantidad");

    if (!producto.value || cantidad.value <= 0) return;

    const idProducto  = producto.value;
    const cantNueva   = parseInt(cantidad.value, 10);
    const tbody       = document.getElementById("productos-seleccionados");

    // Si el producto ya está en la tabla, sumar cantidad
    const filaExistente = tbody.querySelector(`tr[data-id="${idProducto}"]`);
    if (filaExistente) {
      const tdCantidad = filaExistente.querySelector(".celda-cantidad");
      tdCantidad.textContent = parseInt(tdCantidad.textContent, 10) + cantNueva;
      producto.value = "";
      cantidad.value = 1;
      return;
    }

    const nombreProducto = producto.options[producto.selectedIndex].text;
    const tr = document.createElement("tr");
    tr.dataset.id = idProducto;
    tr.innerHTML = `
      <td>${idProducto}</td>
      <td>${nombreProducto}</td>
      <td class="celda-cantidad">${cantNueva}</td>
      <td>
        <button type="button" class="btn-remove">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    tr.querySelector(".btn-remove").onclick = () => tr.remove();
    tbody.appendChild(tr);

    producto.value = "";
    cantidad.value = 1;
  });
}

// =====================================================
// ENVIAR SOLICITUD
// =====================================================
function configurarEnvioSolicitud() {
  const form = document.getElementById("form-solicitud");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (solicitudActual) return;

    // Validación de campos requeridos
    const idAlmacen = document.getElementById("almacen").value;
    const matricula  = document.getElementById("matricula").value.trim();
    const nombre     = document.getElementById("nombre").value.trim();

    if (!matricula) { alert("Ingresa la matrícula del solicitante."); return; }
    if (!personalValido) { alert("La matrícula no está registrada. Verifica o usa el escáner QR."); return; }
    if (!nombre)    { alert("Ingresa el nombre del solicitante."); return; }
    if (!idAlmacen) { alert("Selecciona un almacén de destino."); return; }

    const productos = [];
    document.querySelectorAll("#productos-seleccionados tr").forEach((row) => {
      productos.push({
        id_producto: row.dataset.id,
        cantidad: row.querySelector(".celda-cantidad").textContent,
      });
    });

    if (productos.length === 0) {
      alert("Agrega al menos un producto.");
      return;
    }

    const data = {
      id_almacen:              idAlmacen,
      id_personal:             document.getElementById("matricula").value.trim(),
      observaciones_solicitud: document.getElementById("observaciones").value.trim(),
      productos,
    };

    // [LOG] Ver qué se manda al servidor
    console.log("=== ENVIANDO SOLICITUD ===");
    console.log("URL:", APP_URLS.crear_solicitud);
    console.log("CSRF:", getCookie("csrftoken"));
    console.log("DATA:", JSON.stringify(data, null, 2));

    try {
      const res = await fetch(APP_URLS.crear_solicitud, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(data),
      });

      // [LOG] Ver respuesta del servidor
      const rawText = await res.text();
      console.log("=== RESPUESTA SERVIDOR ===");
      console.log("Status:", res.status, res.statusText);
      console.log("Body:", rawText);

      let result;
      try { result = JSON.parse(rawText); }
      catch { throw new Error("Respuesta inválida del servidor: " + rawText); }

      if (res.ok) {
        mostrarDetalleSolicitud(result.solicitud);
        alert("Solicitud creada correctamente.");
      } else {
        throw new Error(result.message || result.error || rawText);
      }
    } catch (err) {
      console.error("=== ERROR CAPTURADO ===", err);
      alert(err.message);
    }
  });
}

// =====================================================
// MOSTRAR DETALLE + BLOQUEAR FORM
// =====================================================
function mostrarDetalleSolicitud(solicitud) {
  solicitudActual = solicitud;

  // Columna derecha: ocultar selector, mostrar panel de confirmación
  document.getElementById("panel-crear-productos").style.display = "none";
  document.getElementById("panel-confirmacion").style.display = "block";
  document.getElementById("th-accion").style.display = "none";

  // ID de la solicitud
  document.getElementById("detalle-id-solicitud").textContent =
    solicitud.id_solicitud;

  // Reemplazar tabla con productos confirmados (sin botón eliminar)
  const tbody = document.getElementById("productos-seleccionados");
  tbody.innerHTML = "";
  solicitud.productos.forEach((p) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.id_producto}</td>
        <td>${p.nombre}</td>
        <td>${p.cantidad}</td>
        <td></td>
      </tr>`;
  });

  // Bloquear formulario
  document
    .querySelectorAll(
      "#form-solicitud input, #form-solicitud select, #form-solicitud textarea, #btn-agregar"
    )
    .forEach((el) => (el.disabled = true));

  // Actualizar badge de estatus
  const badge = document.getElementById("detalle-estatus");
  if (badge) {
    const clsMap = { SOLICITADA: "status-solicitado", APROBADA: "status-aprobado", CANCELADA: "status-cancelado", COMPLETADA: "status-completado" };
    badge.textContent = solicitud.estatus;
    badge.className   = `status-badge ${clsMap[solicitud.estatus] || "status-solicitado"}`;
  }

  actualizarBotonesEstatus(solicitud.estatus);
}

// =====================================================
// CANCELAR SOLICITUD
// =====================================================
function configurarCancelarSolicitud() {
  const btn = document.getElementById("btn-cancelar-solicitud");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!solicitudActual) return;

    if (!confirm("¿Deseas cancelar esta solicitud?")) return;

    try {
      const res = await fetch(
        `${APP_URLS.cancelar_solicitud}${solicitudActual.id_solicitud}/`,
        {
          method: "POST",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
        }
      );

      const result = await res.json();
      if (res.ok) {
        alert("Solicitud cancelada.");
        location.reload();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert(err.message);
    }
  });
}

// =====================================================
// APROBAR SOLICITUD
// =====================================================
function configurarAprobarSolicitud() {
  const btn = document.getElementById("btn-aprobar-solicitud");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (!solicitudActual) return;
    if (!confirm("¿Confirmas la aprobación de esta solicitud?")) return;

    try {
      const res = await fetch(
        `${APP_URLS.aprobar_solicitud}${solicitudActual.id_solicitud}/`,
        { method: "POST", headers: { "X-CSRFToken": getCookie("csrftoken") } }
      );
      const result = await res.json();

      if (res.ok) {
        solicitudActual.estatus = "APROBADA";
        actualizarBotonesEstatus("APROBADA");

        const badge = document.getElementById("detalle-estatus");
        if (badge) {
          badge.textContent = "APROBADA";
          badge.className   = "status-badge status-aprobado";
        }
        alert("Solicitud aprobada correctamente.");
      } else {
        alert(result.error || "No se pudo aprobar la solicitud.");
      }
    } catch {
      alert("Error al aprobar la solicitud.");
    }
  });
}

function actualizarBotonesEstatus(estatus) {
  const btnCancelar = document.getElementById("btn-cancelar-solicitud");
  const btnAprobar  = document.getElementById("btn-aprobar-solicitud");

  // Solo en SOLICITADA se puede aprobar o cancelar
  const accionable = estatus === "SOLICITADA";
  if (btnCancelar) btnCancelar.style.display = accionable ? "inline-flex" : "none";
  if (btnAprobar)  btnAprobar.style.display  = (accionable && ES_ENCARGADO) ? "inline-flex" : "none";
}

// =====================================================
// ESCÁNER QR (lector USB)
// =====================================================
function configurarEscanerQR() {
  const overlay   = document.getElementById("qr-overlay");
  const input     = document.getElementById("qr-input");
  const instruccion = document.getElementById("qr-instruccion");
  const btnCancelar = document.getElementById("btn-qr-cancelar");
  const btnPersonal = document.getElementById("btn-escanear-personal");
  const btnProducto = document.getElementById("btn-escanear-producto");

  if (!overlay || !input) return;

  let modoEscaneo = null; // 'personal' | 'producto'

  function abrirOverlay(modo) {
    modoEscaneo = modo;
    input.value = "";
    instruccion.textContent = modo === "personal"
      ? "Apunte el lector al QR del personal"
      : "Apunte el lector al QR del producto";
    overlay.style.display = "flex";
    setTimeout(() => input.focus(), 100);
  }

  function cerrarOverlay() {
    overlay.style.display = "none";
    modoEscaneo = null;
    input.value = "";
  }

  btnPersonal?.addEventListener("click", () => abrirOverlay("personal"));
  btnProducto?.addEventListener("click", () => abrirOverlay("producto"));
  btnCancelar?.addEventListener("click", cerrarOverlay);

  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const contenido = input.value.trim();
    cerrarOverlay();

    if (!contenido) return;

    if (modoEscaneo === "personal") {
      await procesarQRPersonal(contenido);
    } else if (modoEscaneo === "producto") {
      procesarQRProducto(contenido);
    }
  });
}

async function procesarQRPersonal(qrData) {
  try {
    const url = `${APP_URLS.buscar_personal_qr}?qr_data=${encodeURIComponent(qrData)}`;
    const res = await fetch(url, {
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "No se encontró el personal.");
      return;
    }

    document.getElementById("matricula").value = data.matricula;
    const campoNombre = document.getElementById("nombre");
    campoNombre.value    = data.nombre;
    campoNombre.readOnly = true;
    personalValido = true;
    setPersonalStatus("ok");

    const selectRol = document.getElementById("id_rol");
    for (const opt of selectRol.options) {
      if (String(opt.value) === String(data.id_rol)) {
        opt.selected = true;
        break;
      }
    }
  } catch (err) {
    alert("Error al leer el QR de personal.");
  }
}

function procesarQRProducto(qrData) {
  // Formato esperado: "id_producto - nombre_producto"
  const partes = qrData.split(" - ");
  if (partes.length < 2) {
    alert("QR de producto no reconocido.");
    return;
  }
  const idProducto = partes[0].trim();

  const selectProducto = document.getElementById("producto");
  let encontrado = false;
  for (const opt of selectProducto.options) {
    if (String(opt.value) === String(idProducto)) {
      opt.selected = true;
      encontrado = true;
      break;
    }
  }

  if (!encontrado) {
    alert(`Producto con ID ${idProducto} no encontrado en la lista.`);
  }
}

// =====================================================
// VALIDACIÓN DE PERSONAL (blur en matrícula)
// =====================================================
function configurarValidacionPersonal() {
  const input = document.getElementById("matricula");
  if (!input) return;

  input.addEventListener("blur", async () => {
    const valor = input.value.trim();
    if (!valor) { setPersonalStatus(null); return; }

    setPersonalStatus("cargando");
    try {
      const res  = await fetch(`${APP_URLS.buscar_personal_qr}?qr_data=${encodeURIComponent(valor)}`);
      const data = await res.json();

      if (res.ok) {
        const campoNombre = document.getElementById("nombre");
        campoNombre.value    = data.nombre;
        campoNombre.readOnly = true;

        const sel = document.getElementById("id_rol");
        for (const opt of sel.options) {
          if (String(opt.value) === String(data.id_rol)) { opt.selected = true; break; }
        }
        personalValido = true;
        setPersonalStatus("ok");
      } else {
        personalValido = false;
        setPersonalStatus("error");
      }
    } catch {
      personalValido = false;
      setPersonalStatus("error");
    }
  });

  input.addEventListener("input", () => {
    personalValido = false;
    setPersonalStatus(null);
    const campoNombre = document.getElementById("nombre");
    campoNombre.value    = "";
    campoNombre.readOnly = false;
  });
}

function setPersonalStatus(estado) {
  const el = document.getElementById("validacion-personal");
  if (!el) return;
  const map = {
    ok:        { cls: "personal-ok",      html: '<i class="fas fa-check-circle"></i> Personal encontrado' },
    error:     { cls: "personal-error",   html: '<i class="fas fa-times-circle"></i> No encontrado en el sistema' },
    cargando:  { cls: "personal-loading", html: '<i class="fas fa-spinner fa-spin"></i> Verificando...' },
  };
  if (!estado || !map[estado]) { el.className = "personal-status"; el.innerHTML = ""; return; }
  el.className = `personal-status ${map[estado].cls}`;
  el.innerHTML  = map[estado].html;
}

// =====================================================
// BUSCAR SOLICITUD POR ID
// =====================================================
function configurarBuscarSolicitud() {
  const btn = document.getElementById("btn-buscar-solicitud");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const id = document.getElementById("buscar-id-solicitud").value.trim();
    if (!id) { alert("Ingresa el ID de la solicitud."); return; }

    try {
      const res  = await fetch(`${APP_URLS.buscar_solicitud}${id}/`);
      const data = await res.json();

      if (!res.ok) { alert(data.error || "Solicitud no encontrada."); return; }

      mostrarSolicitudEncontrada(data.solicitud);
    } catch {
      alert("Error al buscar la solicitud.");
    }
  });
}

function mostrarSolicitudEncontrada(solicitud) {
  // Llenar columna izquierda
  document.getElementById("matricula").value = solicitud.matricula || "";
  document.getElementById("nombre").value    = solicitud.solicitante || "";

  const selAlmacen = document.getElementById("almacen");
  for (const opt of selAlmacen.options) {
    if (String(opt.value) === String(solicitud.id_almacen)) { opt.selected = true; break; }
  }
  const selRol = document.getElementById("id_rol");
  for (const opt of selRol.options) {
    if (String(opt.value) === String(solicitud.id_rol)) { opt.selected = true; break; }
  }

  // Ocultar botón enviar y QR personal (es solo lectura)
  const btnSubmit = document.querySelector("#form-solicitud button[type='submit']");
  if (btnSubmit) btnSubmit.style.display = "none";
  const btnQrPersonal = document.getElementById("btn-escanear-personal");
  if (btnQrPersonal) btnQrPersonal.style.display = "none";

  personalValido = true; // evitar bloqueo interno
  mostrarDetalleSolicitud(solicitud);

  document.getElementById("nueva-solicitud-container")
          .scrollIntoView({ behavior: "smooth", block: "start" });
}

// =====================================================
// CSRF
// =====================================================
function getCookie(name) {
  let value = null;
  document.cookie.split(";").forEach((c) => {
    const [k, v] = c.trim().split("=");
    if (k === name) value = decodeURIComponent(v);
  });
  return value;
}
