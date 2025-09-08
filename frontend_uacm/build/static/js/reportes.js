$(document).ready(function () {
    // Evento para el botón de generar reporte
    $('#btn_generar_reporte').on('click', function() {
        const fechaInicio = $('#fecha_inicio').val();
        const fechaFin = $('#fecha_fin').val();

        // Validar fechas antes de hacer la llamada AJAX
        if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
            alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
            return;
        }

        // Llamada AJAX para obtener los reportes según las fechas seleccionadas
        $.ajax({
            type: 'GET',
            url: `/ruta/a/tu/api/reporte?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
            success: function(data) {
                const tablaReportes = $('#tabla_reportes tbody');
                tablaReportes.empty(); // Limpiar tabla antes de llenarla

                data.forEach(function(item) {
                    const fila = `<tr><td>${item.producto}</td><td>${item.fecha}</td><td>${item.cantidad}</td><td>${item.precio}</td></tr>`;
                    tablaReportes.append(fila);
                });
            },
            error: function(error) {
                console.error("Error en la solicitud AJAX:", error);
                alert("Error al generar el reporte.");
            }
        });
    });

    // Evento para el botón de generar inventario
    $('#btn_generar_inventario').on('click', function() {
        const categoria = $('#categoria').val();
        const estado = $('#estado').val();

        // Llamada AJAX para obtener el inventario según los filtros seleccionados
        $.ajax({
            type: 'GET',
            url: `/ruta/a/tu/api/inventario?categoria=${categoria}&estado=${estado}`,
            success: function(data) {
                const tablaInventario = $('#tabla_inventario tbody');
                tablaInventario.empty(); // Limpiar tabla antes de llenarla

                data.forEach(function(item) {
                    const fila = `<tr><td>${item.producto}</td><td>${item.categoria}</td><td>${item.cantidad}</td><td>${item.estado}</td></tr>`;
                    tablaInventario.append(fila);
                });
            },
            error: function(error) {
                console.error("Error en la solicitud AJAX:", error);
                alert("Error al generar el inventario.");
            }
        });
    });

    // Evento para el formulario de generar reporte (envío con jQuery)
    $("#reporte-form").submit(function (event) {
        event.preventDefault();  // Previene el comportamiento por defecto del formulario

        // Obtención de valores de los campos
        let fecha_inicio = $("#fecha_inicio").val();
        let fecha_fin = $("#fecha_fin").val();
        let formato = $("#formato").val();
        let csrf_token = $('input[name="csrfmiddlewaretoken"]').val();  // CSRF Token para la seguridad en el backend

        // Validar fechas antes de enviarlas
        if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
            alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
            return;
        }

        // Realiza la solicitud AJAX al servidor
        $.ajax({
            type: "POST",
            url: "/Reportes/generar-reporte/",
            data: {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "formato": formato,
                "csrfmiddlewaretoken": csrf_token
            },
            success: function (response) {
                console.log("Respuesta del servidor:", response);

                if (response.mensaje) {
                    alert(response.mensaje);
                } else if (response.url) {
                    var link = document.createElement('a');
                    link.href = response.url;
                    link.download = "reporte";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else if (response.datos) {
                    let tbody = $("#resultados-tabla tbody");
                    tbody.empty();

                    response.datos.forEach(function (item) {
                        let fila = "<tr>";
                        fila += "<td>" + item.nom_articulo + "</td>";
                        fila += "<td>" + item.desc_articulo + "</td>";
                        fila += "<td>" + item.cantidad + "</td>";
                        if (item.qr_articulo) {
                            fila += "<td><img src='/" + item.qr_articulo + "' alt='QR Articulo' width='50'></td>";
                        } else {
                            fila += "<td>Sin imagen</td>";
                        }
                        fila += "</tr>";
                        tbody.append(fila);
                    });
                } else {
                    alert("No se encontraron datos para el reporte.");
                }
            },
            error: function (error) {
                console.error("Error en la solicitud AJAX:", error);
                alert("Error al generar el reporte: " + (error.responseText || error.statusText));
            }
        });
    });
});
