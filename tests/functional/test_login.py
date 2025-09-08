import pytest
import logging
import time
import os

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# Configuración del logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('test_logs.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def take_screenshot(browser, name: str) -> str | None:
    """Captura una pantalla del navegador y la guarda con timestamp."""
    try:
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"screenshots/{name}_{timestamp}.png"
        os.makedirs("screenshots", exist_ok=True)
        browser.save_screenshot(filename)
        logger.info(f"Captura de pantalla guardada: {filename}")
        return filename
    except Exception as e:
        logger.error(f"No se pudo tomar la captura de pantalla: {e}")
        return None

def find_and_verify_element(browser, locator, element_name: str):
    """Espera y verifica que un elemento esté presente, visible y habilitado."""
    try:
        element = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located(locator)
        )
        assert element.is_displayed() and element.is_enabled(), \
            f"Elemento '{element_name}' no está visible o habilitado"
        logger.info(f"Elemento '{element_name}' encontrado y listo")
        return element
    except TimeoutException:
        logger.error(f"Timeout al encontrar el elemento '{element_name}'")
        take_screenshot(browser, f"timeout_{element_name}")
        pytest.fail(f"No se encontró el elemento '{element_name}' dentro del tiempo esperado")
    except AssertionError as e:
        logger.error(f"Error al verificar el elemento '{element_name}': {e}")
        take_screenshot(browser, f"verification_error_{element_name}")
        pytest.fail(str(e))

@pytest.fixture(scope="function")
def browser():
    """Inicializa el navegador Chrome con opciones predeterminadas."""
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--start-maximized')
    options.add_argument('--disable-notifications')
    options.add_argument('--disable-extensions')
    options.add_argument('--incognito')
    options.add_experimental_option('excludeSwitches', ['enable-logging'])

    driver = None
    try:
        logger.info("Inicializando navegador Chrome...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)

        driver.implicitly_wait(5)
        driver.set_page_load_timeout(15)
        driver.set_script_timeout(5)

        logger.info("Navegador listo para las pruebas")
        yield driver

    except Exception as e:
        logger.critical(f"Error al iniciar el navegador: {e}", exc_info=True)
        pytest.fail(f"No se pudo iniciar el navegador: {e}")

    finally:
        if driver:
            try:
                logger.info("Cerrando navegador...")
                driver.delete_all_cookies()
                driver.quit()
                logger.info("Navegador cerrado correctamente")
            except Exception as e:
                logger.error(f"Error al cerrar el navegador: {e}", exc_info=True)

@pytest.fixture(autouse=True)
def cleanup_between_tests(browser):
    """Limpieza automática entre pruebas para mantener el estado limpio."""
    yield
    try:
        browser.delete_all_cookies()
        browser.get("http://localhost:8000/logout/")
        time.sleep(0.3)
    except Exception as e:
        logger.warning(f"Error al limpiar estado entre pruebas: {e}")

def test_login_success(browser):
    """Prueba de inicio de sesión exitoso con cierre de sesión"""
    logger.info("==== Iniciando test_login_success ====")

    try:
        # Limpieza y acceso a la página de login
        browser.delete_all_cookies()
        browser.get("http://localhost:8000/logout/")
        time.sleep(0.3)

        browser.get("http://localhost:8000/login/")
        logger.info(f"URL actual: {browser.current_url}")
        take_screenshot(browser, "login_page_loaded")

        # Localización de elementos del formulario
        username = find_and_verify_element(browser, (By.ID, "username"), "campo usuario")
        password = find_and_verify_element(browser, (By.ID, "password"), "campo contraseña")
        submit_button = find_and_verify_element(browser, (By.CSS_SELECTOR, "button.login"), "botón de login")

        # Ingreso de credenciales
        username.clear()
        username.send_keys("Gerente1010")
        password.clear()
        password.send_keys("cuautepec1010")
        take_screenshot(browser, "credentials_entered")

        # Envío del formulario
        submit_button.click()

        # Manejo de posibles alertas
        try:
            alert = WebDriverWait(browser, 2).until(EC.alert_is_present())
            logger.warning(f"Alerta mostrada: {alert.text}")
            alert.accept()
            take_screenshot(browser, "alert_dismissed")
        except TimeoutException:
            logger.info("No se encontró alerta tras el login (comportamiento esperado)")

        # Verificación de login exitoso
        WebDriverWait(browser, 10).until(
            lambda d: any(keyword in d.page_source for keyword in [
                "Cerrar sesión", "Bienvenido", "Dashboard", "Inicio"
            ])
        )
        logger.info("Login exitoso confirmado")
        take_screenshot(browser, "login_success")

        # Verificar existencia de cookie de sesión
        session_cookies = [cookie["name"] for cookie in browser.get_cookies()]
        assert "sessionid" in session_cookies, "No se encontró la cookie de sesión"
        logger.info("Cookie de sesión verificada correctamente")

        # Acceso al perfil del usuario
        user_profile = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#userProfile"))
        )
        take_screenshot(browser, "user_profile_loaded")
        user_profile.click()
        time.sleep(0.5)

        # Cierre de sesión
        logout_button = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#dropdownMenu a[href='/login/logout/']"))
        )
        logout_button.click()

        # Verificación de redirección a login
        WebDriverWait(browser, 10).until(EC.url_contains("/login/"))
        assert "/login/" in browser.current_url, "No se redirigió a la página de login tras cerrar sesión"
        logger.info("Cierre de sesión exitoso")
        take_screenshot(browser, "logout_success")

    except Exception as e:
        take_screenshot(browser, "login_test_failure")
        logger.error(f"Fallo en test_login_success: {e}", exc_info=True)
        pytest.fail(f"Fallo inesperado en test_login_success: {e}")


