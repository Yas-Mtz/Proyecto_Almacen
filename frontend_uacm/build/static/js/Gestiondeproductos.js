$(document).ready(function () {
  let searchTimeout = null;
  let nuevaImagenSeleccionada = false;
  let cantidadActualBD = 0;

  function actualizarQR(id, nombre) {
    if (id && nombre) {
      const url = `/GestiondeProductos/generar_qr/?id=${id}&nombre=${encodeURIComponent(
        nombre
      )}`;

      $("#loader").show();
      $("#qr-id").text(id);
      $("#qr-nombre").text(nombre);
      $("#qr-cantidad").text(cantidadActualBD || "----");

      $("#qr-placeholder").hide();
      $("#qr-image").attr("src", url).show();
      $("#download-btn").prop("disabled", false);

      $("#download-btn")
        .off("click")
        .on("click", function () {
          const a = document.createElement("a");
          a.href = url;
          a.download = `QR_${id}_${nombre.replace(/\s+/g, "_")}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });

      $("#qr-image").one("load", function () {
        $("#loader").hide();
      });
    }
  }

  function limpiarQRInfo() {
    $("#qr-id").text("----");
    $("#qr-nombre").text("----");
    $("#qr-cantidad").text("----");
    $("#qr-image").hide();
    $("#qr-placeholder").show();
    $("#download-btn").prop("disabled", true);
  }

  function validarFormulario() {
    let isValid = true;
    $(".error").removeClass("error");
    $(".help-block").remove();

    const requiredFields = [
      "#id_producto",
      "#nombre_producto",
      "#cantidad",
      "#stock_minimo",
      "#id_estatus",
      "#id_categoria",
      "#id_marca",
      "#id_unidad",
    ];

    requiredFields.forEach((field) => {
      const $field = $(field);
      if (!$field.val()) {
        isValid = false;
        $field.addClass("error");
        $field.closest(".form-group").find(".help-block").remove();
        $field.after(
          '<span class="help-block text-danger">Este campo es requerido</span>'
        );
      }
    });

    const cantidad = parseInt($("#cantidad").val());
    const stockMinimo = parseInt($("#stock_minimo").val());

    if (isNaN(cantidad) || cantidad < 0) {
      $("#cantidad")
        .addClass("error")
        .after(
          '<span class="help-block text-danger">Debe ser un número válido y no negativo</span>'
        );
      isValid = false;
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
      $("#stock_minimo")
        .addClass("error")
        .after(
          '<span class="help-block text-danger">Debe ser un número válido y no negativo</span>'
        );
      isValid = false;
    }

    if (!isValid) {
      Swal.fire({
        icon: "error",
        title: "Formulario incompleto o con errores",
        text: "Por favor, complete todos los campos requeridos correctamente.",
      });
    }

    return isValid;
  }

  function cargarDatosProducto(producto) {
    $("#id_producto").val(producto.id_producto).prop("readonly", true);
    $("#nombre_producto").val(producto.nombre_producto);
    $("#descripcion_producto").val(producto.descripcion_producto);
    $("#cantidad").val(""); // Dejar vacío para sumar nuevas existencias
    cantidadActualBD = parseInt(producto.cantidad) || 0;
    $("#stock_minimo").val(producto.stock_minimo);
    $("#observaciones").val(producto.observaciones);

    $("#id_estatus").val(producto.id_estatus);
    $("#id_categoria").val(producto.id_categoria);
    $("#id_marca").val(producto.id_marca);
    $("#id_unidad").val(producto.id_unidad);

    if (producto.imagen_url) {
      $("#preview-image").attr("src", producto.imagen_url).show();
      $("#image-preview").hide();
      $("#file-name").text(producto.imagen_nombre || "Imagen del producto");
    } else {
      $("#preview-image").attr("src", "").hide();
      $("#image-preview").hide();
      $("#file-name").text("No hay imagen");
    }

    $('input[name="action"]').val("update");
    $("#btn-guardar").html('<i class="fas fa-save"></i> Actualizar Producto');

    actualizarQR(producto.id_producto, producto.nombre_producto);
    nuevaImagenSeleccionada = false;
  }

  $("#search-btn").on("click", function (e) {
    e.preventDefault();
    const id_producto = $("#buscar").val().trim();

    if (!id_producto || !/^\d+$/.test(id_producto)) {
      Swal.fire({
        icon: "warning",
        title: "Búsqueda inválida",
        text: "Por favor, ingresa un ID de producto válido (solo números).",
      });
      return;
    }

    $("#loader").show();

    $.ajax({
      url: "/GestiondeProductos/",
      method: "GET",
      data: { buscar: id_producto },
      success: function (response) {
        if (response.status === "success") {
          cargarDatosProducto(response);
        } else {
          Swal.fire({
            icon: "info",
            title: "Producto no encontrado",
            text: "No se encontró ningún producto con ese ID.",
          });
        }
      },
      error: function () {
        Swal.fire({
          icon: "error",
          title: "Error en la búsqueda",
          text: "Ocurrió un error al buscar el producto.",
        });
      },
      complete: function () {
        $("#loader").hide();
      },
    });
  });

  $("#btn-guardar").on("click", function (event) {
    event.preventDefault();

    if (!validarFormulario()) return;

    const cantidadAAgregar = parseInt($("#cantidad").val()) || 0;
    const nuevaCantidad = cantidadActualBD + cantidadAAgregar;

    const formData = new FormData();
    formData.append("id_producto", $("#id_producto").val());
    formData.append("nombre_producto", $("#nombre_producto").val());
    formData.append("descripcion_producto", $("#descripcion_producto").val());
    formData.append("cantidad", nuevaCantidad);
    formData.append("stock_minimo", $("#stock_minimo").val());
    formData.append("id_estatus", $("#id_estatus").val());
    formData.append("id_categoria", $("#id_categoria").val());
    formData.append("id_marca", $("#id_marca").val());
    formData.append("id_unidad", $("#id_unidad").val());
    formData.append("observaciones", $("#observaciones").val());
    formData.append("action", $('input[name="action"]').val());
    formData.append(
      "csrfmiddlewaretoken",
      $('input[name="csrfmiddlewaretoken"]').val()
    );

    if (nuevaImagenSeleccionada) {
      const imagenInput = $("#imagen_producto")[0];
      if (imagenInput.files.length > 0) {
        formData.append("imagen_producto", imagenInput.files[0]);
      }
    }

    $("#loader").show();

    $.ajax({
      url: "/GestiondeProductos/",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        if (response.success) {
          cantidadActualBD = nuevaCantidad;
          $("#cantidad").val("");
          actualizarQR($("#id_producto").val(), $("#nombre_producto").val());

          Swal.fire({
            icon: "success",
            title: "Producto guardado",
            text: "El producto se guardó correctamente.",
          }).then(() => {
            location.reload();
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Hubo un problema al guardar el producto.",
          });
        }
      },
      error: function () {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrió un error en la solicitud al servidor.",
        });
      },
      complete: function () {
        $("#loader").hide();
      },
    });
  });

  $("#generate-qr-btn").on("click", function (e) {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    const id = $("#id_producto").val().trim();
    const nombre = $("#nombre_producto").val().trim();

    actualizarQR(id, nombre);
  });

  $("#imagen_producto").on("change", function () {
    const file = this.files[0];
    if (file) {
      nuevaImagenSeleccionada = true;
      $("#file-name").text(file.name);

      const reader = new FileReader();
      reader.onload = function (e) {
        $("#preview-image").attr("src", e.target.result).show();
        $("#image-preview").show();
      };
      reader.readAsDataURL(file);
    } else {
      nuevaImagenSeleccionada = false;
      $("#preview-image").attr("src", "").hide();
      $("#image-preview").hide();
      $("#file-name").text("No se seleccionó archivo");
    }
  });

  $("#btn-nuevo").on("click", function () {
    $("form")[0].reset();
    $("#id_producto").val("").prop("readonly", false);
    $("#descripcion_producto").val("");
    $('input[name="action"]').val("add");
    $("#btn-guardar").html('<i class="fas fa-save"></i> Guardar Producto');
    $("#preview-image").attr("src", "").hide();
    $("#image-preview").hide();
    $("#file-name").text("No se seleccionó archivo");
    $(".error").removeClass("error");
    $(".help-block").remove();
    limpiarQRInfo();
    nuevaImagenSeleccionada = false;
    cantidadActualBD = 0;
  });

  $("#btn-incrementar").on("click", function () {
    let cantidad = parseInt($("#cantidad").val()) || 0;
    $("#cantidad").val(cantidad + 1);
  });

  $("#btn-decrementar").on("click", function () {
    let cantidad = parseInt($("#cantidad").val()) || 0;
    if (cantidad > 0) {
      $("#cantidad").val(cantidad - 1);
    }
  });

  $("#adjust-stock").click(function () {
    let cantidadActual = cantidadActualBD || 0;

    Swal.fire({
      title: "Eliminar cantidad",
      text: `Cantidad actual: ${cantidadActual}`,
      input: "number",
      inputValue: 0,
      inputAttributes: {
        min: 0,
        max: cantidadActual,
      },
      showCancelButton: true,
      confirmButtonText: "Aceptar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (value === "") {
          return "Por favor ingresa un valor";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let ajuste = parseInt(result.value) || 0;

        if (ajuste < 0) {
          Swal.fire("Error", "No se permiten números negativos", "error");
          return;
        }

        if (ajuste > cantidadActual) {
          Swal.fire(
            "Error",
            "No puede ajustar más de lo que tiene en stock",
            "error"
          );
          return;
        }

        let nuevaCantidad = cantidadActual - ajuste;

        $("#cantidad").val(nuevaCantidad);

        const formData = new FormData();
        formData.append("id_producto", $("#id_producto").val());
        formData.append("nueva_cantidad", nuevaCantidad);
        formData.append(
          "csrfmiddlewaretoken",
          $('input[name="csrfmiddlewaretoken"]').val()
        );

        $("#loader").show();

        $.ajax({
          url: "/GestiondeProductos/actualizar_stock/",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false,
          success: function (response) {
            if (response.success) {
              cantidadActualBD = nuevaCantidad;

              Swal.fire({
                icon: "success",
                title: "Ajuste exitoso",
                text: "Se ha ajustado correctamente la cantidad.",
              }).then(() => {
                location.reload();
              });
            }
          },
          complete: function () {
            $("#loader").hide();
          },
        });
      }
    });
  });

  $("#id_producto").prop("readonly", true);
  $("#qr-image").hide();
  $("#image-preview").hide();
  limpiarQRInfo();
});
