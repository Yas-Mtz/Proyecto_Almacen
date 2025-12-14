// ============================================
// UACM LOGIN - FUNCIONALIDADES
// ============================================

/**
 * Muestra mensajes de Django usando SweetAlert2
 */
function mostrarMensajesDjango() {
  const messagesContainer = document.getElementById("django-messages");

  if (messagesContainer) {
    const messages = messagesContainer.querySelectorAll("[data-type]");

    messages.forEach(function (messageElement) {
      const type = messageElement.getAttribute("data-type");
      const text = messageElement.getAttribute("data-text");

      // Determinar icono y título según el tipo
      let icono = "info";
      let titulo = "Aviso";

      if (type === "error" || type === "danger") {
        icono = "error";
        titulo = "Error";
      } else if (type === "success") {
        icono = "success";
        titulo = "Éxito";
      } else if (type === "warning") {
        icono = "warning";
        titulo = "Atención";
      }

      // Mostrar el mensaje
      Swal.fire({
        icon: icono,
        title: titulo,
        text: text,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#640404",
        backdrop: true,
        allowOutsideClick: true,
        customClass: {
          popup: "swal-popup-custom",
          confirmButton: "swal-button-custom",
        },
      });
    });
  }
}

/**
 * Toggle para mostrar/ocultar contraseña
 */
function inicializarTogglePassword() {
  document.querySelectorAll(".toggle-password").forEach(function (button) {
    button.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;

      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
        passwordInput.type = "password";
        this.innerHTML = '<i class="fas fa-eye"></i>';
      }
    });
  });
}

/**
 * Manejo del envío del formulario
 */
function inicializarFormulario() {
  const form = document.getElementById("loginForm");
  const btn = document.getElementById("loginBtn");
  const btnText = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".loading-spinner");

  form.addEventListener("submit", function (e) {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Validar campos vacíos
    if (!username || !password) {
      e.preventDefault();
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, complete todos los campos.",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#640404",
        customClass: {
          popup: "swal-popup-custom",
          confirmButton: "swal-button-custom",
        },
      });
      return;
    }

    // Mostrar estado de carga
    btn.disabled = true;
    btnText.textContent = "Verificando...";
    spinner.style.display = "inline-block";
  });
}

/**
 * Restablecer el estado del botón al cargar la página
 */
function restablecerBoton() {
  const btn = document.getElementById("loginBtn");

  if (btn) {
    const btnText = btn.querySelector(".btn-text");
    const spinner = btn.querySelector(".loading-spinner");

    btn.disabled = false;
    btnText.textContent = "Ingresar al Sistema";
    spinner.style.display = "none";
  }
}

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener("DOMContentLoaded", function () {
  mostrarMensajesDjango();
  inicializarTogglePassword();
  inicializarFormulario();
});

/**
 * Restablecer botón cuando la página termina de cargar
 */
window.addEventListener("load", function () {
  restablecerBoton();
});
