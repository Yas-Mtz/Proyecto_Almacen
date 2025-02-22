$(document).ready(function() {
    
    $('#id_articulo').on('change', function() {
        var id_articulo = $(this).val();  // Obtener el valor del ID del artículo
        
        if (id_articulo) {
            $.ajax({
                url: '/GestiondeProductos/',   // cambio realizado en url
                method: 'GET',
                data: { 'id_articulo': id_articulo },
                success: function(response) {// llenar datos
                    if (response.status === 'success') {
                        $('#nombre_articulo').val(response.nombre_articulo);  
                        $('#id_descripcion_articulo').val(response.descripcion_articulo);  
                        $('#cantidad_articulo').val(response.cantidad_articulo);  
                        $('#id_estatus').val(response.id_estatus);  
                    } else {
                        alert(response.message);  // Mostrar mensaje de error si el artículo no se encuentra
                    }
                },
                error: function() {
                    alert('Error al consultar el artículo.');
                }
            });
        }
    });

    // evento on click Guardar (registrar o actualizar un artículo)
    $('#btn-guardar').on('click', function(event) {
        event.preventDefault();  

        var data = {
            id_articulo: $('#id_articulo').val(),
            nombre_articulo: $('#nombre_articulo').val(),
            descripcion_articulo: $('#id_descripcion_articulo').val(),
            cantidad_articulo: $('#cantidad_articulo').val(),
            id_estatus: $('#id_estatus').val(),
            qr_articulo: $('#id_qr_articulo').val(),  // no implementado
            csrfmiddlewaretoken: $('input[name="csrfmiddlewaretoken"]').val()
        };

        // Enviar los datos al servidor usando AJAX
        $.ajax({
            url: '/GestiondeProductos/',  
            method: 'POST',
            data: data,
            success: function(response) {
                if (response.status === 'success') {
                    alert(response.message);
                    // Limpiar los campos 
                    $('#id_articulo').val('');
                    $('#nombre_articulo').val('');
                    $('#id_descripcion_articulo').val('');
                    $('#cantidad_articulo').val('');
                    $('#id_estatus').val('');
                    $('#id_qr_articulo').val('');  
                } else {
                    alert(response.message);
                }
            },
            error: function() {
                alert('Error al registrar o actualizar el artículo.');
            }
        });
    });

    
});
