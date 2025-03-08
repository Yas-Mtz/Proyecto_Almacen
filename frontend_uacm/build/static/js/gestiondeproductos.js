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

                    // Ocultar el loader después de un retraso
                    setTimeout(function () {
                        $('#loader').hide(); // Oculta el loader después de 2 segundos
                    }, 2000);

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
                    $('#loader').hide(); // Ocultar el loader en caso de error
                });
        }
    }

    /**
     * Maneja el evento de clic en el botón 'edit-btn'. 
     * Obtiene la información del producto y actualiza los campos del formulario y la imagen del QR.
     */
    $('#edit-btn').on('click', function () {
        var id_articulo = $('#buscar').val(); // Obtener el ID del artículo desde el input 'buscar'
        console.log('ID del artículo seleccionado:', id_articulo);

        if (id_articulo) {
            // Mostrar el loader mientras se realiza la solicitud
            $('#loader').show(); // Muestra el loader

            // Realizar una solicitud AJAX para obtener los datos del producto
            $.ajax({
                url: '/GestiondeProductos/', // URL de la solicitud
                method: 'GET',
                data: { 'id_articulo': id_articulo }, // Datos a enviar en la solicitud
                success: function (response) {
                    console.log('Respuesta del servidor:', response);

                    if (response.status === 'success') {
                        $('#id_articulo').val(id_articulo);
                        $('#nom_articulo').val(response.nombre_articulo);
                        $('#descripcion_articulo').val(response.descripcion_articulo);
                        $('#estatus').val(response.id_estatus); // Esto debería funcionar correctamente
                        $('#id_estatus').val(response.id_estatus);
                        $('input[name="action"]').val('update');
                        actualizarQR(id_articulo, response.nombre_articulo);
                        alert(response.message); // Muestra el mensaje de éxito como alerta
                    } else {
                        $('#cantidad_articulo').prop('disabled', false);
                        $('input[name="action"]').val('add');
                        alert(response.message); // Muestra el mensaje de error como alerta
                    }

                    // Ocultar el loader después de la respuesta con retraso
                    setTimeout(function () {
                        $('#loader').hide(); // Oculta el loader después de 2 segundos
                    }, 2000);
                },
                error: function () {
                    console.log('Error al consultar el artículo.');
                    alert('Error al consultar el artículo.');

                    // Ocultar el loader en caso de error
                    $('#loader').hide();
                }
            });
        } else {
            $('#nom_articulo, #descripcion_articulo, #cantidad_articulo, #id_estatus').val('');
            $('#qr-image').attr('src', '').hide();
            $('input[name="action"]').val('add');
        }
    });

    /**
     * Maneja el evento de clic en el botón 'btn-guardar' para guardar o actualizar un artículo.
     */
    $('#btn-guardar').on('click', function (event) {
        event.preventDefault();
        console.log("Valor de nom_articulo antes de enviar:", $('#nom_articulo').val());

        // Obtener el valor de cantidad y convertirlo a entero
        var cantidad = parseInt($('#cantidad_articulo').val(), 10);
        
        // Verificación de la cantidad para asegurarse de que sea un número entero válido y no negativo
        if (isNaN(cantidad) || cantidad < 0) {
            alert("La cantidad debe ser un número entero válido.");
            return;
        }

        var data = {
            id_articulo: $('#id_articulo').val(),
            nom_articulo: $('#nom_articulo').val(),
            descripcion_articulo: $('#descripcion_articulo').val(),
            id_estatus: $('#estatus').val(),
            cantidad_articulo: cantidad, // Agregar la cantidad a los datos
            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
            action: $('input[name="action"]').val()
        };

        console.log('Datos a enviar:', data);

        // Verificar que todos los campos estén completos
        if (!data.id_articulo || !data.nom_articulo || !data.descripcion_articulo || !data.id_estatus || isNaN(data.cantidad_articulo)) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        $.ajax({
            url: '/GestiondeProductos/',
            method: 'POST',
            data: data,
            success: function (response) {
                console.log('Respuesta del servidor al guardar:', response);

                if (response.status === 'success') {
                    alert(response.message); // Muestra el mensaje de éxito como alerta
                    actualizarQR(data.id_articulo, data.nom_articulo);
                    $('#nom_articulo, #descripcion_articulo, #cantidad_articulo').val(''); // Limpiar campos
                    $('#qr-image').attr('src', '').hide(); // Limpiar la imagen QR
                    $('input[name="action"]').val('add'); // Preparar para una nueva adición
                    $('#estatus').val(''); // Limpiar el campo de estatus
                } else {
                    alert(response.message); // Muestra el mensaje de error como alerta
                }
            },
            error: function () {
                console.log('Error al registrar o actualizar el artículo.');
                alert('Error al registrar o actualizar el artículo.');
            }
        });
    });

    /**
     * Maneja el evento de clic en el botón 'generate-qr-btn' para generar el QR.
     */
    $('#generate-qr-btn').on('click', function () {
        var data = {
            id_articulo: $('#id_articulo').val(),
            nom_articulo: $('#nom_articulo').val(),
            descripcion_articulo: $('#descripcion_articulo').val(),
            id_estatus: $('#estatus').val(), // Utiliza el campo correcto para obtener el valor de id_estatus
        };

        console.log('Datos a enviar:', data);

        // Validar que los campos no estén vacíos
        if (!data.id_articulo || !data.nom_articulo || !data.descripcion_articulo || !data.id_estatus) {
            alert("Por favor, ingresa los datos solicitados antes de generar el QR");
            return;
        }

        // Mostrar el loader mientras se genera el QR
        $('#loader').show(); // Muestra el loader

        // Actualizar la descripción en la sección del QR
        $('#qr-id').text(data.id_articulo); // Usa el valor correcto de 'data'
        $('#qr-nombre').text(data.nom_articulo); // Usa el valor correcto de 'data'

        // Llamar a la función para generar y mostrar el QR
        actualizarQR(data.id_articulo, data.nom_articulo);

        // Ocultar el loader después de un retraso
        setTimeout(function () {
            $('#loader').hide(); // Oculta el loader después de 2 segundos
        }, 100);
    });
});
