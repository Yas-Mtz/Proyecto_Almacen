$(document).ready(function () {
    // Constantes para los IDs de estatus
    const ESTATUS_ACTIVO = 1;
    const ESTATUS_INACTIVO = 2;

    /**
     * Actualiza la imagen del código QR temporal y la información relacionada con un producto.
     * @param {string} id - El identificador del producto.
     * @param {string} nombre - El nombre del producto.
     */
    function actualizarQR(id, nombre) {
        if (id && nombre) {
            console.log('ID del producto:', id);
            console.log('Nombre del producto:', nombre);

            const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(nombre)}`;
            console.log('URL del QR temporal:', url);

            $('#loader').show();
            $('#qr-id').text(id);
            $('#qr-nombre').text(nombre);
            $('#qr-cantidad').text($('#cantidad').val() || '----');
            
            $('#qr-placeholder').hide();
            $('#qr-image').attr('src', url).show();
            $('#download-btn').prop('disabled', false);

            $('#download-btn').off('click').on('click', function () {
                const a = document.createElement('a');
                a.href = url;
                a.download = `QR_${id}_${nombre.replace(/\s+/g, '_')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            $('#qr-image').on('load', function () {
                $('#loader').hide();
            });
        }
    }

    /**
     * Valida todos los campos requeridos del formulario
     * @returns {boolean} True si todos los campos son válidos, False si hay errores
     */
    function validarFormulario() {
        let isValid = true;
        $('.error').removeClass('error');
        
        // Campos requeridos
        const requiredFields = [
            '#id_producto', '#nombre_producto', '#descripcion_producto',
            '#cantidad', '#stock_minimo', '#id_estatus',
            '#id_categoria', '#id_marca', '#id_unidad'
        ];

        requiredFields.forEach(field => {
            const $field = $(field);
            if (!$field.val() || $field.val() === "") {
                isValid = false;
                $field.addClass('error');
                console.error(`Campo requerido faltante: ${field}`);
            }
        });

        // Validar valores numéricos
        const cantidad = parseInt($('#cantidad').val());
        const stockMinimo = parseInt($('#stock_minimo').val());

        if (isNaN(cantidad)) {
            $('#cantidad').addClass('error');
            isValid = false;
        }

        if (isNaN(stockMinimo)) {
            $('#stock_minimo').addClass('error');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Maneja el evento de clic en el botón de búsqueda.
     */
    $('#search-btn').on('click', function (e) {
        e.preventDefault();
        const id_producto = $('#buscar').val().trim();

        if (!id_producto) {
            alert('Por favor ingrese un ID de producto');
            return;
        }

        console.log('Buscando producto ID:', id_producto);
        $('#loader').show();

        $.ajax({
            url: '/GestiondeProductos/',
            method: 'GET',
            data: { 'buscar': id_producto },
            success: function (response) {
                console.log('Respuesta del servidor:', response);

                if (response.status === 'success') {
                    // Actualizar campos del formulario
                    $('#id_producto').val(response.id_producto);
                    $('#nombre_producto').val(response.nombre_producto);
                    $('#descripcion_producto').val(response.descripcion_producto);
                    $('#cantidad').val(response.cantidad);
                    $('#stock_minimo').val(response.stock_minimo);
                    $('#id_estatus').val(response.estatus);
                    $('#id_categoria').val(response.categoria);
                    $('#id_marca').val(response.marca);
                    $('#id_unidad').val(response.unidad);
                    $('#observaciones').val(response.observaciones);

                    // Cambiar a modo actualización
                    $('input[name="action"]').val('update');
                    $('#btn-guardar').html('<i class="fas fa-save"></i> Actualizar Producto');
                    $('#toggle-status-btn').show();

                    // Configurar botón de estado
                    const isActive = response.estatus == ESTATUS_ACTIVO;
                    $('#toggle-status-btn')
                        .toggleClass('btn-warning btn-success', !isActive)
                        .html(`<i class="fas fa-power-off"></i> ${isActive ? 'Desactivar' : 'Activar'} Producto`);

                    // Actualizar QR
                    actualizarQR(response.id_producto, response.nombre_producto);
                } else {
                    alert(response.message || 'Producto no encontrado');
                }
            },
            error: function (xhr, status, error) {
                console.error('Error al consultar el producto:', error);
                alert('Error al consultar el producto');
            },
            complete: function() {
                $('#loader').hide();
            }
        });
    });

    /**
     * Maneja el evento de clic en el botón 'Guardar' para guardar o actualizar un producto.
     */
    $('#btn-guardar').on('click', function (event) {
        event.preventDefault();
        
        // Validación básica de campos requeridos
        const requiredFields = [
            '#id_producto', '#nombre_producto', '#descripcion_producto',
            '#cantidad', '#stock_minimo', '#id_estatus',
            '#id_categoria', '#id_marca', '#id_unidad'
        ];
        
        let isValid = true;
        requiredFields.forEach(field => {
            if (!$(field).val()) {
                isValid = false;
                $(field).addClass('error');
                console.error(`Campo requerido faltante: ${field}`);
            } else {
                $(field).removeClass('error');
            }
        });
        
        if (!isValid) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }
    
        // Preparar FormData con todos los campos necesarios
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
    
        // Manejar la imagen si fue subida
        const imagenInput = $('#imagen_producto')[0];
        if (imagenInput.files.length > 0) {
            formData.append('imagen_producto', imagenInput.files[0]);
        }
    
        console.log('Enviando datos:', Object.fromEntries(formData));
        $('#loader').show();
    
        // Enviar datos al servidor
        $.ajax({
            url: '/GestiondeProductos/',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    alert(response.message);
                    // Actualizar interfaz según sea necesario
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

    /**
     * Maneja el cambio de estado del producto (Activar/Desactivar)
     */
    $('#toggle-status-btn').on('click', function() {
        const productId = $('#id_producto').val();
        if (!productId) return;

        const currentStatus = parseInt($('#id_estatus').val());
        const newStatus = currentStatus === ESTATUS_ACTIVO ? ESTATUS_INACTIVO : ESTATUS_ACTIVO;
        
        if (confirm(`¿Está seguro que desea ${newStatus === ESTATUS_ACTIVO ? 'activar' : 'desactivar'} este producto?`)) {
            $('#loader').show();
            
            $.ajax({
                url: '/GestiondeProductos/',
                method: 'GET',
                data: {
                    'cambiar_estatus': 1,
                    'producto_id': productId,
                    'nuevo_estatus': newStatus
                },
                success: function(response) {
                    if (response.status === 'success') {
                        $('#id_estatus').val(newStatus);
                        $('#toggle-status-btn')
                            .toggleClass('btn-warning btn-success')
                            .html(`<i class="fas fa-power-off"></i> ${newStatus === ESTATUS_ACTIVO ? 'Desactivar' : 'Activar'} Producto`);
                        alert(response.message);
                    } else {
                        alert(response.message || 'Error al cambiar el estado');
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error al cambiar estado:', error);
                    alert('Error al cambiar el estado del producto');
                },
                complete: function() {
                    $('#loader').hide();
                }
            });
        }
    });

    /**
     * Maneja el evento de clic en el botón 'Generar QR'
     */
    $('#generate-qr-btn').on('click', function (e) {
        e.preventDefault();
        const id = $('#id_producto').val();
        const nombre = $('#nombre_producto').val();

        if (!id || !nombre) {
            alert('Por favor ingrese al menos el ID y nombre del producto');
            return;
        }

        actualizarQR(id, nombre);
    });

    /**
     * Maneja el cambio en la imagen para mostrar vista previa
     */
    $('#imagen_producto').on('change', function() {
        const file = this.files[0];
        if (file) {
            $('#file-name').text(file.name);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#preview-image').attr('src', e.target.result);
                $('#image-preview').show();
            }
            reader.readAsDataURL(file);
        }
    });

    // Inicialización
    $('#toggle-status-btn').hide();
});