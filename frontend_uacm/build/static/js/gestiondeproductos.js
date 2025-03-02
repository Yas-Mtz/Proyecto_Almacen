$(document).ready(function () {
    let cantidadActual = 0; // Variable para almacenar la cantidad actual del producto

    function actualizarQR(id, nombre) {
        if (id && nombre) {
            console.log('ID del artículo seleccionado:', id);
            console.log('Nombre del artículo seleccionado:', nombre);

            const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(nombre)}`;
            console.log('URL del QR:', url);

            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    console.log('Imagen QR recibida');
                    const qrImageUrl = URL.createObjectURL(blob);
                    $('#qr-image').attr('src', qrImageUrl).show();
                    
                    $('#download-btn').off('click').on('click', function () {
                        const a = document.createElement('a');
                        a.href = qrImageUrl;
                        a.download = `QR_${id}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                })
                .catch(error => {
                    console.error('Error al generar el QR:', error);
                });
        }
    }

    $('#edit-btn').on('click', function () {
        var id_articulo = $('#buscar').val();
        console.log('ID del artículo seleccionado:', id_articulo);

        if (id_articulo) {
            $.ajax({
                url: '/GestiondeProductos/',  
                method: 'GET',
                data: { 'id_articulo': id_articulo },
                success: function (response) {
                    console.log('Respuesta del servidor:', response);

                    if (response.status === 'success') {
                        $('#id_articulo').val(id_articulo);
                        $('#nom_articulo').val(response.nombre_articulo);
                        $('#descripcion_articulo').val(response.descripcion_articulo);
                        $('#estatus').val(response.id_estatus);
                        $('#id_estatus').val(response.id_estatus);

                        // Guardamos la cantidad actual del artículo
                        cantidadActual = parseInt(response.cantidad_articulo) || 0;
                        $('#cantidad_actual').text(`Cantidad actual: ${cantidadActual}`); // Mostrar cantidad actual en una etiqueta

                        $('input[name="action"]').val('update');
                        actualizarQR(id_articulo, response.nombre_articulo);
                        alert(response.message);
                    } else {
                        $('#cantidad_articulo').prop('disabled', false);
                        $('input[name="action"]').val('add');
                        alert(response.message);
                    }
                },
                error: function () {
                    console.log('Error al consultar el artículo.');
                    alert('Error al consultar el artículo.');
                }
            });
        } else {
            $('#nom_articulo, #descripcion_articulo, #cantidad_articulo, #id_estatus').val('');
            $('#qr-image').attr('src', '').hide();
            $('input[name="action"]').val('add');
        }
    });

    $('#btn-guardar').on('click', function (event) {
        event.preventDefault();
        console.log("Valor de nom_articulo antes de enviar:", $('#nom_articulo').val());

        let nuevaCantidad = parseInt($('#cantidad_articulo').val()) || 0;
        let totalCantidad = cantidadActual + nuevaCantidad; // Sumar cantidad actual + nueva

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

        if (!data.id_articulo || !data.nom_articulo || !data.descripcion_articulo || !data.cantidad_articulo || !data.id_estatus) {
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
                    alert(response.message);
                    actualizarQR(data.id_articulo, data.nom_articulo);
                    $('#nom_articulo').val('');
                    $('#descripcion_articulo').val('');
                    $('#cantidad_articulo').val('');
                    $('#id_estatus').val('');
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
});
