import { test, expect, chromium } from "@playwright/test";

test("login visible", async () => {
  // Abrir navegador visible manualmente
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Ir a login
  await page.goto("http://localhost:8000/login/");

  // Llenar formulario
  await page.getByRole("textbox", { name: "Usuario" }).fill("Ayudante0010");
  await page.getByRole("textbox", { name: "Contraseña" }).fill("cuautepec0010");
  await page.getByRole("button", { name: "Ingresar" }).click();

  // Perfil y cerrar sesión
  await page.locator("#userProfile").getByText("Ayudante0010").click();
  await page.getByRole("link", { name: "Cerrar sesión" }).click();

  // Cerrar navegador
  await browser.close();
});
