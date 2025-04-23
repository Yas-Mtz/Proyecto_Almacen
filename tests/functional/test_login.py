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

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('test_logs.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def take_screenshot(browser, name):
    """Función auxiliar para capturas de pantalla con logging"""
    try:
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"screenshots/{name}_{timestamp}.png"
        os.makedirs("screenshots", exist_ok=True)
        browser.save_screenshot(filename)
        logger.info(f"Captura de pantalla guardada: {filename}")
        return filename
    except Exception as e:
        logger.error(f"No se pudo tomar captura de pantalla: {str(e)}")
        return None

def find_and_verify_element(browser, locator, element_name):
    """Función auxiliar para encontrar y verificar elementos"""
    try:
        element = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located(locator)  # Usar presence para asegurar que esté en el DOM
        )
        assert element.is_displayed() and element.is_enabled(), f"Elemento {element_name} no está visible o habilitado"
        logger.info(f"Elemento {element_name} encontrado y listo para interactuar")
        return element
    except TimeoutException:
        logger.error(f"Timeout al encontrar {element_name}")
        take_screenshot(browser, f"timeout_{element_name}")
        raise
    except AssertionError as e:
        logger.error(f"Error al verificar {element_name}: {str(e)}")
        take_screenshot(browser, f"verification_error_{element_name}")
        raise

