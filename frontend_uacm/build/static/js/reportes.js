$(document).ready(function () {
    $("#reporte-form").submit(function (event) {
        event.preventDefault();  // Evita la recarga de la página

        let fecha_inicio = $("#fecha_inicio").val();
        let fecha_fin = $("#fecha_fin").val();
        let formato = $("#formato").val();
        let csrf_token = $('input[name="csrfmiddlewaretoken"]').val();

        // Si se ingresan una de las fechas, se debe ingresar ambas;
        // pero si no se ingresan, se asume que se quiere el reporte de inventario.
        if ((!fecha_inicio && fecha_fin) || (fecha_inicio && !fecha_fin)) {
            alert("Por favor, selecciona ambas fechas o déjalas en blanco para el reporte de inventario.");
            return;
        }

        $.ajax({
            type: "POST",
            url: "/generar-reporte/",  // URL Django
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
                    // Si el backend genera un archivo, redirigir para descargarlo
                    window.location.href = response.url;
                } else if (response.datos) {
                    // Actualizamos la tabla con los datos recibidos
                    let tbody = $("#resultados-tabla tbody");
                    tbody.empty(); // Limpia contenido previo

                    response.datos.forEach(function (item) {
                        let fila = "<tr>";
                        fila += "<td>" + item.nom_articulo + "</td>";
                        fila += "<td>" + item.desc_articulo + "</td>";
                        fila += "<td>" + item.cantidad + "</td>";
                        if (item.qr_articulo) {
                            // Asegúrate de que la ruta de la imagen sea correcta
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
