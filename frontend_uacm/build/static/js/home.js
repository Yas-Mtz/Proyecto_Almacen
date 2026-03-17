// ============================================
// UACM HOME - FUNCIONALIDADES
// ============================================

// Variables globales
let heartbeatInterval;
let sessionCheckInterval;
const HEARTBEAT_INTERVAL = 120000; // 2 minutos
const SESSION_CHECK_INTERVAL = 300000; // 5 minutos

// Inicialización cuando el DOM está listo
$(document).ready(function () {
  console.log("🚀 Inicializando sistema...");
  initializeUserProfile();
  initializeSessionModal();
  startHeartbeat();
  startSessionCheck();
  updateSessionStatus("active");
  setDynamicGreeting();
});

function setDynamicGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 6 && hour < 12)       greeting = "Buenos días";
  else if (hour >= 12 && hour < 19) greeting = "Buenas tardes";
  else                               greeting = "Buenas noches";
  const badge = document.getElementById("greeting-badge");
  if (badge) badge.textContent = greeting;
}

// ============================================
// PERFIL DE USUARIO
// ============================================

/**
 * Inicializar funcionalidad del perfil de usuario
 */
function initializeUserProfile() {
  const userProfile = $("#userProfile");

  // Toggle del menú desplegable
  userProfile.on("click", function (e) {
    e.stopPropagation();
    $(this).toggleClass("active");
  });

  // Cerrar al hacer click fuera
  $(document).on("click", function (e) {
    if (!$(e.target).closest("#userProfile").length) {
      userProfile.removeClass("active");
    }
  });

  // Cerrar con tecla ESC
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      userProfile.removeClass("active");
    }
  });
}

// ============================================
// MODAL DE SESIÓN
// ============================================

/**
 * Inicializar modal de información de sesión
 */
function initializeSessionModal() {
  const modal = $("#sessionModal");
  const closeBtn = $("#modalClose");

  // Cerrar con el botón X
  closeBtn.on("click", function () {
    closeModal();
  });

  // Cerrar al hacer click en el overlay
  modal.on("click", function (e) {
    if (
      $(e.target).hasClass("session-modal") ||
      $(e.target).hasClass("modal-overlay")
    ) {
      closeModal();
    }
  });

  // Cerrar con tecla ESC
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.is(":visible")) {
      closeModal();
    }
  });
}

/**
 * Cerrar modal con animación
 */
function closeModal() {
  const modal = $("#sessionModal");
  modal.fadeOut(300);
}

/**
 * Abrir modal con animación
 */
function openModal() {
  const modal = $("#sessionModal");
  modal.fadeIn(300);
}

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

/**
 * Obtener CSRF token de Django
 */
function getCSRFToken() {
  return (
    $("[name=csrfmiddlewaretoken]").val() ||
    $('meta[name="csrf-token"]').attr("content") ||
    getCookie("csrftoken")
  );
}

/**
 * Obtener cookie por nombre
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Sistema de heartbeat para mantener la sesión activa
 */
function startHeartbeat() {
  console.log("💓 Iniciando heartbeat de sesión...");

  // Ejecutar inmediatamente
  performHeartbeat();

  // Luego cada intervalo
  heartbeatInterval = setInterval(performHeartbeat, HEARTBEAT_INTERVAL);
}

/**
 * Realizar ping de heartbeat
 */
async function performHeartbeat() {
  try {
    const response = await fetch("/login/ping-session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
    });

    // Verificar tipo de contenido
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error("❌ Respuesta no válida: se esperaba JSON");
      updateSessionStatus("warning");
      return;
    }

    const data = await response.json();
    console.log("💓 Heartbeat:", data);

    // Manejar diferentes estados
    if (data.redirect) {
      clearIntervals();
      showSessionExpiredAlert(data.redirect);
    } else if (data.status === "success") {
      updateSessionStatus("active");
    } else if (data.status === "warning") {
      updateSessionStatus("warning");
      console.warn("⚠️ Advertencia de sesión:", data.message);
    } else {
      console.warn("⚠️ Estado inesperado:", data);
      updateSessionStatus("warning");
    }
  } catch (error) {
    console.error("❌ Error en heartbeat:", error);
    updateSessionStatus("warning");
  }
}

/**
 * Verificar estado de sesión periódicamente
 */
function startSessionCheck() {
  console.log("🔍 Iniciando verificación de sesión...");
  sessionCheckInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
}

/**
 * Verificar sesión
 */
