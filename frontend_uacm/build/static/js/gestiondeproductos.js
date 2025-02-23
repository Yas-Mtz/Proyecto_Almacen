$(document).ready(function() {
    
    // Deshabilitar los campos al cargar la página
    function deshabilitarCampos() {
        $('#nombre_articulo, #id_descripcion_articulo').prop('disabled', true);
    }

    function habilitarCampos() {
        $('#nombre_articulo, #id_descripcion_articulo, #id_estatus').prop('disabled', false);
    }

    // Llamamos a la función al cargar la página
    deshabilitarCampos();

    // Cuando cambia el ID del artículo, consultamos los datos del artículo
    $('#id_articulo').on('change', function() {
        var id_articulo = $(this).val();  // Obtener el valor del ID del artículo
        console.log('ID del artículo seleccionado:', id_articulo);
        
        if (id_articulo) {
            $.ajax({
                url: '/GestiondeProductos/',  // URL correcta para la consulta
                method: 'GET',
                data: { 'id_articulo': id_articulo },
                success: function(response) {
                    console.log('Respuesta del servidor:', response);
                    
                    if (response.status === 'success') {
                        // Llenar los campos con la información obtenida
                        $('#nombre_articulo').val(response.nombre_articulo);  
                        $('#id_descripcion_articulo').val(response.descripcion_articulo);  
                        $('#cantidad_articulo').val('');  // Se deja vacío para que el usuario ingrese la cantidad adicional
                        $('#id_estatus').val(response.id_estatus);  

                        // 🔹 Deshabilitar todos los campos excepto "cantidad"
                        deshabilitarCampos();
                        $('#cantidad_articulo').prop('disabled', false);  // Habilitar solo la cantidad

                        // Cambiar la acción a 'update' si el artículo existe
                        $('input[name="action"]').val('update');
                    } else {
                        // Si el artículo no existe, permitir ingreso normal
                        habilitarCampos();
                        $('#cantidad_articulo').prop('disabled', false);
                        $('input[name="action"]').val('add');
                    }
                },
                error: function() {
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

    // Evento on click para el botón Guardar (registrar o actualizar un artículo)
    $('#btn-guardar').on('click', function(event) {
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
            success: function(response) {
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
            error: function() {
                console.log('Error al registrar o actualizar el artículo.');
                alert('Error al registrar o actualizar el artículo.');
            }
        });
    });

});