def test_login_empty_fields(browser):
    """Prueba de inicio de sesión con campos vacíos"""
    logger.info("==== Iniciando test_login_empty_fields ====")

    try:
        # Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        logger.info(f"URL actual: {browser.current_url}")
        take_screenshot(browser, "login_page_empty")

        # Buscar botón de login
        submit_button = find_and_verify_element(browser, (By.CSS_SELECTOR, "button.login"), "botón login")

        # Clic en el botón sin llenar campos
        logger.info("Enviando formulario con campos vacíos...")
        submit_button.click()
        take_screenshot(browser, "empty_fields_submitted")

        # Verificar mensaje de error
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".error-message"))
            )
            logger.info(f"Mensaje de error mostrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error inesperado: {error_message.text}"
            take_screenshot(browser, "empty_fields_error_displayed")

        except TimeoutException:
            take_screenshot(browser, "empty_fields_no_error")
            logger.warning("No se mostró mensaje de error al enviar campos vacíos.")
            pytest.fail("No se mostró mensaje de error al enviar campos vacíos")

        # Asegurar que no se creó una cookie de sesión
        session_cookies = [cookie["name"] for cookie in browser.get_cookies()]
        assert "sessionid" not in session_cookies, "Se creó una cookie de sesión con campos vacíos"
        logger.info("Confirmado que no se creó cookie de sesión tras intento fallido")

    except Exception as e:
        take_screenshot(browser, "empty_fields_error_final")
        logger.error(f"Fallo en test_login_empty_fields: {e}", exc_info=True)
        pytest.fail(f"Fallo inesperado en test_login_empty_fields: {e}")


def test_login_empty_username(browser):
    """Prueba de inicio de sesión con campo de usuario vacío"""
    logger.info("==== Iniciando test_login_empty_username ====")

    try:
        # Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        take_screenshot(browser, "login_page_empty_username")

        # Buscar campos y botón de envío
        username_field = find_and_verify_element(browser, (By.ID, "username"), "campo username")
        password_field = find_and_verify_element(browser, (By.ID, "password"), "campo password")
        submit_button = find_and_verify_element(browser, (By.CSS_SELECTOR, "button.login"), "botón login")

        # Ingresar solo la contraseña
        password_field.clear()
        password_field.send_keys("cuautepec1010")
        logger.info("Clic en botón login con campo de usuario vacío")
        submit_button.click()
        take_screenshot(browser, "empty_username_submitted")

        # Verificar mensaje de error
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".error-message"))
            )
            logger.info(f"Mensaje de error mostrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error inesperado: {error_message.text}"
            take_screenshot(browser, "empty_username_error_displayed")
        except TimeoutException:
            take_screenshot(browser, "no_error_empty_username")
            logger.warning("No se mostró mensaje de error al dejar el campo username vacío.")
            pytest.fail("No se mostró mensaje de error al dejar el campo username vacío")

        # Verificar que no se haya creado la cookie de sesión
        cookies = [cookie["name"] for cookie in browser.get_cookies()]
        assert "sessionid" not in cookies, \
            "Se creó una cookie de sesión a pesar del campo username vacío"
        logger.info("Confirmado: no se creó cookie de sesión con campo username vacío")

    except Exception as e:
        take_screenshot(browser, "empty_username_error_final")
        logger.error(f"Fallo inesperado en test_login_empty_username: {e}", exc_info=True)
        pytest.fail(f"Fallo inesperado en test_login_empty_username: {e}")

def test_login_empty_password(browser):
    """Prueba de inicio de sesión con campo de contraseña vacío"""
    logger.info("==== Iniciando test_login_empty_password ====")

    try:
        # Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        take_screenshot(browser, "login_page_empty_password")

        # Buscar elementos
        username_field = find_and_verify_element(browser, (By.ID, "username"), "campo username")
        password_field = find_and_verify_element(browser, (By.ID, "password"), "campo password")
        submit_button = find_and_verify_element(browser, (By.CSS_SELECTOR, "button.login"), "botón login")

        # Ingresar solo el nombre de usuario
        username_field.clear()
        username_field.send_keys("Gerente1010")
        logger.info("Clic en botón login con campo de contraseña vacío")
        submit_button.click()
        take_screenshot(browser, "empty_password_submitted")

        # Verificar mensaje de error
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".error-message"))
            )
            logger.info(f"Mensaje de error mostrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error inesperado: {error_message.text}"
            take_screenshot(browser, "empty_password_error_displayed")
        except TimeoutException:
            take_screenshot(browser, "no_error_empty_password")
            logger.warning("No se mostró mensaje de error al dejar la contraseña vacía.")
            pytest.fail("No se mostró mensaje de error al dejar la contraseña vacía")

        # Verificar que no se haya creado la cookie de sesión
        cookies = [cookie["name"] for cookie in browser.get_cookies()]
        assert "sessionid" not in cookies, \
            "Se creó una cookie de sesión a pesar del campo de contraseña vacío"
        logger.info("Confirmado: no se creó cookie de sesión con contraseña vacía")

    except Exception as e:
        take_screenshot(browser, "empty_password_error_final")
        logger.error(f"Fallo inesperado en test_login_empty_password: {e}", exc_info=True)
        pytest.fail(f"Fallo inesperado en test_login_empty_password: {e}")

def test_logout(browser):
    """Prueba de cierre de sesión"""
    logger.info("==== Iniciando test_logout ====")

    try:
        # Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        take_screenshot(browser, "login_for_logout")

        # Llenar campos de login
        username_field = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_field = browser.find_element(By.ID, "password")
        submit_button = browser.find_element(By.CSS_SELECTOR, "button.login")

        username_field.send_keys("Gerente1010")
        password_field.send_keys("cuautepec1010")
        submit_button.click()

        # Esperar a que el login sea exitoso
        user_profile = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#userProfile"))
        )
        take_screenshot(browser, "logged_in_for_logout")

        # Clic en el perfil y luego en Cerrar sesión
        user_profile.click()
        time.sleep(1)  # Esperar a que el menú se despliegue

        logout_button = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#dropdownMenu a[href='/login/logout/']"))
        )
        logout_button.click()

        # Verificar redirección a la página de login
        WebDriverWait(browser, 10).until(
            EC.url_contains("/login/")
        )
        assert "/login/" in browser.current_url
        logger.info("Cierre de sesión exitoso y redirección confirmada")
        take_screenshot(browser, "logout_success")

    except Exception as e:
        take_screenshot(browser, "error_logout")
        logger.error(f"Fallo inesperado en test_logout: {e}", exc_info=True)
        pytest.fail(f"Fallo inesperado en test_logout: {e}")


