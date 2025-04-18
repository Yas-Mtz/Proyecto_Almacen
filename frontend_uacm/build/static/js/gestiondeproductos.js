$(document).ready(function () {
    let searchTimeout = null;
    let nuevaImagenSeleccionada = false; // ← Bandera para verificar si hay nueva imagen

    function actualizarQR(id, nombre) {
        if (id && nombre) {
            const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(nombre)}`;
            
            $('#loader').show();
            $('#qr-id').text(id);
            $('#qr-nombre').text(nombre);
            $('#qr-cantidad').text($('#cantidad').val() || '----');
            
            $('#qr-placeholder').hide();
            $('#qr-image').attr('src', url).show();
            $('#download-btn').prop('disabled', false);

            $('#download-btn').off('click').on('click', function() {
                const a = document.createElement('a');
                a.href = url;
                a.download = `QR_${id}_${nombre.replace(/\s+/g, '_')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            $('#qr-image').on('load', function() {
                $('#loader').hide();
            });
        }
    }

    function limpiarQRInfo() {
        $('#qr-id').text('----');
        $('#qr-nombre').text('----');
        $('#qr-cantidad').text('----');
        $('#qr-image').hide();
        $('#qr-placeholder').show();
        $('#download-btn').prop('disabled', true);
    }

    function validarFormulario() {
        let isValid = true;
        $('.error').removeClass('error');
        
        const requiredFields = [
            '#id_producto', '#nombre_producto', 
            '#cantidad', '#stock_minimo', '#id_estatus',
            '#id_categoria', '#id_marca', '#id_unidad'
        ];

        requiredFields.forEach(field => {
            const $field = $(field);
            if (!$field.val()) {
                isValid = false;
                $field.addClass('error');
                $field.closest('.form-group').find('.help-block').remove();
                $field.after('<span class="help-block text-danger">Este campo es requerido</span>');
            }
        });

        const cantidad = parseInt($('#cantidad').val());
        const stockMinimo = parseInt($('#stock_minimo').val());

        if (isNaN(cantidad)) {
            $('#cantidad').addClass('error');
            $('#cantidad').after('<span class="help-block text-danger">Debe ser un número válido</span>');
            isValid = false;
        }

        if (isNaN(stockMinimo)) {
            $('#stock_minimo').addClass('error');
            $('#stock_minimo').after('<span class="help-block text-danger">Debe ser un número válido</span>');
            isValid = false;
        }

        return isValid;
    }

    function cargarDatosProducto(producto) {
        $('#id_producto').val(producto.id_producto).prop('readonly', true);
        $('#nombre_producto').val(producto.nombre_producto);
        $('#descripcion_producto').val(producto.descripcion_producto);
        $('#cantidad').val(producto.cantidad);
        $('#stock_minimo').val(producto.stock_minimo);
        $('#observaciones').val(producto.observaciones);
        
        $('#id_estatus').val(producto.id_estatus);
        $('#id_categoria').val(producto.id_categoria);
        $('#id_marca').val(producto.id_marca);
        $('#id_unidad').val(producto.id_unidad);
        
        if (producto.imagen_url) {
            $('#preview-image').attr('src', producto.imagen_url).show();
            $('#image-preview').show();
            $('#file-name').text(producto.imagen_nombre || 'Imagen del producto');
        } else {
            $('#preview-image').attr('src', '').hide();
            $('#image-preview').hide();
            $('#file-name').text('No hay imagen');
        }

        $('input[name="action"]').val('update');
        $('#btn-guardar').html('<i class="fas fa-save"></i> Actualizar Producto');

        actualizarQR(producto.id_producto, producto.nombre_producto);
        nuevaImagenSeleccionada = false; // ← Al cargar, no hay nueva imagen
    }

    $('#search-btn').on('click', function(e) {
        e.preventDefault();
        const id_producto = $('#buscar').val().trim();
        
        if (!id_producto) {
            alert('Por favor ingrese un ID de producto');
            return;
        }

        if (!/^\d+$/.test(id_producto)) {
            alert('El ID de producto debe ser un número');
            return;
        }

        $('#loader').show();

        $.ajax({
            url: '/GestiondeProductos/',
            method: 'GET',
            data: { 'buscar': id_producto },
            success: function(response) {
                if (response.status === 'success') {
                    cargarDatosProducto(response);
                } else {
                    alert(response.message || 'Producto no encontrado');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error al consultar el producto:', error);
                alert('Error al consultar el producto');
            },
            complete: function() {
                $('#loader').hide();
            }
        });
    });

    $('#btn-guardar').on('click', function(event) {
        event.preventDefault();
        
        if (!validarFormulario()) {
            return;
        }
    
        const formData = new FormData();
        formData.append('id_producto', $('#id_producto').val());
        formData.append('nombre_producto', $('#nombre_producto').val());
        formData.append('descripcion_producto', $('#descripcion_producto').val());
        formData.append('cantidad', $('#cantidad').val());
        formData.append('stock_minimo', $('#stock_minimo').val());
        formData.append('id_estatus', $('#id_estatus').val());
        formData.append('id_categoria', $('#id_categoria').val());
        formData.append('id_marca', $('#id_marca').val());
        formData.append('id_unidad', $('#id_unidad').val());
        formData.append('observaciones', $('#observaciones').val());
        formData.append('action', $('input[name="action"]').val());
        formData.append('csrfmiddlewaretoken', $('input[name="csrfmiddlewaretoken"]').val());
    
        if (nuevaImagenSeleccionada) {
            const imagenInput = $('#imagen_producto')[0];
            if (imagenInput.files.length > 0) {
                formData.append('imagen_producto', imagenInput.files[0]);
            }
        }
    
        $('#loader').show();
    
        $.ajax({
            url: '/GestiondeProductos/',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: response.message,
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            location.reload();
                        }
                    });
                } else {
                    alert(response.message || 'Error al guardar el producto');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                alert('Error al comunicarse con el servidor');
            },
            complete: function() {
                $('#loader').hide();
            }
        });
    });

    $('#generate-qr-btn').on('click', function(e) {
        e.preventDefault();
        const id = $('#id_producto').val();
        const nombre = $('#nombre_producto').val();

        if (!id || !nombre) {
            alert('Por favor ingrese al menos el ID y nombre del producto');
            return;
        }

        actualizarQR(id, nombre);
    });

    $('#imagen_producto').on('change', function() {
        const file = this.files[0];
        if (file) {
            nuevaImagenSeleccionada = true;
            $('#file-name').text(file.name);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#preview-image').attr('src', e.target.result).show();
                $('#image-preview').show();
            }
            reader.readAsDataURL(file);
        } else {
            nuevaImagenSeleccionada = false;
            $('#preview-image').attr('src', '').hide();
            $('#image-preview').hide();
            $('#file-name').text('No se seleccionó archivo');
        }
    });

    $('#btn-nuevo').on('click', function() {
        $('form')[0].reset();
        $('#id_producto').val('').prop('readonly', false);
        $('#descripcion_producto').val('');
        $('input[name="action"]').val('add');
        $('#btn-guardar').html('<i class="fas fa-save"></i> Guardar Producto');
        $('#preview-image').attr('src', '').hide();
        $('#image-preview').hide();
        $('#file-name').text('No se seleccionó archivo');
        $('.error').removeClass('error');
        $('.help-block').remove();
        limpiarQRInfo();
        nuevaImagenSeleccionada = false;
    });

    // Inicialización
    $('#id_producto').prop('readonly', true);
    $('#qr-image').hide();
    $('#image-preview').hide();
    limpiarQRInfo();
});
