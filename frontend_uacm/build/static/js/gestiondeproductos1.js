$(document).ready(function () {
  let searchTimeout = null;
  let nuevaImagenSeleccionada = false;
  let cantidadActualBD = 0; // Almacena la cantidad actual de la BD

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

      $("#qr-image").on("load", function () {
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

    if (isNaN(cantidad)) {
      $("#cantidad").addClass("error");
      $("#cantidad").after(
        '<span class="help-block text-danger">Debe ser un número válido</span>'
      );
      isValid = false;
    } else if (cantidad < 0) {
      Swal.fire({
        icon: "warning",
        title: "Cantidad no válida",
        text: "No se permiten números negativos en la cantidad a agregar.",
        confirmButtonText: "Entendido",
      });
      $("#cantidad").addClass("error");
      isValid = false;
    }

    if (isNaN(stockMinimo)) {
      $("#stock_minimo").addClass("error");
      $("#stock_minimo").after(
        '<span class="help-block text-danger">Debe ser un número válido</span>'
      );
      isValid = false;
    }

    return isValid;
  }

  function cargarDatosProducto(producto) {
    $("#id_producto").val(producto.id_producto).prop("readonly", true);
    $("#nombre_producto").val(producto.nombre_producto);
    $("#descripcion_producto").val(producto.descripcion_producto);

    cantidadActualBD = producto.cantidad; // Guardamos la cantidad real de la BD
    //$("#cantidad").val(cantidadActualBD); // Mostramos la cantidad desde la BD en el formulario

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

    if (!id_producto) {
      alert("Por favor ingrese un ID de producto");
      return;
    }

    if (!/^\d+$/.test(id_producto)) {
      alert("El ID de producto debe ser un número");
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
          alert(response.message || "Producto no encontrado");
        }
      },
      error: function (xhr, status, error) {
        console.error("Error al consultar el producto:", error);
        alert("Error al consultar el producto");
      },
      complete: function () {
        $("#loader").hide();
      },
    });
  });

  $("#btn-guardar").on("click", function (event) {
    event.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    // Obtenemos la cantidad a agregar
    const cantidadAAgregar = parseInt($("#cantidad").val()) || 0;

    // Calculamos la nueva cantidad total
    const nuevaCantidad = cantidadActualBD + cantidadAAgregar;

    const formData = new FormData();
    formData.append("id_producto", $("#id_producto").val());
    formData.append("nombre_producto", $("#nombre_producto").val());
    formData.append("descripcion_producto", $("#descripcion_producto").val());
    formData.append("cantidad", nuevaCantidad); // Enviamos la cantidad total
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
          // Actualizamos la cantidad actual con el nuevo valor
          cantidadActualBD = nuevaCantidad;

          Swal.fire({
            title: "¡Actualización exitosa!",
            html: `<p>Producto actualizado correctamente</p>
                       <p><strong>Cantidad agregada:</strong> ${cantidadAAgregar}</p>
                       <p><strong>Nuevo stock total:</strong> ${nuevaCantidad}</p>`,
            icon: "success",
            confirmButtonText: "Aceptar",
          }).then((result) => {
            if (result.isConfirmed) {
              // Limpiamos el campo de cantidad después de guardar
              $("#cantidad").val("");
              // Actualizamos el QR con la nueva cantidad
              actualizarQR(
                $("#id_producto").val(),
                $("#nombre_producto").val()
              );
            }
          });
        } else {
          Swal.fire(
            "Error",
            response.message || "Error al actualizar el producto",
            "error"
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("Error:", error);
        Swal.fire("Error", "Error al comunicarse con el servidor", "error");
      },
      complete: function () {
        $("#loader").hide();
      },
    });
  });

  $("#generate-qr-btn").on("click", function (e) {
    e.preventDefault();
    const id = $("#id_producto").val();
    const nombre = $("#nombre_producto").val();
    const cantidad = $("#cantidad").val();
    const stock_minimo = $("#stock_minimo").val();
    const id_estatus = $("#id_estatus").val();
    const id_categoria = $("#id_categoria").val();
    const id_marca = $("#id_marca").val();
    const id_unidad = $("#id_unidad").val();
    const descripcion_producto = $("#descripcion_producto").val();
    const observaciones = $("#observaciones").val();
    const imagen_producto = $("#imagen_producto")[0].files[0];

    if (
      !id ||
      !nombre ||
      !cantidad ||
      !stock_minimo ||
      !id_estatus ||
      !id_categoria ||
      !id_marca ||
      !id_marca ||
      !id_unidad ||
      !descripcion_producto ||
      !observaciones ||
      !imagen_producto
    ) {
      alert("Por favor ingresa los datos solicitados");
      return;
    }

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

        if (ajuste > cantidadActual) {
          Swal.fire({
            icon: "error",
            title: "Ajuste no válido",
            text: "No puedes eliminar más unidades de las que tienes en stock.",
          });
          return;
        }

        let nuevaCantidad = cantidadActual - ajuste;

        // Actualizamos el campo de cantidad en la interfaz
        $("#cantidad").val(nuevaCantidad);

        // Enviar la nueva cantidad al servidor
        const formData = new FormData();
        formData.append("id_producto", $("#id_producto").val());
        formData.append("nueva_cantidad", nuevaCantidad);
        formData.append(
          "csrfmiddlewaretoken",
          $('input[name="csrfmiddlewaretoken"]').val()
        );

        $("#loader").show(); // Mostrar el loader mientras se procesa la solicitud

        $.ajax({
          url: "/GestiondeProductos/actualizar_stock/",
          method: "POST",
          data: formData,
          processData: false,
          contentType: false,
          success: function (response) {
            if (response.success) {
              Swal.fire({
                title: "Ajuste realizado",
                html: `<p>Cantidad eliminada: ${ajuste}</p><p><strong>Nuevo stock total:</strong> ${nuevaCantidad}</p>`,
                icon: "success",
                confirmButtonText: "Aceptar",
              }).then(() => {
                cantidadActualBD = nuevaCantidad;
                location.reload(); // Recargar la página después del ajuste
              });
            } else {
              Swal.fire(
                "Error",
                response.message || "Error al actualizar el stock",
                "error"
              );
            }
          },
          error: function (xhr, status, error) {
            Swal.fire("Error", "Error al comunicarse con el servidor", "error");
          },
          complete: function () {
            $("#loader").hide(); // Ocultar el loader cuando se complete la solicitud
          },
        });
      }
    });
  });

  // Inicialización
  $("#id_producto").prop("readonly", true);
  $("#qr-image").hide();
  $("#image-preview").hide();
  limpiarQRInfo();
});
