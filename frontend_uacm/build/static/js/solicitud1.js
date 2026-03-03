// ===============================
// VARIABLES GLOBALES
// ===============================
let solicitudActual = null;

// ===============================
// URLS DEL SISTEMA
// ===============================
const APP_URLS = {
  crear_solicitud: document.getElementById("form-solicitud")?.dataset.url,
  cancelar_solicitud: "/cancelar/",
  exportar_pdf: "/exportar/pdf/",
  exportar_csv: "/exportar/csv/",
};

// ===============================
// DOM READY
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  configurarExportar();
  configurarAgregarProducto();
  configurarEnvioSolicitud();
  configurarCancelarSolicitud();
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
    if (solicitudActual) return; // no permitir editar

    const producto = document.getElementById("producto");
    const cantidad = document.getElementById("cantidad");

    if (!producto.value || cantidad.value <= 0) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${producto.value}</td>
      <td>${producto.options[producto.selectedIndex].text}</td>
      <td>${cantidad.value}</td>
      <td>
        <button type="button" class="btn-remove">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    tr.querySelector(".btn-remove").onclick = () => tr.remove();
    document.getElementById("productos-seleccionados").appendChild(tr);

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

    const productos = [];
    document.querySelectorAll("#productos-seleccionados tr").forEach((row) => {
      productos.push({
        id_producto: row.cells[0].textContent,
        cantidad: row.cells[2].textContent,
      });
    });

    if (productos.length === 0) {
      alert("Agrega al menos un producto.");
      return;
    }

    const data = {
      id_almacen: document.getElementById("almacen").value,
      observaciones_solicitud: JSON.stringify({
        matricula: document.getElementById("matricula").value,
        nombre: document.getElementById("nombre").value,
        cargo: document.getElementById("id_rol").selectedOptions[0]?.text,
      }),
      productos,
    };

    try {
      const res = await fetch(APP_URLS.crear_solicitud, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        mostrarDetalleSolicitud(result.solicitud);
        alert("Solicitud creada correctamente.");
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert(err.message);
    }
  });
}

// =====================================================
// MOSTRAR DETALLE + BLOQUEAR FORM
// =====================================================
function mostrarDetalleSolicitud(solicitud) {
  solicitudActual = solicitud;

  document.getElementById("detalle-id-solicitud").textContent =
    solicitud.id_solicitud;

  document.getElementById("detalle-matricula").textContent =
    solicitud.matricula || "N/A";

  document.getElementById("detalle-solicitante").textContent =
    solicitud.solicitante || "N/A";

  document.getElementById("detalle-cargo").textContent =
    solicitud.cargo || "N/A";

  document.getElementById("detalle-almacen").textContent = solicitud.almacen;

  document.getElementById("detalle-fecha").textContent =
    solicitud.fecha_creacion;

  document.getElementById("detalle-almacen").textContent = solicitud.almacen;
  document.getElementById("detalle-fecha").textContent =
    solicitud.fecha_creacion;

  const tbody = document.getElementById("detalle-productos");
  tbody.innerHTML = "";
  solicitud.productos.forEach((p) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.id_producto}</td>
        <td>${p.nombre}</td>
        <td>${p.cantidad}</td>
      </tr>`;
  });

  document.getElementById("detalle-solicitud-container").style.display =
    "block";

  // Bloquear formulario
  document
    .querySelectorAll(
      "#form-solicitud input, #form-solicitud select, #form-solicitud textarea, #btn-agregar"
    )
    .forEach((el) => (el.disabled = true));

  mostrarBotonCancelar(solicitud.estatus);
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

function mostrarBotonCancelar(estatus) {
  const btn = document.getElementById("btn-cancelar-solicitud");
  if (!btn) return;

  if (estatus === "SOLICITADA" || estatus === "PENDIENTE") {
    btn.style.display = "inline-flex";
  } else {
    btn.style.display = "none";
  }
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
