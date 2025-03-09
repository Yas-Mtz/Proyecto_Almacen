$.ajax({
    type: 'POST',
    url: '/generar-reporte/',  // Corregido
    data: {
        'opcion': opcion,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'csrfmiddlewaretoken': $('input[name="csrfmiddlewaretoken"]').val()
    },
    success: function (response) {
        if (response.mensaje) {
            alert(response.mensaje);
        } else {
            alert('No se encontraron datos para el reporte');
        }
    },
    error: function (error) {
        alert('Error al generar el reporte: ' + error.responseText);
    }
});