# pruebas nuevas :)
def test_login_invalid_credentials(browser):
    """Prueba de inicio de sesión con credenciales incorrectas"""
    logger.info("Iniciando prueba test_login_invalid_credentials")

    try:
        # 1. Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        logger.info(f"URL actual: {browser.current_url}")
        take_screenshot(browser, "login_page_invalid_creds")

        # 2. Buscar elementos del formulario
        username = find_and_verify_element(browser, ("id", "username"), "username")
        password = find_and_verify_element(browser, ("id", "password"), "password")
        submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

        # 3. Ingresar credenciales incorrectas
        username.clear()
        username.send_keys("usuario_inexistente")
        password.clear()
        password.send_keys("contraseña_incorrecta")
        take_screenshot(browser, "invalid_credentials_entered")

        # 4. Enviar formulario
        submit.click()

        # 5. Verificar mensaje de error
        error_message_locator = ("css selector", ".error-message")
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located(error_message_locator)
            )
            logger.info(f"Mensaje de error encontrado: {error_message.text}")
            assert "Credenciales inválidas" in error_message.text or \
                   "Usuario o contraseña incorrectos" in error_message.text, \
                f"Mensaje de error incorrecto: {error_message.text}"
            take_screenshot(browser, "invalid_creds_error_displayed")
        except TimeoutException:
            logger.error("No se encontró mensaje de error para credenciales inválidas")
            take_screenshot(browser, "no_invalid_creds_error")
            pytest.fail("No se mostró mensaje de error para credenciales inválidas")

        # 6. Verificar que NO se creó cookie de sesión
        cookies = browser.get_cookies()
        assert "sessionid" not in [cookie["name"] for cookie in cookies], \
            "Se encontró cookie de sesión con credenciales inválidas"
        logger.info("Se verificó que no se creó sesión con credenciales inválidas")

    except Exception as e:
        take_screenshot(browser, "invalid_creds_error_final")
        logger.error(f"Error inesperado en prueba de credenciales inválidas: {str(e)}", exc_info=True)
        pytest.fail(f"Error inesperado en prueba de credenciales inválidas: {str(e)}")


