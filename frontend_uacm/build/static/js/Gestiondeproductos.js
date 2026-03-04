$(document).ready(function () {
  let searchTimeout = null;
  let nuevaImagenSeleccionada = false;
  let cantidadActualBD = 0;
  let validacionTimeout = null;
  let currentProductData = null;
  let alertaStockMostrada = false;
  const nextId = $("#id_producto").val();

  function actualizarModoIndicador(modo, idProducto, nombreProducto) {
    const $indicator = $("#modo-indicator");
    const $texto = $("#modo-text");
    if (modo === "add") {
      $indicator.removeClass("modo-edit").addClass("modo-add");
      $indicator.find("i").first().removeClass("fa-edit").addClass("fa-plus-circle");
      $texto.text("Nuevo producto");
      $indicator.find(".modo-separator, .modo-action").remove();
    } else {
      $indicator.removeClass("modo-add").addClass("modo-edit");
      $indicator.find("i").first().removeClass("fa-plus-circle").addClass("fa-edit");
      $texto.text("Editando #" + idProducto + " — " + nombreProducto);
      if ($indicator.find(".modo-action").length === 0) {
        $indicator.append(
          '<span class="modo-separator">|</span>' +
          '<span class="modo-action"><i class="fas fa-undo"></i> Nuevo</span>'
        );
      }
    }
  }

  function actualizarSemaforo(cantidadEfectiva, stockMinimo) {
    const $semaforo = $("#semaforo-stock");

    if (!stockMinimo || stockMinimo <= 0) {
      $semaforo.hide();
      return;
    }

    $semaforo.show();
    $(".semaforo-luz").removeClass("activo-verde activo-amarillo activo-rojo");

    const $etiqueta = $("#semaforo-etiqueta");
    const $detalle  = $("#semaforo-detalle");
    $detalle.text(`Actual: ${cantidadEfectiva} | Mínimo: ${stockMinimo}`);

    if (cantidadEfectiva > stockMinimo * 2) {
      // Verde
      $("#luz-verde").addClass("activo-verde");
      $etiqueta.text("Stock suficiente").attr("class", "semaforo-etiqueta verde");
      $("#cantidad, #stock_minimo").removeClass("stock-bajo");
      $("#stock-warning").html("");

    } else if (cantidadEfectiva > stockMinimo) {
      // Amarillo
      $("#luz-amarillo").addClass("activo-amarillo");
      $etiqueta.text("Stock moderado — considere reabastecer pronto").attr("class", "semaforo-etiqueta amarillo");
      $("#cantidad").addClass("stock-bajo");
      $("#stock_minimo").addClass("stock-bajo");
      $("#stock-warning").html('<i class="fas fa-exclamation-triangle"></i> Stock próximo al mínimo');

    } else {
      // Rojo
      $("#luz-rojo").addClass("activo-rojo");
      $etiqueta.text("¡Stock crítico! Solicitar reabastecimiento").attr("class", "semaforo-etiqueta rojo");
      $("#cantidad").addClass("stock-bajo");
      $("#stock_minimo").addClass("stock-bajo");
      $("#stock-warning").html('<i class="fas fa-exclamation-triangle"></i> Stock igual o por debajo del mínimo');

      if (!alertaStockMostrada) {
        alertaStockMostrada = true;
        Swal.fire({
          icon: "warning",
          title: "Stock crítico",
          html: `El producto <strong>${$("#nombre_producto").val()}</strong> tiene <strong>${cantidadEfectiva}</strong> unidad(es) disponible(s), igual o por debajo del mínimo de <strong>${stockMinimo}</strong>.<br><br>Se recomienda solicitar reabastecimiento a la brevedad.`,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  }

  function verificarStockBajo() {
    const accion = $('input[name="action"]').val();
    const stockMinimo = parseInt($("#stock_minimo").val()) || 0;
    const delta = parseInt($("#cantidad").val()) || 0;
    const cantidadEfectiva = accion === "update" ? cantidadActualBD + delta : delta;

    // Actualizar etiqueta de stock resultante en modo edición
    if (accion === "update" && delta !== 0) {
      $("#stock-actual-valor").text(`${cantidadActualBD} → ${cantidadEfectiva}`);
    } else if (accion === "update") {
      $("#stock-actual-valor").text(cantidadActualBD);
    }

    actualizarSemaforo(cantidadEfectiva, stockMinimo);
  }

  function actualizarContadorChar(campo, counterId) {
    const len = $(campo).val().length;
    const $counter = $("#" + counterId);
    $counter.text(len);
    $counter.closest(".char-counter")
      .removeClass("near-limit at-limit")
      .addClass(len >= 300 ? "at-limit" : len >= 250 ? "near-limit" : "");
  }

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

  // Nueva función para mostrar mensajes de validación
  function mostrarMensajeValidacion(campo, mensaje, tipo) {
    const $campo = $(campo);
    const $grupo = $campo.closest(".form-group");

    // Remover mensajes anteriores
    $grupo.find(".validation-message").remove();

    if (mensaje) {
      const claseTipo =
        tipo === "error"
          ? "validation-error"
          : tipo === "warning"
          ? "validation-warning"
          : tipo === "success"
          ? "validation-success"
          : "validation-info";

      const $mensaje = $(
        `<div class="validation-message ${claseTipo}">${mensaje}</div>`
      );
      $campo.after($mensaje);
    }
  }

  // Función para validar nombre de producto en tiempo real
  function validarNombreProducto(nombreProducto) {
    if (!nombreProducto || nombreProducto.trim().length === 0) {
      mostrarMensajeValidacion("#nombre_producto", "", "info");
      $("#btn-guardar")
        .prop("disabled", false)
        .html('<i class="fas fa-save"></i> Guardar Producto');
      return;
    }

    const accionActual = $('input[name="action"]').val();
    const idActual = $("#id_producto").val();

    // Solo validar para productos nuevos
    if (accionActual === "update") return;

    mostrarMensajeValidacion(
      "#nombre_producto",
      "🔄 Verificando disponibilidad...",
      "info"
    );

    $.ajax({
      url: "/GestiondeProductos/verificar-producto/",
      method: "GET",
      data: { nombre: nombreProducto.trim() },
      success: function (data) {
        if (data.existe) {
          const mensaje = `
            ⚠️ <strong>Producto existente:</strong><br>
            📋 ID: ${data.producto.id_producto}<br>
            🏷️ Nombre: ${data.producto.nombre_producto}<br>
            📂 Categoría: ${data.producto.categoria}<br>
            💡 <button type="button" onclick="cargarProductoExistente(${data.producto.id_producto})" 
                    class="btn-link">¿Desea cargarlo para actualizar?</button>
          `;

          mostrarMensajeValidacion("#nombre_producto", mensaje, "warning");
          $("#btn-guardar")
            .prop("disabled", true)
            .html("🚫 Producto ya existe");
        } else {
          mostrarMensajeValidacion(
            "#nombre_producto",
            "✅ Nombre disponible",
            "success"
          );
          $("#btn-guardar")
            .prop("disabled", false)
            .html('<i class="fas fa-save"></i> Guardar Producto');
        }
      },
      error: function () {
        mostrarMensajeValidacion("#nombre_producto", "", "info");
        $("#btn-guardar").prop("disabled", false);
      },
    });
  }

  // Event listener para validación en tiempo real del nombre
  $("#nombre_producto").on("input blur", function () {
    clearTimeout(validacionTimeout);
    const nombreProducto = $(this).val();

    validacionTimeout = setTimeout(() => {
      validarNombreProducto(nombreProducto);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir
  });

  // Función específica para manejar la imagen del producto
  function manejarImagenProducto(producto) {
    const $previewImage = $("#preview-image");
    const $imagePreview = $("#image-preview");
    const $fileName = $("#file-name");

    console.log("Procesando imagen:");
    console.log("- imagen_url:", producto.imagen_url);
    console.log("- imagen_nombre:", producto.imagen_nombre);
    console.log("- imagen_path:", producto.imagen_path);
    console.log("- imagen_existe:", producto.imagen_existe);

    if (producto.imagen_url) {
      console.log("Cargando imagen:", producto.imagen_url);

      // Limpiar eventos anteriores
      $previewImage.off("load error");

      // Configurar imagen
      $previewImage
        .on("load", function () {
          console.log("Imagen cargada exitosamente");
          $imagePreview.removeAttr("hidden").show();

          // Mostrar información de la imagen
          const estadoArchivo =
            producto.imagen_existe !== false
              ? '<span style="color: #28a745;">Disponible</span>'
              : '<span style="color: #ffc107;">Archivo no encontrado en disco</span>';

          $fileName.html(`
            <div class="image-info" style="padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-image" style="color: #28a745;"></i>
                  <strong>${producto.imagen_nombre}</strong>
                </div>
                <div style="font-size: 0.85em; color: #6c757d;">
                  Estado: ${estadoArchivo}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">

                <button type="button" class="btn btn-secondary btn-sm" onclick="debugImagen('${producto.id_producto}')" title="Debug información">
                  <i class="fas fa-bug"></i> Debug
                </button>
              </div>
            </div>
          `);
        })
        .on("error", function () {
          console.log("Error cargando imagen");
          $previewImage.hide();
          $imagePreview.hide();

          $fileName.html(`
            <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 6px; border: 1px solid #dc3545;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>Error al cargar imagen:</strong> ${
                  producto.imagen_nombre || "imagen no disponible"
                }</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="debugImagen('${
                producto.id_producto
              }')">
                <i class="fas fa-bug"></i> Diagnosticar problema
              </button>
            </div>
          `);
        })
        .attr("src", producto.imagen_url)
        .attr("alt", `Imagen de ${producto.nombre_producto}`)
        .show();
    } else {
      // No hay imagen
      console.log("No hay imagen para este producto");
      $previewImage.attr("src", "").hide();
      $imagePreview.hide();

      $fileName.html(`
        <div style="color: #6c757d; padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-image"></i>
            <span>Este producto no tiene imagen asociada</span>
          </div>
        </div>
      `);
    }
  }

  // Función principal para cargar datos del producto
  function cargarDatosProducto(producto) {
    console.log("=== CARGANDO PRODUCTO ===");
    console.log("Datos recibidos:", producto);

    // Guardar datos globalmente
    currentProductData = producto;

    // Limpiar errores previos
    $(".error").removeClass("error");
    $(".help-block").remove();
    $(".validation-message").remove();

    // Llenar campos del formulario
    $("#id_producto").val(producto.id_producto).prop("readonly", true);
    $("#nombre_producto").val(producto.nombre_producto);
    $("#descripcion_producto").val(producto.descripcion_producto);
    cantidadActualBD = parseInt(producto.cantidad) || 0;
    $("#cantidad").val("").attr("placeholder", "0 = sin cambio");
    $("#stock_minimo").val(producto.stock_minimo);

    // Mostrar stock actual en bodega
    $("#stock-actual-valor").text(cantidadActualBD);
    $("#stock-actual-info").show();
    $("#label-cantidad").text("Agregar al stock");
    $("#cantidad-hint").show();
    $("#observaciones").val(producto.observaciones || "");

    // Llenar selectores
    $("#id_estatus").val(producto.id_estatus).trigger("change");
    $("#id_categoria").val(producto.id_categoria);
    $("#id_marca").val(producto.id_marca);
    $("#id_unidad").val(producto.id_unidad);

    // Manejar imagen del producto
    manejarImagenProducto(producto);

    // Cambiar a modo actualización
    $('input[name="action"]').val("update");
    $("#btn-guardar")
      .html('<i class="fas fa-save"></i> Actualizar Producto')
      .prop("disabled", false);

    // Actualizar indicador de modo
    actualizarModoIndicador("update", producto.id_producto, producto.nombre_producto);

    // Actualizar contadores de caracteres
    actualizarContadorChar("#descripcion_producto", "descripcion-counter");
    actualizarContadorChar("#observaciones", "observaciones-counter");

    // Mostrar semáforo de stock con datos reales del producto
    alertaStockMostrada = false;
    actualizarSemaforo(cantidadActualBD, parseInt(producto.stock_minimo) || 0);

    // Actualizar QR
    actualizarQR(producto.id_producto, producto.nombre_producto);
    nuevaImagenSeleccionada = false;

    console.log("Producto cargado completamente");
  }

  // Función para ver imagen completa
  window.verImagenCompleta = function (
    imagenUrl,
    productName,
    productId,
    productCategory
  ) {
    console.log("Abriendo imagen completa:", imagenUrl);

    $("#modal-image").attr("src", imagenUrl);
    $("#modal-product-title").text(`Imagen: ${productName}`);
    $("#modal-product-name").text(productName);
    $("#modal-product-id").text(productId);
    $("#modal-product-category").text(productCategory || "N/A");
    $("#imageModal").show();
  };

  // Debug específico para imágenes
  window.debugImagen = function (idProducto) {
    console.log("=== DEBUG IMAGEN ===");
    console.log(`Analizando imagen del producto ID: ${idProducto}`);

    $.ajax({
      url: "/GestiondeProductos/",
      method: "GET",
      data: { buscar: idProducto },
      success: function (response) {
        if (response.status === "success") {
          console.log("Información de imagen desde el servidor:");
          console.table({
            imagen_url: response.imagen_url || "No disponible",
            imagen_nombre: response.imagen_nombre || "No disponible",
            imagen_path: response.imagen_path || "No disponible",
            imagen_existe: response.imagen_existe,
          });

          if (response.imagen_url) {
            // Probar si la imagen se puede cargar
            const img = new Image();
            img.onload = () => {
              console.log("✓ La imagen se puede cargar correctamente");
              console.log(`Dimensiones: ${img.width} x ${img.height}`);
            };
            img.onerror = () => {
              console.log("✗ Error: No se puede cargar la imagen");
              console.log("Posibles causas:");
              console.log("1. El archivo no existe en la ruta especificada");
              console.log("2. Los permisos de archivo son incorrectos");
              console.log(
                "3. La configuración MEDIA_URL/MEDIA_ROOT es incorrecta"
              );
              console.log(
                "4. El servidor no está sirviendo archivos estáticos correctamente"
              );
            };
            img.src = response.imagen_url;
          } else {
            console.log("No hay URL de imagen para este producto");
          }
        }
      },
      error: function (xhr) {
        console.log("Error en la petición:", xhr);
      },
    });
  };

  // Función global para cargar producto existente (llamada desde HTML dinámico)
  window.cargarProductoExistente = function (idProducto) {
    $("#loader").show();

    $.ajax({
      url: "/GestiondeProductos/",
      method: "GET",
      data: { buscar: idProducto },
      success: function (response) {
        if (response.status === "success") {
          cargarDatosProducto(response);

          // Limpiar mensajes de validación
          $(".validation-message").remove();

          Swal.fire({
            icon: "info",
            title: "Producto cargado",
            text: "El producto se ha cargado para edición.",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      },
      error: function () {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar el producto.",
        });
      },
      complete: function () {
        $("#loader").hide();
      },
    });
  };

  function validarFormulario() {
    let isValid = true;
    $(".error").removeClass("error");
    $(".help-block").remove();

    const accionActual = $('input[name="action"]').val();
    const requiredFields = [
      "#id_producto",
      "#nombre_producto",
      "#stock_minimo",
      "#id_estatus",
      "#id_categoria",
      "#id_marca",
      "#id_unidad",
    ];
    if (accionActual === "add") {
      requiredFields.push("#cantidad");
    }

    requiredFields.forEach((field) => {
      const $field = $(field);
      if (!$field.val()) {
        isValid = false;
        $field.addClass("error");
        $field.closest(".form-group").find(".help-block").remove();
        $field.after(
          '<span class="help-block validation-error">Este campo es requerido</span>'
        );
      }
    });

    const cantidadVal = $("#cantidad").val().trim();
    const cantidad = cantidadVal === "" ? 0 : parseInt(cantidadVal);
    const stockMinimo = parseInt($("#stock_minimo").val());

    if (isNaN(cantidad) || cantidad < 0) {
      $("#cantidad")
        .addClass("error")
        .after(
          '<span class="help-block validation-error">Debe ser un número válido y no negativo</span>'
        );
      isValid = false;
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
      $("#stock_minimo")
        .addClass("error")
        .after(
          '<span class="help-block validation-error">Debe ser un número válido y no negativo</span>'
        );
      isValid = false;
    }

    // Verificar si el botón está deshabilitado por producto duplicado
    if ($("#btn-guardar").prop("disabled")) {
      isValid = false;
      Swal.fire({
        icon: "warning",
        title: "Producto duplicado",
        text: "Ya existe un producto con ese nombre. Por favor, cárguelo para actualizar o use un nombre diferente.",
      });
    }

    if (!isValid && !$("#btn-guardar").prop("disabled")) {
      Swal.fire({
        icon: "error",
        title: "Formulario incompleto o con errores",
        text: "Por favor, complete todos los campos requeridos correctamente.",
      });
    }

    return isValid;
  }

  // Función de debug mejorada
  window.debugBusqueda = function (id) {
    console.log("=== 🔍 DEBUG BÚSQUEDA ===");
    console.log("Buscando ID:", id);

    $.ajax({
      url: "/GestiondeProductos/",
      method: "GET",
      data: { buscar: id },
      success: function (response) {
        console.log("✅ Respuesta completa:", response);

        if (response.status === "success") {
          console.log("📋 INFORMACIÓN DEL PRODUCTO:");
          console.table({
            ID: response.id_producto,
            Nombre: response.nombre_producto,
            Categoria: response.nombre_categoria,
            Marca: response.nombre_marca,
            Stock: response.cantidad,
            "Stock Mínimo": response.stock_minimo,
            "Tiene Imagen": !!response.imagen_url,
            "URL Imagen": response.imagen_url,
            "Nombre Imagen": response.imagen_nombre,
            "Imagen Existe": response.imagen_existe,
          });

          if (response.imagen_url) {
            console.log("🖼️ INFORMACIÓN DE IMAGEN:");
            console.log("- URL completa:", response.imagen_url);
            console.log("- Nombre de archivo:", response.imagen_nombre);
            console.log("- Path relativo:", response.imagen_path);
            console.log("- Archivo existe:", response.imagen_existe);
          } else {
            console.log("📷 Sin imagen para este producto");
          }
        } else {
          console.log("❌ Producto no encontrado");
        }
      },
      error: function (xhr, status, error) {
        console.log("❌ Error en búsqueda:", { xhr, status, error });
      },
    });
  };

  // Toggle QR en móvil
  $("#qr-toggle-btn").on("click", function () {
    const $collapsible = $("#qr-collapsible");
    const $icon = $(this).find(".fa-chevron-down, .fa-chevron-up");
    const isOpen = $collapsible.hasClass("open");

    $collapsible.toggleClass("open");
    $icon.toggleClass("fa-chevron-down", isOpen).toggleClass("fa-chevron-up", !isOpen);
    $(this).find("span").text(isOpen ? "Ver código QR" : "Ocultar código QR");
    $(this).attr("aria-expanded", !isOpen);
  });

  // Event listeners para el modal de imagen
  $(document).on("click", ".close-modal, #imageModal", function (e) {
    if (e.target === this) {
      $("#imageModal").hide();
    }
  });

  // Cerrar modal con ESC
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      $("#imageModal").hide();
    }
  });

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

    function ejecutarBusqueda() {
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
    }

    const tieneNombre = $("#nombre_producto").val().trim() !== "";
    const tieneDescripcion = $("#descripcion_producto").val().trim() !== "";

    if (tieneNombre || tieneDescripcion) {
      Swal.fire({
        icon: "question",
        title: "Formulario con datos",
        text: "El formulario tiene datos sin guardar. ¿Deseas descartarlos y cargar el producto buscado?",
        showCancelButton: true,
        confirmButtonText: "Sí, cargar producto",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#640404",
      }).then((result) => {
        if (result.isConfirmed) {
          ejecutarBusqueda();
        }
      });
    } else {
      ejecutarBusqueda();
    }
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
        console.log("Respuesta del servidor:", response);

        if (response.success) {
          cantidadActualBD = nuevaCantidad;
          $("#cantidad").val("");
          actualizarQR($("#id_producto").val(), $("#nombre_producto").val());

          Swal.fire({
            icon: "success",
            title: "Producto guardado",
            html: response.message || "El producto se guardó correctamente.",
            width: "500px",
          }).then(() => {
            location.reload();
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error al guardar producto",
            html:
              response.message || "Hubo un problema al guardar el producto.",
            width: "500px",
            customClass: {
              htmlContainer: "text-left",
            },
          });
        }
      },
      error: function (xhr, status, error) {
        console.log("Error AJAX:", xhr, status, error);

        let errorMessage = "Ocurrió un error en la solicitud al servidor.";

        try {
          if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMessage = xhr.responseJSON.message;
          } else if (xhr.responseText) {
            const response = JSON.parse(xhr.responseText);
            if (response.message) {
              errorMessage = response.message;
            }
          }
        } catch (e) {
          console.log("No se pudo parsear la respuesta de error:", e);
        }

        Swal.fire({
          icon: "error",
          title: "Error del servidor",
          html: errorMessage,
          width: "500px",
          customClass: {
            htmlContainer: "text-left",
          },
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

  // QR automático al escribir el nombre del producto
  let qrAutoTimeout;
  $("#nombre_producto").on("input", function () {
    clearTimeout(qrAutoTimeout);
    const id = $("#id_producto").val().trim();
    const nombre = $(this).val().trim();
    if (id && nombre.length >= 3) {
      qrAutoTimeout = setTimeout(function () {
        actualizarQR(id, nombre);
      }, 900);
    }
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

  $("#modo-indicator").on("click", function () {
    if (!$(this).hasClass("modo-edit")) return;

    $("form")[0].reset();
    $("#id_producto").val(nextId).prop("readonly", true);
    $("#cantidad").val("0").attr("placeholder", "");
    $("#label-cantidad").text("Cantidad inicial");
    $("#stock-actual-info").hide();
    $("#cantidad-hint").hide();
    $("#id_estatus").val("").trigger("change");
    $('input[name="action"]').val("add");
    $("#btn-guardar")
      .html('<i class="fas fa-save"></i> Guardar Producto')
      .prop("disabled", false);
    $("#preview-image").off("load error").attr("src", "").hide();
    $("#image-preview").hide();
    $("#file-name").text("No se seleccionó archivo");
    $(".error").removeClass("error");
    $(".help-block").remove();
    $(".validation-message").remove();
    $("#cantidad, #stock_minimo").removeClass("stock-bajo");
    $("#stock-warning").html("");
    $("#semaforo-stock").hide();
    $(".semaforo-luz").removeClass("activo-verde activo-amarillo activo-rojo");
    alertaStockMostrada = false;
    limpiarQRInfo();
    nuevaImagenSeleccionada = false;
    cantidadActualBD = 0;
    currentProductData = null;
    actualizarModoIndicador("add");
    actualizarContadorChar("#descripcion_producto", "descripcion-counter");
    actualizarContadorChar("#observaciones", "observaciones-counter");
    $("#buscar").val("");
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

  // Instrucciones en consola
  console.log("🔧 Funciones de debug disponibles:");
  console.log("- debugBusqueda(ID) - Debug completo de búsqueda");
  console.log("- debugImagen(ID) - Debug específico de imagen");

  $("#cantidad, #stock_minimo").on("input change", verificarStockBajo);

  $("#descripcion_producto").on("input", function () {
    actualizarContadorChar("#descripcion_producto", "descripcion-counter");
  });

  $("#observaciones").on("input", function () {
    actualizarContadorChar("#observaciones", "observaciones-counter");
  });

  $("#id_producto").prop("readonly", true);
  $("#qr-image").hide();
  $("#image-preview").hide();
  limpiarQRInfo();

});
