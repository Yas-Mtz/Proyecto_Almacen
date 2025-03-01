/**
 * Función que se ejecuta cuando el DOM está completamente cargado.
 */
$(document).ready(function () {

    /**
     * Deshabilita los campos de entrada para el nombre y la descripción del artículo.
     */
    function deshabilitarCampos() {
        $('#nombre_articulo, #id_descripcion_articulo').prop('disabled', true);
    }

    /**
     * Habilita los campos de entrada para el nombre, la descripción y el estatus del artículo.
     */
    function habilitarCampos() {
        $('#nombre_articulo, #id_descripcion_articulo, #id_estatus').prop('disabled', false);
    }

    // Llama a la función para deshabilitar los campos cuando la página se carga
    deshabilitarCampos();

    /**
     * Manejador de eventos para el evento de cambio en el campo de entrada del ID del artículo.
     * Obtiene los datos del artículo basado en el ID del artículo seleccionado.
     */
    $('#id_articulo').on('change', function () {
        var id_articulo = $(this).val();  // Obtener el valor del ID del artículo
        console.log('ID del artículo seleccionado:', id_articulo);

        if (id_articulo) {
            $.ajax({
                url: '/GestiondeProductos/',  // URL correcta para la consulta
                method: 'GET',
                data: { 'id_articulo': id_articulo },
                success: function (response) {
                    console.log('Respuesta del servidor:', response);

                    if (response.status === 'success') {
                        // Llenar los campos con la información obtenida
                        $('#nombre_articulo').val(response.nombre_articulo);
                        $('#id_descripcion_articulo').val(response.descripcion_articulo);
                        $('#cantidad_articulo').val('');  // Dejar vacío para que el usuario ingrese la cantidad adicional
                        $('#id_estatus').val(response.id_estatus);

                        // Deshabilitar todos los campos excepto "cantidad"
                        deshabilitarCampos();
                        $('#cantidad_articulo').prop('disabled', false);  // Habilitar solo la cantidad

                        // Cambiar la acción a 'update' si el artículo existe
                        $('input[name="action"]').val('update');

                        // Mostrar el código QR
                        if (response.qr_url) {
                            $('#qr-image').attr('src', response.qr_url).show();  // Mostrar el QR
                        }

                    } else {
                        // Si el artículo no existe, permitir ingreso normal
                        habilitarCampos();
                        $('#cantidad_articulo').prop('disabled', false);
                        $('input[name="action"]').val('add');
                    }
                },
                error: function () {
                    console.log('Error al consultar el artículo.');
                    alert('Error al consultar el artículo.');
                }
            });
        } else {
            // Si no se selecciona un artículo, permitir el ingreso de un nuevo producto
            $('#nombre_articulo, #id_descripcion_articulo, #cantidad_articulo, #id_estatus').val('');
            $('#id_qr_articulo').val('');
            habilitarCampos(); // Permitir la edición de un nuevo producto
            $('input[name="action"]').val('add');
        }
    });

    /**
     * Manejador de eventos para el evento de clic en el botón de guardar.
     * Registra o actualiza un artículo basado en los datos del formulario.
     */
    $('#btn-guardar').on('click', function (event) {
        event.preventDefault();  // Prevenir el envío del formulario de forma predeterminada

        var data = {
            id_articulo: $('#id_articulo').val(),
            nombre_articulo: $('#nombre_articulo').val(),
            descripcion_articulo: $('#id_descripcion_articulo').val(),
            cantidad_articulo: $('#cantidad_articulo').val(),  // Esta cantidad se sumará si el artículo ya existe
            id_estatus: $('#id_estatus').val(),
            qr_articulo: $('#id_qr_articulo').val(),
            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
            action: $('input[name="action"]').val()  // 'add' o 'update'
        };

        console.log('Datos a enviar:', data);

        // Verificar que todos los campos estén completos antes de enviar los datos
        if (!data.id_articulo || !data.nombre_articulo || !data.descripcion_articulo || !data.cantidad_articulo || !data.id_estatus) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        // Enviar los datos al servidor usando AJAX
        $.ajax({
            url: '/GestiondeProductos/',  // Asegúrate de que la URL sea correcta
            method: 'POST',
            data: data,
            success: function (response) {
                console.log('Respuesta del servidor al guardar:', response);
                if (response.status === 'success') {
                    alert(response.message);

                    // Limpiar los campos después de guardar
                    $('#id_articulo').val('');
                    $('#nombre_articulo').val('');
                    $('#id_descripcion_articulo').val('');
                    $('#cantidad_articulo').val('');
                    $('#id_estatus').val('');
                    $('#id_qr_articulo').val('');

                    // Deshabilitar nuevamente los campos después de guardar
                    deshabilitarCampos();
                    $('input[name="action"]').val('add');
                } else {
                    alert(response.message);
                }
            },
            error: function () {
                console.log('Error al registrar o actualizar el artículo.');
                alert('Error al registrar o actualizar el artículo.');
            }
        });
    });

    /**
     * Manejador de eventos para el evento de clic en el botón "Generar QR".
     * Genera un código QR para el artículo seleccionado.
     */
    $('#btn-generar-qr').on('click', function () {
        var idArticulo = $('#id_articulo').val();  // Obtener el ID del artículo

        // Realizar la petición AJAX para obtener el QR
        $.ajax({
            url: '/GestiondeProductos/',  // Asegúrate de que sea la URL correcta
            type: 'GET',
            data: { id_articulo: idArticulo },
            success: function (response) {
                if (response.status === 'success') {
                    // Mostrar la imagen del QR
                    $('#qr-image').attr('src', response.qr_url).show();
                } else {
                    alert('Error al generar el QR: ' + response.message);
                }
            },
            error: function () {
                alert('Error al comunicarse con el servidor.');
            }
        });
    });

});
