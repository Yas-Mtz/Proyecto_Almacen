$(document).ready(function() {
    
    // Cuando cambia el ID del artículo, consultamos los datos del artículo
    $('#id_articulo').on('change', function() {
        var id_articulo = $(this).val();  // Obtener el valor del ID del artículo
        console.log('ID del artículo seleccionado:', id_articulo);  // Verificar el ID seleccionado
        
        if (id_articulo) {
            $.ajax({
                url: '/GestiondeProductos/',   // Cambiar la URL si es necesario
                method: 'GET',
                data: { 'id_articulo': id_articulo },
                success: function(response) { // Llenar los datos en el formulario
                    console.log('Respuesta del servidor:', response);  // Verificar respuesta del servidor
                    
                    if (response.status === 'success') {
                        $('#nombre_articulo').val(response.nombre_articulo);  
                        $('#id_descripcion_articulo').val(response.descripcion_articulo);  
                        $('#cantidad_articulo').val(response.cantidad_articulo);  
                        $('#id_estatus').val(response.id_estatus);  

                        // Cambiar la acción a 'update' si el artículo existe
                        $('input[name="action"]').val('update');
                    } else {
                        alert(response.message);  // Mostrar mensaje de error si el artículo no se encuentra
                    }
                },
                error: function() {
                    console.log('Error al consultar el artículo.');  // Mostrar error si la consulta falla
                    alert('Error al consultar el artículo.');
                }
            });
        } else {
            // Si no se selecciona un artículo, restablecer el formulario
            $('#nombre_articulo').val('');
            $('#id_descripcion_articulo').val('');
            $('#cantidad_articulo').val('');
            $('#id_estatus').val('');
            $('#id_qr_articulo').val('');
            
            // Cambiar la acción de nuevo a 'add' si no hay ID
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
            cantidad_articulo: $('#cantidad_articulo').val(),
            id_estatus: $('#id_estatus').val(),
            qr_articulo: $('#id_qr_articulo').val(),  // Si lo implementas en el formulario
            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val(),
            action: $('input[name="action"]').val()  // Capturamos la acción (add o update)
        };

        console.log('Datos a enviar:', data);  // Verificar los datos que se enviarán al servidor
        
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
                console.log('Respuesta del servidor al guardar:', response);  // Verificar respuesta del servidor
                if (response.status === 'success') {
                    alert(response.message);
                    
                    // Limpiar los campos después de guardar
                    $('#id_articulo').val('');
                    $('#nombre_articulo').val('');
                    $('#id_descripcion_articulo').val('');
                    $('#cantidad_articulo').val('');
                    $('#id_estatus').val('');
                    $('#id_qr_articulo').val('');  

                    // Cambiar la acción de vuelta a 'add' para nuevos artículos
                    $('input[name="action"]').val('add');
                } else {
                    alert(response.message);  // Mostrar mensaje de error
                }
            },
            error: function() {
                console.log('Error al registrar o actualizar el artículo.');  // Verificar si hay errores en el envío
                alert('Error al registrar o actualizar el artículo.');
            }
        });
    });
    
});
