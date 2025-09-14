// Variables globales
let heartbeatInterval;
let sessionCheckInterval;
const HEARTBEAT_INTERVAL = 120000; // 2 minutos
const SESSION_CHECK_INTERVAL = 300000; // 5 minutos

$(document).ready(function () {
  initializeUserProfile();
  initializeSessionModal();
  startHeartbeat();
  startSessionCheck();
  updateSessionStatus("active");
});

// Inicializar funcionalidad del perfil de usuario
function initializeUserProfile() {
  $("#userProfile").click(function (e) {
    e.stopPropagation();
    $(this).toggleClass("active");
  });

  $(document).click(function () {
    $("#userProfile").removeClass("active");
  });
}

// Inicializar modal de sesión
function initializeSessionModal() {
  const modal = $("#sessionModal");
  const closeBtn = $(".session-close");

  closeBtn.click(function () {
    modal.hide();
  });

  $(window).click(function (event) {
    if ($(event.target).is(modal)) {
      modal.hide();
    }
  });
}

// Obtener CSRF token
function getCSRFToken() {
  return (
    $("[name=csrfmiddlewaretoken]").val() ||
    $('meta[name="csrf-token"]').attr("content")
  );
}

// Sistema de heartbeat para mantener la sesión activa
function startHeartbeat() {
  console.log("Iniciando heartbeat...");
  heartbeatInterval = setInterval(async () => {
    try {
      const response = await fetch("/login/ping-session/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("Respuesta no válida: se recibió HTML");
      }

      const data = await response.json();
      console.log("Respuesta de heartbeat:", data);

      if (data.redirect) {
        clearIntervals();
        showSessionExpiredAlert(data.redirect);
      } else if (data.status === "success") {
        updateSessionStatus("active");
        console.log("✅ Heartbeat: Sesión activa para", data.username);
      } else if (data.status === "warning") {
        updateSessionStatus("warning");
        console.warn("⚠️ Heartbeat: Advertencia de sesión");
      } else {
        console.warn("⚠️ Heartbeat: Estado inesperado:", data.status);
      }
    } catch (error) {
      console.warn("❌ Heartbeat failed:", error);
      updateSessionStatus("warning");
    }
  }, HEARTBEAT_INTERVAL);
}

// Verificar estado de sesión periódicamente
function startSessionCheck() {
  sessionCheckInterval = setInterval(async () => {
    try {
      const response = await fetch("/login/session-status/", {
        method: "GET",
        headers: {
          "X-CSRFToken": getCSRFToken(),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("Respuesta no válida: se recibió HTML");
      }

      const data = await response.json();
      console.log("Verificación de sesión:", data);

      if (!data.session_active) {
        clearIntervals();
        showSessionExpiredAlert("/");
      } else {
        updateSessionStatus("active");
      }
    } catch (error) {
      console.warn("❌ Session check failed:", error);
      updateSessionStatus("warning");
    }
  }, SESSION_CHECK_INTERVAL);
}

// Actualizar indicador visual de estado de sesión
function updateSessionStatus(status) {
  const statusElement = $("#sessionStatus");
  const icon = statusElement.find("i");

  statusElement.removeClass("warning error");

  switch (status) {
    case "active":
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

// Mostrar alerta de sesión expirada
function showSessionExpiredAlert(redirectUrl) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "warning",
      title: "Sesión Expirada",
      text: "Tu sesión ha expirado por inactividad. Serás redirigido al login.",
      timer: 5000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: true,
      confirmButtonText: "Ir al Login",
    }).then(() => {
      window.location.href = redirectUrl;
    });
  } else {
    alert("Tu sesión ha expirado. Serás redirigido al login.");
    window.location.href = redirectUrl;
  }
}

// Mostrar información de sesión
async function showSessionInfo() {
  try {
    const response = await fetch("/login/session-status/", {
      method: "GET",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) {
      throw new Error("Respuesta no válida: se recibió HTML");
    }

    const data = await response.json();
    console.log("Información de sesión:", data);

    const modal = $("#sessionModal");
    const info = $("#sessionInfo");

    const sessionStatusText = data.session_active
      ? '<span style="color: #28a745; font-weight: bold;">✓ Activa</span>'
      : '<span style="color: #dc3545; font-weight: bold;">✗ Inactiva</span>';

    info.html(`
      <p><strong>Usuario:</strong> <span>${data.username}</span></p>
      <p><strong>Estado de Sesión:</strong> ${sessionStatusText}</p>
      <p><strong>Sesiones Totales:</strong> <span>${
        data.stats.total_sesiones
      }</span></p>
      <p><strong>Timeout por Inactividad:</strong> <span>${
        data.stats.timeout_minutes
      } minutos</span></p>
      <p><strong>Última Verificación:</strong> <span>${new Date().toLocaleString()}</span></p>
    `);

    modal.show();
  } catch (error) {
    console.error("Error al obtener info de sesión:", error);
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo obtener la información de la sesión.",
        confirmButtonText: "Aceptar",
      });
    }
  }
}

// Función para mostrar "Próximamente"
function showComingSoon() {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "info",
      title: "Próximamente",
      text: "Esta funcionalidad estará disponible en futuras actualizaciones.",
      confirmButtonText: "Entendido",
    });
  } else {
    alert("Esta funcionalidad estará disponible próximamente.");
  }
}

// Limpiar intervals
function clearIntervals() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

// Manejar visibilidad de la página
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(startHeartbeat, HEARTBEAT_INTERVAL * 2);
    }
  } else {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      startHeartbeat();
    }
    checkSessionImmediately();
  }
});

// Verificar sesión inmediatamente
async function checkSessionImmediately() {
  try {
    const response = await fetch("/login/session-status/", {
      method: "GET",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) {
      throw new Error("Respuesta no válida: se recibió HTML");
    }

    const data = await response.json();
    console.log("Verificación inmediata:", data);

    if (!data.session_active) {
      clearIntervals();
      showSessionExpiredAlert("/");
    } else {
      updateSessionStatus("active");
    }
  } catch (error) {
    console.warn("Immediate session check failed:", error);
    updateSessionStatus("warning");
  }
}

// Limpiar al salir de la página
window.addEventListener("beforeunload", function () {
  clearIntervals();
});

// Manejar errores globales
window.addEventListener("error", function (e) {
  console.error("Error global en home:", e.error);
});

// Funciones globales para usar desde el HTML
window.showSessionInfo = showSessionInfo;
window.showComingSoon = showComingSoon;
