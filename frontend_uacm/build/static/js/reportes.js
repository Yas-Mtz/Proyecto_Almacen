$(document).ready(function () {

    /* ===============================
       REPORTE DE SOLICITUDES
    =============================== */
    $("#reporte-form").on("submit", function (e) {
        e.preventDefault();

        const fechaInicio = $("#fecha_inicio").val();
        const fechaFin = $("#fecha_fin").val();
        const formato = $("#formato").val();
        const csrfToken = $("input[name='csrfmiddlewaretoken']").val();

        // Validación UX
        if (!fechaInicio || !fechaFin) {
            alert("Selecciona ambas fechas.");
            return;
        }

        if (fechaInicio > fechaFin) {
            alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
            return;
        }

        $.ajax({
            type: "POST",
            url: "/Reportes/generar-reporte/",
            data: {
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                formato: formato,
                csrfmiddlewaretoken: csrfToken
            },
            success: function (response) {
                console.log("Reporte:", response);

                // 1️⃣ Si el backend devuelve archivo
                if (response.url) {
                    descargarArchivo(response.url, "reporte");
                    return;
                }

                // 2️⃣ Si devuelve datos para tabla
                if (response.productos || response.datos) {
                    mostrarTablaReportes(response.productos || response.datos);
                    return;
                }

                alert("No se encontraron resultados.");
            },
            error: function (xhr) {
                console.error(xhr.responseText);
                alert("Error al generar el reporte.");
            }
        });
    });

    /* ===============================
       INVENTARIO GENERAL
    =============================== */
    $("#mostrar-inventario").on("click", function () {

        $.ajax({
            type: "GET",
            url: "/Reportes/inventario/",
            success: function (response) {
                console.log("Inventario:", response);

                if (!response.articulos || response.articulos.length === 0) {
                    alert("No hay artículos en inventario.");
                    return;
                }

                $("#inventario-container").show();
                const tbody = $("#inventario-tabla");
                tbody.empty();

                response.articulos.forEach(item => {
                    tbody.append(`
                        <tr>
                            <td>${item.nom_articulo}</td>
                            <td>${item.desc_articulo}</td>
                            <td>${item.cantidad}</td>
                            <td>${item.nomb_estatus}</td>
                        </tr>
                    `);
                });
            },
            error: function (xhr) {
                console.error(xhr.responseText);
                alert("Error al cargar el inventario.");
            }
        });
    });

});


/* ===============================
   FUNCIONES AUXILIARES
=============================== */

function mostrarTablaReportes(datos) {
    $("#resultados-container").show();
    const tbody = $("#resultados-tabla");
    tbody.empty();

    datos.forEach(item => {
        tbody.append(`
            <tr>
                <td>${item.id_solicitud || "-"}</td>
                <td>${item.almacen_direccion || "-"}</td>
                <td>${item.nom_articulo || "-"}</td>
                <td>${item.cantidad || "-"}</td>
                <td>${item.nombre_persona || "-"}</td>
                <td>${item.fecha_sol || "-"}</td>
            </tr>
        `);
    });
}

function descargarArchivo(url, nombre) {
    const link = document.createElement("a");
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
