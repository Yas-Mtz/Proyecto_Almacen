$(document).ready(function () {
    // Evento que se dispara cuando el formulario con id 'reporte-form' se envía
    $("#reporte-form").submit(function (event) {
        event.preventDefault();  // Previene que el formulario recargue la página al enviarse

        // Obtención de los valores de los campos del formulario
        let fecha_inicio = $("#fecha_inicio").val();
        let fecha_fin = $("#fecha_fin").val();
        let formato = $("#formato").val();
        let csrf_token = $('input[name="csrfmiddlewaretoken"]').val();  // CSRF Token para la seguridad en el backend

        // Validar fechas antes de enviarlas, si es necesario
        if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
            alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
            return;
        }

        // Realiza una solicitud AJAX al servidor
        $.ajax({
            type: "POST",  // El tipo de solicitud es POST
            url: "/Reportes/generar-reporte/",  // URL a la que se enviará la solicitud (especificada en Django)
            data: {
                "fecha_inicio": fecha_inicio,  // Enviar fecha de inicio al backend
                "fecha_fin": fecha_fin,        // Enviar fecha de fin al backend
                "formato": formato,            // Enviar el formato del reporte seleccionado
                "csrfmiddlewaretoken": csrf_token  // Enviar el CSRF Token para protección
            },
            success: function (response) {
                console.log("Respuesta del servidor:", response);  // Depuración: muestra la respuesta del servidor

                // Verificar si el servidor respondió con un mensaje de error
                if (response.mensaje) {
                    alert(response.mensaje);  // Muestra un mensaje de alerta si no hay datos
                } else if (response.url) {
                    // Si el backend devuelve una URL, crear un enlace temporal para forzar la descarga
                    var link = document.createElement('a');
                    link.href = response.url;  // URL del archivo generado
                    link.download = "reporte";  // Nombre del archivo a descargar
                    document.body.appendChild(link);
                    link.click();  // Forzar el clic en el enlace
                    document.body.removeChild(link);  // Eliminar el enlace temporal
                } else if (response.datos) {
                    // Si el backend devuelve datos, actualiza la tabla en el frontend
                    let tbody = $("#resultados-tabla tbody");
                    tbody.empty(); // Limpiar contenido previo en la tabla

                    // Itera sobre los datos recibidos para llenar la tabla con los resultados
                    response.datos.forEach(function (item) {
                        let fila = "<tr>";  // Crea una fila para la tabla
                        fila += "<td>" + item.nom_articulo + "</td>";  // Nombre del artículo
                        fila += "<td>" + item.desc_articulo + "</td>";  // Descripción del artículo
                        fila += "<td>" + item.cantidad + "</td>";  // Cantidad del artículo
                        if (item.qr_articulo) {
                            // Si el artículo tiene un código QR, lo muestra
                            fila += "<td><img src='/" + item.qr_articulo + "' alt='QR Articulo' width='50'></td>";
                        } else {
                            fila += "<td>Sin imagen</td>";  // Si no hay imagen, indica "Sin imagen"
                        }
                        fila += "</tr>";  // Cierra la fila de la tabla
                        tbody.append(fila);  // Añade la fila a la tabla
                    });
                } else {
                    alert("No se encontraron datos para el reporte.");  // Si no hay datos para el reporte, muestra alerta
                }
            },
            error: function (error) {
                // En caso de error en la solicitud AJAX
                console.error("Error en la solicitud AJAX:", error);  // Muestra el error en la consola
                alert("Error al generar el reporte: " + (error.responseText || error.statusText));  // Muestra un mensaje de error al usuario
            }
        });
    });
});