async function checkSession() {
  try {
    const response = await fetch("/login/session-status/", {
      method: "GET",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error("❌ Respuesta no válida: se esperaba JSON");
      return;
    }

    const data = await response.json();
    console.log("🔍 Estado de sesión:", data);

    if (!data.session_active) {
      clearIntervals();
      showSessionExpiredAlert("/login/");
    } else {
      updateSessionStatus("active");
    }
  } catch (error) {
    console.error("❌ Error al verificar sesión:", error);
    updateSessionStatus("warning");
  }
}

/**
 * Actualizar indicador visual de estado de sesión
 */
function updateSessionStatus(status) {
  const statusElement = $("#sessionStatus");
  const icon = statusElement.find("i");

  // Remover clases previas
  statusElement.removeClass("warning error active");

  switch (status) {
    case "active":
      statusElement.addClass("active");
      icon.css("color", "#28a745");
      statusElement.attr("title", "Sesión activa");
      break;
    case "warning":
      statusElement.addClass("warning");
      icon.css("color", "#ffc107");
      statusElement.attr("title", "Problemas de conexión");
      break;
    case "error":
      statusElement.addClass("error");
      icon.css("color", "#dc3545");
      statusElement.attr("title", "Sesión inválida");
      break;
  }
}

/**
 * Mostrar alerta de sesión expirada con SweetAlert
 */
function showSessionExpiredAlert(redirectUrl) {
  Swal.fire({
    icon: "warning",
    title: "Sesión Expirada",
    text: "Tu sesión ha expirado. Serás redirigido al login.",
    timer: 5000,
    timerProgressBar: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: true,
    confirmButtonText: "Ir al Login",
    confirmButtonColor: "#640404",
    customClass: {
      popup: "swal-popup-custom",
      confirmButton: "swal-button-custom",
    },
  }).then(() => {
    window.location.href = redirectUrl;
  });
}

// ============================================
// INFORMACIÓN DE SESIÓN
// ============================================

/**
 * Mostrar información detallada de la sesión
 */
async function showSessionInfo() {
  try {
    const response = await fetch("/login/session-status/", {
      method: "GET",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("Respuesta no válida: se esperaba JSON");
    }

    const data = await response.json();
    console.log("📊 Información de sesión:", data);

    // Determinar estado visual
    const sessionStatusHtml = data.session_active
      ? '<span style="color: #28a745; font-weight: 700;"><i class="fas fa-check-circle"></i> Activa</span>'
      : '<span style="color: #dc3545; font-weight: 700;"><i class="fas fa-times-circle"></i> Inactiva</span>';

    // Construir HTML del modal
    const infoHtml = `
            <p>
                <strong><i class="fas fa-user"></i> Usuario:</strong> 
                <span>${data.username}</span>
            </p>
            <p>
                <strong><i class="fas fa-signal"></i> Estado:</strong> 
                ${sessionStatusHtml}
            </p>
            <p>
                <strong><i class="fas fa-users"></i> Sesiones Activas:</strong> 
                <span>${data.stats.total_sesiones}</span>
            </p>
            <p>
                <strong><i class="fas fa-clock"></i> Timeout:</strong> 
                <span>${data.stats.timeout_minutes} minutos</span>
            </p>
            <p>
                <strong><i class="fas fa-calendar-check"></i> Última Verificación:</strong> 
                <span>${new Date().toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}</span>
            </p>
        `;

    $("#sessionInfo").html(infoHtml);
    openModal();
  } catch (error) {
    console.error("❌ Error al obtener información de sesión:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo obtener la información de la sesión.",
      confirmButtonText: "Aceptar",
      confirmButtonColor: "#640404",
      customClass: {
        popup: "swal-popup-custom",
        confirmButton: "swal-button-custom",
      },
    });
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Mostrar mensaje de "Próximamente"
 */
function showComingSoon() {
  Swal.fire({
    icon: "info",
    title: "Próximamente",
    text: "Esta funcionalidad estará disponible en futuras actualizaciones.",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#640404",
    customClass: {
      popup: "swal-popup-custom",
      confirmButton: "swal-button-custom",
    },
  });
}

/**
 * Limpiar todos los intervalos
 */
function clearIntervals() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("🛑 Heartbeat detenido");
  }
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
    console.log("🛑 Verificación de sesión detenida");
  }
}

/**
 * Verificar sesión inmediatamente
 */
async function checkSessionImmediately() {
  console.log("⚡ Verificación inmediata de sesión...");
  try {
    const response = await fetch("/login/session-status/", {
      method: "GET",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("Respuesta no válida");
    }

    const data = await response.json();

    if (!data.session_active) {
      clearIntervals();
      showSessionExpiredAlert("/login/");
    } else {
      updateSessionStatus("active");
    }
  } catch (error) {
    console.warn("⚠️ Error en verificación inmediata:", error);
    updateSessionStatus("warning");
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Manejar visibilidad de la página
 */
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    console.log("👁️ Página oculta - reduciendo frecuencia de heartbeat");
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(performHeartbeat, HEARTBEAT_INTERVAL * 2);
    }
  } else {
    console.log("👁️ Página visible - restableciendo heartbeat");
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      startHeartbeat();
    }
    checkSessionImmediately();
  }
});

/**
 * Limpiar al salir de la página
 */
window.addEventListener("beforeunload", function () {
  clearIntervals();
});

/**
 * Manejar errores globales
 */
window.addEventListener("error", function (e) {
  console.error("💥 Error global:", e.error);
});

/**
 * Prevenir múltiples clicks en botones
 */
$(document).on("click", "a, button", function (e) {
  const $this = $(this);
  if ($this.data("clicking")) {
    e.preventDefault();
    return false;
  }
  $this.data("clicking", true);
  setTimeout(() => $this.data("clicking", false), 1000);
});

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================

window.showSessionInfo = showSessionInfo;
window.showComingSoon = showComingSoon;
window.checkSessionImmediately = checkSessionImmediately;

// Log de inicialización completa
console.log("✅ Sistema inicializado correctamente");
console.log("📊 Configuración:");
console.log("   - Heartbeat: cada", HEARTBEAT_INTERVAL / 1000, "segundos");
console.log(
  "   - Verificación: cada",
  SESSION_CHECK_INTERVAL / 1000,
  "segundos"
);