@pytest.fixture(scope="function")
def browser():
    """Fixture para inicializar el navegador Chrome con logging"""
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
        logger.info("Inicializando el navegador Chrome...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)

        # Configurar timeouts
        driver.implicitly_wait(5)  # Reducir implicit wait para pruebas más rápidas
        driver.set_page_load_timeout(15)
        driver.set_script_timeout(5)

        logger.info("Navegador inicializado correctamente")
        yield driver

    except Exception as e:
        logger.error(f"Error al iniciar el navegador: {str(e)}", exc_info=True)
        pytest.fail(f"Error al iniciar el navegador: {str(e)}")

    finally:
        if driver:
            try:
                logger.info("Cerrando el navegador...")
                driver.delete_all_cookies()
                driver.quit()
                logger.info("Navegador cerrado correctamente")
            except Exception as e:
                logger.error(f"Error al cerrar el navegador: {str(e)}", exc_info=True)

@pytest.fixture(autouse=True)
def cleanup_between_tests(browser):
    yield
    try:
        browser.delete_all_cookies()
        browser.get("http://localhost:8000/logout/")  # Asegurar la barra final en la URL de logout
        time.sleep(0.3)  # Reducir el tiempo de espera
    except Exception as e:
        logger.warning(f"Error en limpieza entre tests: {str(e)}")

def test_login_success(browser):
    """Prueba de inicio de sesión exitoso con manejo mejorado"""
    logger.info("Iniciando prueba test_login_success")

    try:
        # 1. Limpieza inicial
        browser.delete_all_cookies()
        browser.get("http://localhost:8000/logout/")
        time.sleep(0.3)

        # 2. Navegar a la página de login
        browser.get("http://localhost:8000/login/")  # Asegurar la barra final
        logger.info(f"URL actual: {browser.current_url}")
        take_screenshot(browser, "login_page_loaded")

        # 3. Buscar elementos del formulario
        username = find_and_verify_element(browser, ("id", "username"), "username")
        password = find_and_verify_element(browser, ("id", "password"), "password")
        submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

        # 4. Ingresar credenciales
        username.clear()
        username.send_keys("Gerente1010")
        password.clear()
        password.send_keys("cuautepec1010")
        take_screenshot(browser, "credentials_entered")

        # 5. Enviar formulario y manejar alertas
        submit.click()

        try:
            alert = WebDriverWait(browser, 2).until(EC.alert_is_present())
            alert_text = alert.text
            logger.warning(f"Alerta encontrada: {alert_text}")
            alert.accept()
            take_screenshot(browser, "alert_handled")
        except TimeoutException:
            pass

        # 6. Verificar login exitoso
        WebDriverWait(browser, 10).until(
            lambda d: any(
                text in d.page_source
                for text in ["Cerrar sesión", "Bienvenido", "Dashboard", "Inicio"]
            )
        )
        logger.info("Login exitoso detectado")
        take_screenshot(browser, "login_success")

        # 7. Verificar cookie de sesión
        cookies = browser.get_cookies()
        logger.info(f"Cookies encontradas: {len(cookies)}")
        assert "sessionid" in [cookie["name"] for cookie in cookies], "No se encontró cookie de sesión"
        logger.info("Sesión verificada correctamente")

    except Exception as e:
        take_screenshot(browser, "login_error_final")
        logger.error(f"Error inesperado: {str(e)}", exc_info=True)
        pytest.fail(f"Error inesperado: {str(e)}")

def test_login_empty_fields(browser):
    """Prueba de inicio de sesión con campos vacíos"""
    logger.info("Iniciando prueba test_login_empty_fields")

    try:
        # 1. Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        logger.info(f"URL actual: {browser.current_url}")
        take_screenshot(browser, "login_page_empty")

        # 2. Buscar y verificar el botón de login
        submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

        # 3. Enviar formulario con campos vacíos
        logger.info("Haciendo clic en el botón de login con campos vacíos")
        submit.click()
        take_screenshot(browser, "empty_fields_submitted")

        # 4. Verificar mensaje de error
        error_message_locator = ("css selector", ".error-message")
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located(error_message_locator)
            )
            logger.info(f"Mensaje de error encontrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error incorrecto: {error_message.text}"
            take_screenshot(browser, "empty_fields_error_displayed")
        except TimeoutException:
            logger.warning("No se encontró mensaje de error al dejar los campos vacíos.")
            take_screenshot(browser, "no_empty_fields_error")
            assert False, "No se mostró mensaje de error al dejar los campos vacíos"

        # 5. Verificar que la cookie de sesión NO se haya creado
        cookies = browser.get_cookies()
        assert "sessionid" not in [cookie["name"] for cookie in cookies], \
            "Se encontró cookie de sesión a pesar de los campos vacíos"
        logger.info("Se verificó que no se creó la cookie de sesión con campos vacíos")

    except Exception as e:
        take_screenshot(browser, "empty_fields_error_final")
        logger.error(f"Error inesperado en prueba de campos vacíos: {str(e)}", exc_info=True)
        pytest.fail(f"Error inesperado en prueba de campos vacíos: {str(e)}")

def test_login_empty_username(browser):
    """Prueba de inicio de sesión con campo de usuario vacío"""
    logger.info("Iniciando prueba test_login_empty_username")
    try:
        # 1. Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        username_field = find_and_verify_element(browser, ("id", "username"), "username")
        password_field = find_and_verify_element(browser, ("id", "password"), "password")
        submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

        # 2. Ingresar solo la contraseña
        password_field.send_keys("cuautepec1010")
        logger.info("Haciendo clic en el botón de login con usuario vacío")
        submit.click()
        take_screenshot(browser, "empty_username_submitted")

        # 3. Verificar mensaje de error
        error_message_locator = ("css selector", ".error-message")
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located(error_message_locator)
            )
            logger.info(f"Mensaje de error encontrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error incorrecto: {error_message.text}"
            take_screenshot(browser, "empty_username_error_displayed")
        except TimeoutException:
            logger.warning("No se encontró mensaje de error al dejar el usuario vacío.")
            take_screenshot(browser, "no_empty_username_error")
            assert False, "No se mostró mensaje de error al dejar el usuario vacío"

        # 4. Verificar que la cookie de sesión NO se haya creado
        cookies = browser.get_cookies()
        assert "sessionid" not in [cookie["name"] for cookie in cookies], \
            "Se encontró cookie de sesión a pesar del usuario vacío"
        logger.info("Se verificó que no se creó la cookie de sesión con usuario vacío")

    except Exception as e:
        take_screenshot(browser, "empty_username_error_final")
        logger.error(f"Error inesperado en prueba de usuario vacío: {str(e)}", exc_info=True)
        pytest.fail(f"Error inesperado en prueba de usuario vacío: {str(e)}")

def test_login_empty_password(browser):
    """Prueba de inicio de sesión con campo de contraseña vacío"""
    logger.info("Iniciando prueba test_login_empty_password")
    try:
        # 1. Navegar a la página de login
        browser.get("http://localhost:8000/login/")
        username_field = find_and_verify_element(browser, ("id", "username"), "username")
        password_field = find_and_verify_element(browser, ("id", "password"), "password")
        submit = find_and_verify_element(browser, ("css selector", "button.login"), "botón login")

        # 2. Ingresar solo el usuario
        username_field.send_keys("Gerente1010")
        logger.info("Haciendo clic en el botón de login con contraseña vacía")
        submit.click()
        take_screenshot(browser, "empty_password_submitted")

        # 3. Verificar mensaje de error
        error_message_locator = ("css selector", ".error-message")
        try:
            error_message = WebDriverWait(browser, 5).until(
                EC.visibility_of_element_located(error_message_locator)
            )
            logger.info(f"Mensaje de error encontrado: {error_message.text}")
            assert "Por favor, complete todos los campos." in error_message.text, \
                f"Mensaje de error incorrecto: {error_message.text}"
            take_screenshot(browser, "empty_password_error_displayed")
        except TimeoutException:
            logger.warning("No se encontró mensaje de error al dejar la contraseña vacía.")
            take_screenshot(browser, "no_empty_password_error")
            assert False, "No se mostró mensaje de error al dejar la contraseña vacía"

        # 4. Verificar que la cookie de sesión NO se haya creado
        cookies = browser.get_cookies()
        assert "sessionid" not in [cookie["name"] for cookie in cookies], \
            "Se encontró cookie de sesión a pesar de la contraseña vacía"
        logger.info("Se verificó que no se creó la cookie de sesión con contraseña vacía")

    except Exception as e:
        take_screenshot(browser, "empty_password_error_final")
        logger.error(f"Error inesperado en prueba de contraseña vacía: {str(e)}", exc_info=True)
        pytest.fail(f"Error inesperado en prueba de contraseña vacía: {str(e)}")

def test_logout(browser):
    """Prueba de cierre de sesión"""
    logger.info("Iniciando prueba test_logout")
    try:
        # 1. Realizar login
        browser.get("http://localhost:8000/login/")
        username_field = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_field = browser.find_element(By.ID, "password")
        submit = browser.find_element(By.CSS_SELECTOR, "button.login")

        username_field.send_keys("Gerente1010")
        password_field.send_keys("cuautepec1010")
        submit.click()

        # 2. Esperar a que el login se complete
        user_profile = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#userProfile"))
        )
        take_screenshot(browser, "logged_in")

        # 3. Abrir menú desplegable
        user_profile.click()
        time.sleep(1)  # Esperar a que la animación termine

        # 4. Localizar y hacer clic en Cerrar sesión
        logout_button = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#dropdownMenu a[href='/login/logout/']"))
        )
        logout_button.click()

        # 5. Verificar redirección
        WebDriverWait(browser, 10).until(
            EC.url_contains("/login/")
        )
        assert "/login/" in browser.current_url

    except Exception as e:
        take_screenshot(browser, "error_logout")
        logger.error(f"Error en logout: {str(e)}")
        pytest.fail(f"Fallo en logout: {str(e)}")