def test_login_sql_injection(browser):
    """Prueba de intento de inyección SQL en el formulario de login"""
    logger.info("Iniciando prueba test_login_sql_injection")

    test_vectors = [
        ("admin' --", "password"),
        ("admin' OR '1'='1", "password"),
        ("admin'/*", "password"),
        ("' OR 1=1--", "password"),
        ("\" OR \"\"=\"", "password")
    ]

    for i, (sql_user, sql_pass) in enumerate(test_vectors):
        try:
            logger.info(f"Probando vector SQLi {i+1}: usuario='{sql_user}', pass='{sql_pass}'")

            # 1. Navegar a la página de login
            browser.get("http://localhost:8000/login/")
            username = find_and_verify_element(browser, ("id", "username"), "username")
            password = find_and_verify_element(browser, ("id", "password"), "password")
            submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

            # 2. Ingresar payload SQLi
            username.clear()
            username.send_keys(sql_user)
            password.clear()
            password.send_keys(sql_pass)
            take_screenshot(browser, f"sql_injection_attempt_{i+1}")

            # 3. Enviar formulario
            submit.click()

            # 4. Verificar que no se otorgó acceso
            WebDriverWait(browser, 5).until(
                lambda d: "/login/" in d.current_url or
                          "error" in d.page_source.lower() or
                          "invalid" in d.page_source.lower()
            )

            # 5. Verificaciones de seguridad
            current_url = browser.current_url
            page_source = browser.page_source

            assert "sql" not in page_source.lower(), "Se filtró información de SQL en la respuesta"
            assert "syntax" not in page_source.lower(), "Se filtró información de sintaxis SQL"
            assert "dashboard" not in current_url, f"Redirección con inyección SQL (vector {i+1})"
            assert "admin" not in current_url, f"Acceso admin con inyección SQL (vector {i+1})"

            cookies = browser.get_cookies()
            assert "sessionid" not in [cookie["name"] for cookie in cookies], \
                f"Se creó sesión con inyección SQL (vector {i+1})"

            take_screenshot(browser, f"sql_injection_handled_{i+1}")
            logger.info(f"Vector SQLi {i+1} manejado correctamente")

        except Exception as e:
            take_screenshot(browser, f"sql_injection_error_{i+1}")
            logger.error(f"Error con vector SQLi {i+1}: {str(e)}", exc_info=True)
            pytest.fail(f"Fallo en prueba de inyección SQL (vector {i+1}): {str(e)}")


def test_login_xss_attempt(browser):
    """Prueba de intento de XSS en el formulario de login"""
    logger.info("Iniciando prueba test_login_xss_attempt")

    xss_vectors = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "\"><script>alert('XSS')</script>",
        "javascript:alert('XSS')"
    ]

    for i, xss_payload in enumerate(xss_vectors):
        try:
            logger.info(f"Probando vector XSS {i+1}: '{xss_payload}'")

            # 1. Navegar a la página de login
            browser.get("http://localhost:8000/login/")
            username = find_and_verify_element(browser, ("id", "username"), "username")
            password = find_and_verify_element(browser, ("id", "password"), "password")
            submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

            # 2. Ingresar payload XSS
            username.clear()
            username.send_keys(xss_payload)
            password.clear()
            password.send_keys("password123")
            take_screenshot(browser, f"xss_attempt_{i+1}")

            # 3. Enviar formulario
            submit.click()
            time.sleep(1)  # Esperar para detectar alertas

            # 4. Verificar que no se ejecutó ningún script
            try:
                alert = browser.switch_to.alert
                alert_text = alert.text
                alert.accept()
                pytest.fail(f"Se ejecutó XSS (alerta encontrada: {alert_text}) con vector {i+1}")
            except:
                pass  # No hubo alerta, comportamiento esperado

            # 5. Verificar que el payload no se refleja sin escapar
            page_source = browser.page_source
            assert xss_payload not in page_source, f"Payload XSS reflejado sin escapar (vector {i+1})"

            if "<" in xss_payload or ">" in xss_payload:
                assert "&lt;" in page_source or "&gt;" in page_source, \
                    f"Caracteres HTML no escapados (vector {i+1})"

            take_screenshot(browser, f"xss_handled_{i+1}")
            logger.info(f"Vector XSS {i+1} manejado correctamente")

        except Exception as e:
            take_screenshot(browser, f"xss_error_{i+1}")
            logger.error(f"Error con vector XSS {i+1}: {str(e)}", exc_info=True)
            pytest.fail(f"Fallo en prueba XSS (vector {i+1}): {str(e)}")