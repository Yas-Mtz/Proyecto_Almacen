$(document).ready(function () {
    $('form').on('submit', function (e) {
      e.preventDefault();
  
      var opcion = $('#opcion').val();
      var fecha_inicio = $('#fecha_inicio').val();
      var fecha_fin = $('#fecha_fin').val();
  
      $.ajax({
        type: 'POST',
        url: '/Reportes/generar-reporte/',  
        data: {
          'opcion': opcion,
          'fecha_inicio': fecha_inicio,
          'fecha_fin': fecha_fin,
          'csrfmiddlewaretoken': $('input[name="csrfmiddlewaretoken"]').val()
        },
        success: function (response) {
          if (response.resultados) {
            var tableBody = $('#resultados-tabla tbody');
            tableBody.empty();  // Limpiar la tabla 
  
            response.resultados.forEach(function (item) {
              var row = '<tr>';
              item.forEach(function (col) {
                row += '<td>' + col + '</td>';
              });
              row += '</tr>';
              tableBody.append(row);
            });
          } else {
            alert('No se encontraron datos para el reporte');
          }
        },
        error: function (error) {
          alert('Error al generar el reporte: ' + error.responseText);
        }
      });
    });
  });
  