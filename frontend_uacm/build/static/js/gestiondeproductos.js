$(document).ready(function () {
    

    /**
     * Actualiza la imagen del código QR y la información relacionada con un producto.
     * @param {string} id - El identificador del producto.
     * @param {string} nombre - El nombre del producto.
     */
    function actualizarQR(id, nombre) {
        if (id && nombre) {
            console.log('ID del artículo seleccionado:', id);
            console.log('Nombre del artículo seleccionado:', nombre);

            // Construcción de la URL para generar el QR
            const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(nombre)}`;
            console.log('URL del QR:', url);

            // Hacer la solicitud para generar el código QR
            fetch(url)
                .then(response => response.blob()) // Obtener la respuesta como un blob (imagen)
                .then(blob => {
                    console.log('Imagen QR recibida');
                    // Crear una URL para el archivo de imagen del código QR
                    const qrImageUrl = URL.createObjectURL(blob);
                    // Mostrar la imagen del QR
                    $('#qr-image').attr('src', qrImageUrl).show();

                    // Configurar el botón de descarga del QR
                    $('#download-btn').off('click').on('click', function () {
                        const a = document.createElement('a');
                        a.href = qrImageUrl;
                        a.download = `QR_${id}.png`; // Nombre de archivo para la descarga
                        document.body.appendChild(a);
                        a.click(); // Simula el clic para descargar
                        document.body.removeChild(a); // Elimina el elemento creado
                    });
                })
                .catch(error => {
                    console.error('Error al generar el QR:', error); // Manejo de errores
                });
        }
    }

    /**
     * Maneja el evento de clic en el botón 'edit-btn'. 
     * Obtiene la información del producto y actualiza los campos del formulario y la imagen del QR.
     * Si no se ha seleccionado un ID de producto, limpia los campos del formulario.
     */
    $('#edit-btn').on('click', function () {
        var id_articulo = $('#buscar').val(); // Obtener el ID del artículo desde el input 'buscar'
        console.log('ID del artículo seleccionado:', id_articulo);

        if (id_articulo) {
            // Realizar una solicitud AJAX para obtener los datos del producto
            $.ajax({
                url: '/GestiondeProductos/', // URL de la solicitud
                method: 'GET',
                data: { 'id_articulo': id_articulo }, // Datos a enviar en la solicitud
                success: function (response) {
                    console.log('Respuesta del servidor:', response);

                    // Si la respuesta es exitosa, actualizamos los campos del formulario
                    if (response.status === 'success') {
                        $('#id_articulo').val(id_articulo);
                        $('#nom_articulo').val(response.nombre_articulo);
                        $('#descripcion_articulo').val(response.descripcion_articulo);
                        $('#estatus').val(response.id_estatus);
                        $('#id_estatus').val(response.id_estatus);

                        // Guardamos la cantidad actual del artículo
                        cantidadActual = parseInt(response.cantidad_articulo) || 0;
                        $('#cantidad_actual').text(`Cantidad actual: ${cantidadActual}`); // Mostrar la cantidad actual en una etiqueta

                        // Establecemos la acción como 'update' para indicar que es una actualización
                        $('input[name="action"]').val('update');
                        // Actualizar el QR
                        actualizarQR(id_articulo, response.nombre_articulo);
                        alert(response.message); // Mostrar mensaje de éxito
                    } else {
                        // Si no se encuentra el artículo, habilitamos el campo para agregarlo como nuevo
                        $('#cantidad_articulo').prop('disabled', false);
                        $('input[name="action"]').val('add');
                        alert(response.message);
                    }
                },
                error: function () {
                    console.log('Error al consultar el artículo.');
                    alert('Error al consultar el artículo.'); // Error al hacer la solicitud
                }
            });
        } else {
            // Si no se ha seleccionado un ID, limpiamos los campos del formulario
            $('#nom_articulo, #descripcion_articulo, #cantidad_articulo, #id_estatus').val('');
            $('#qr-image').attr('src', '').hide();
            $('input[name="action"]').val('add');
        }
    });

    /**
     * Maneja el evento de clic en el botón 'btn-guardar'.
     * Recoge los datos del formulario y los envía al servidor para guardar o actualizar el artículo.
     */
    $('#btn-guardar').on('click', function (event) {
        event.preventDefault(); // Evita el comportamiento por defecto del formulario
        console.log("Valor de nom_articulo antes de enviar:", $('#nom_articulo').val());

        // Verificar si la cantidad es válida
        if (totalCantidad < 0) {
            alert("La cantidad no puede ser negativa.");
            return;
        }

        // Datos a enviar al servidor
        var data = {
            id_articulo: $('#id_articulo').val(),
            nom_articulo: $('#nom_articulo').val(),
            descripcion_articulo: $('#descripcion_articulo').val(),
            cantidad_articulo: totalCantidad, // Enviar la cantidad total
            id_estatus: $('#id_estatus').val(),
            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
            action: $('input[name="action"]').val()
        };

        console.log('Datos a enviar:', data);

        // Verificar que todos los campos estén completos
        if (!data.id_articulo || !data.nom_articulo || !data.descripcion_articulo || !data.cantidad_articulo || !data.id_estatus) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        // Enviar los datos al servidor usando AJAX
        $.ajax({
            url: '/GestiondeProductos/', // URL de la solicitud
            method: 'POST',
            data: data, // Datos a enviar
            success: function (response) {
                console.log('Respuesta del servidor al guardar:', response);
                
                // Si la respuesta es exitosa, actualizamos el QR y limpiamos los campos
                if (response.status === 'success') {
                    alert(response.message); // Mostrar mensaje de éxito
                    actualizarQR(data.id_articulo, data.nom_articulo); // Actualizar el QR
                    // Limpiar los campos del formulario
                    $('#nom_articulo').val('');
                    $('#descripcion_articulo').val('');
                    $('#cantidad_articulo').val('');
                    $('#id_estatus').val('');
                    $('input[name="action"]').val('add');
                } else {
                    alert(response.message); // Mostrar mensaje de error
                }
            },
            error: function () {
                console.log('Error al registrar o actualizar el artículo.');
                alert('Error al registrar o actualizar el artículo.'); // Error al hacer la solicitud
            }
        });
    });
});
