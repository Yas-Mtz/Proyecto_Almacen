// ===============================
// VARIABLES GLOBALES
// ===============================
let solicitudActual = null;
let scannerActive = false;
let qrStream = null;

// ===============================
// URLS DEL SISTEMA
// ===============================
const APP_URLS = {
  crear_solicitud: document.getElementById("form-solicitud")?.dataset.url,
  buscar_personal: "/Solicitudes/buscar-personal/",
  exportar_pdf: "/exportar/pdf/",
  exportar_csv: "/exportar/csv/",
  cancelar_solicitud: "/cancelar/",
  actualizar_estatus: "/actualizar-estatus/",
};

document.addEventListener("DOMContentLoaded", function () {
  // =====================================================
  // EXPORTAR (DROPDOWN UX)
  // =====================================================
  const exportWrapper = document.querySelector(".export-wrapper");
  const exportBtn = document.querySelector(".btn-export");

  if (exportWrapper && exportBtn) {
    exportBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      exportWrapper.classList.toggle("active");
    });

    document.addEventListener("click", function () {
      exportWrapper.classList.remove("active");
    });
  }

  // =====================================================
  // AGREGAR PRODUCTOS
  // =====================================================
  const btnAgregar = document.getElementById("btn-agregar");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", function () {
      const productoSelect = document.getElementById("producto");
      const cantidadInput = document.getElementById("cantidad");

      const productoId = productoSelect.value;
      const productoNombre =
        productoSelect.options[productoSelect.selectedIndex]?.textContent;
      const cantidad = cantidadInput.value;

      if (!productoId || cantidad <= 0) return;

      const tbody = document.getElementById("productos-seleccionados");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${productoId}</td>
        <td>${productoNombre}</td>
        <td>${cantidad}</td>
        <td>
          <button class="btn-remove" type="button">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;

      tr.querySelector(".btn-remove").addEventListener("click", () =>
        tr.remove()
      );
      tbody.appendChild(tr);

      productoSelect.value = "";
      cantidadInput.value = 1;
    });
  }

  // =====================================================
  // ENVIAR SOLICITUD
  // =====================================================
  const formSolicitud = document.getElementById("form-solicitud");

  if (formSolicitud) {
    formSolicitud.addEventListener("submit", async function (e) {
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

      if (productos.length === 0) {
        alert("Agrega al menos un producto.");
        return;
      }

      const data = {
        id_almacen: document.getElementById("almacen")?.value,
        observaciones_solicitud:
          document.getElementById("observaciones")?.value,
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

        const result = await response.json();

        if (response.ok && result.status === "success") {
          mostrarDetalleSolicitud(result.solicitud);
          alert("Solicitud creada exitosamente");
        } else {
          throw new Error(result.message || "Error al crear la solicitud");
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });
  }

  // =====================================================
  // ACTUALIZAR ESTATUS
  // =====================================================
  const btnActualizar = document.getElementById("btn-actualizar-estatus");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", async function () {
      if (!solicitudActual) return;

      const nuevoEstatus = document.getElementById("cambio-estatus")?.value;
      const motivo = document.getElementById("motivo")?.value;

      try {
        const response = await fetch(
          `${APP_URLS.actualizar_estatus}${solicitudActual.id_solicitud}/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ estatus: nuevoEstatus, motivo }),
          }
        );

        const result = await response.json();
        if (response.ok && result.status === "success") {
          alert("Estatus actualizado");
          location.reload();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }
});

// =====================================================
// MOSTRAR DETALLE
// =====================================================
function mostrarDetalleSolicitud(solicitud) {
  solicitudActual = solicitud;

  document.getElementById("detalle-id-solicitud").textContent =
    solicitud.id_solicitud;
  document.getElementById("detalle-solicitante").textContent =
    solicitud.solicitante;
  document.getElementById("detalle-almacen").textContent = solicitud.almacen;
  document.getElementById("detalle-fecha").textContent =
    solicitud.fecha_creacion;

  const tbody = document.getElementById("detalle-productos");
  tbody.innerHTML = "";

  solicitud.productos.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id_producto}</td>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("detalle-solicitud-container").style.display =
    "block";
}

// =====================================================
// CSRF
// =====================================================
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
