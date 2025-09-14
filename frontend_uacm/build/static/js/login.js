// Variables globales
let formSubmitted = false;

// Función para inicializar todos los event listeners
document.addEventListener("DOMContentLoaded", function () {
  initializePasswordToggle();
  initializeFormValidation();
  initializeFormSubmission();
  clearFormOnLoad();
  initializeKeyboardHandlers();
});

// Funcionalidad para mostrar/ocultar contraseña
function initializePasswordToggle() {
  const toggleButtons = document.querySelectorAll(".toggle-password");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;
      const icon = this.querySelector("i");

      if (passwordInput && passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.className = "fas fa-eye-slash";
        this.setAttribute("aria-label", "Ocultar contraseña");
      } else if (passwordInput) {
        passwordInput.type = "password";
        icon.className = "fas fa-eye";
        this.setAttribute("aria-label", "Mostrar contraseña");
      }
    });
  });
}

// Validación del formulario en tiempo real
function initializeFormValidation() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (usernameInput) {
    usernameInput.addEventListener("input", function () {
      validateField(this, "usuario");
    });

    usernameInput.addEventListener("blur", function () {
      validateField(this, "usuario");
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      validateField(this, "contraseña");
    });

    passwordInput.addEventListener("blur", function () {
      validateField(this, "contraseña");
    });
  }
}

// Función para validar campos individuales
function validateField(input, fieldName) {
  const formGroup = input.closest(".form-group");
  const value = input.value.trim();

  // Remover clases previas
  formGroup.classList.remove("error", "success");

  if (value === "") {
    formGroup.classList.add("error");
    return false;
  } else if (value.length < 3) {
    formGroup.classList.add("error");
    return false;
  } else {
    formGroup.classList.add("success");
    return true;
  }
}

// Manejo del envío del formulario
function initializeFormSubmission() {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const btnText = loginBtn.querySelector(".btn-text");
  const loadingSpinner = loginBtn.querySelector(".loading-spinner");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      // Prevenir múltiples envíos
      if (formSubmitted || loginBtn.disabled) {
        e.preventDefault();
        return false;
      }

      // Validar campos
      if (!validateForm()) {
        e.preventDefault();
        showValidationError();
        return false;
      }

      // Marcar como enviado y deshabilitar botón
      formSubmitted = true;
      loginBtn.disabled = true;

      // Cambiar apariencia del botón
      btnText.style.display = "none";
      loadingSpinner.style.display = "inline-block";

      // Timeout de seguridad
      setTimeout(() => {
        resetSubmitButton();
      }, 15000);
    });
  }
}

// Validar todo el formulario
function validateForm() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  let isValid = true;

  if (!username || username.length < 3) {
    const usernameGroup = document
      .getElementById("username")
      .closest(".form-group");
    usernameGroup.classList.add("error");
    isValid = false;
  }

  if (!password || password.length < 3) {
    const passwordGroup = document
      .getElementById("password")
      .closest(".form-group");
    passwordGroup.classList.add("error");
    isValid = false;
  }

  return isValid;
}

// Mostrar error de validación
function showValidationError() {
  // Agregar efecto de shake al contenedor
  const container = document.querySelector(".login-container");
  container.classList.add("shake");

  // Mostrar alerta
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "warning",
      title: "Campos requeridos",
      text: "Por favor, complete todos los campos correctamente.",
      confirmButtonText: "Aceptar",
      timer: 4000,
      timerProgressBar: true,
    });
  }

  // Remover clase de shake después de la animación
  setTimeout(() => {
    container.classList.remove("shake");
  }, 500);

  // Enfocar el primer campo con error
  const firstError = document.querySelector(".form-group.error input");
  if (firstError) {
    firstError.focus();
  }
}

// Resetear estado del botón de envío
function resetSubmitButton() {
  const loginBtn = document.getElementById("loginBtn");
  const btnText = loginBtn.querySelector(".btn-text");
  const loadingSpinner = loginBtn.querySelector(".loading-spinner");

  formSubmitted = false;
  loginBtn.disabled = false;
  btnText.style.display = "inline-block";
  loadingSpinner.style.display = "none";
}

// Limpiar campos al cargar la página
function clearFormOnLoad() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";

  // Limpiar estados de validación
  document.querySelectorAll(".form-group").forEach((group) => {
    group.classList.remove("error", "success");
  });
}

// Manejadores de teclado
function initializeKeyboardHandlers() {
  const form = document.getElementById("loginForm");

  if (form) {
    // Prevenir envío múltiple con Enter
    form.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        if (formSubmitted) {
          e.preventDefault();
          return false;
        }
      }
    });

    // Navegación con Tab mejorada
    const inputs = form.querySelectorAll("input, button");
    inputs.forEach((input, index) => {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
          // Lógica personalizada de navegación si es necesaria
        }
      });
    });
  }
}

// Función para verificar conexión (si se necesita)
function checkConnection() {
  // Solo verificar si el usuario está en una página que requiere autenticación
  const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]");

  if (csrfToken) {
    fetch("/login/ping-session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken.value,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.redirect) {
          window.location.href = data.redirect;
        }
      })
      .catch((error) => {
        console.log("Connection check failed:", error);
      });
  }
}

// Funciones utilitarias
function sanitizeInput(input) {
  return input.trim().replace(/[<>]/g, "");
}

function showError(message) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: message,
      confirmButtonText: "Aceptar",
    });
  } else {
    alert(message);
  }
}

function showSuccess(message) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: message,
      confirmButtonText: "Aceptar",
      timer: 2000,
      timerProgressBar: true,
    });
  }
}

// Manejo de errores globales para el login
window.addEventListener("error", function (e) {
  console.error("Error en login:", e.error);
  resetSubmitButton();
});

// Limpiar estado al salir de la página
window.addEventListener("beforeunload", function () {
  resetSubmitButton();
});

// Función para debugging (solo en desarrollo)
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  window.debugLogin = {
    validateForm,
    resetSubmitButton,
    checkConnection,
    formSubmitted: () => formSubmitted,
  };
}
