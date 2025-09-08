import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:8000/login/");
  await page.getByRole("textbox", { name: "Usuario" }).click();
  await page.getByRole("textbox", { name: "Usuario" }).press("CapsLock");
  await page.getByRole("textbox", { name: "Usuario" }).fill("G");
  await page.getByRole("textbox", { name: "Usuario" }).press("CapsLock");
  await page.getByRole("textbox", { name: "Usuario" }).fill("Gerente1010");
  await page.getByRole("textbox", { name: "Contraseña" }).click();
  await page.getByRole("textbox", { name: "Contraseña" }).fill("cuautepec1010");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByRole("button", { name: "Aceptar" }).click();
  await page.getByRole("textbox", { name: "Usuario" }).click();
  await page.getByRole("textbox", { name: "Usuario" }).press("CapsLock");
  await page.getByRole("textbox", { name: "Usuario" }).fill("A");
  await page.getByRole("textbox", { name: "Usuario" }).press("CapsLock");
  await page.getByRole("textbox", { name: "Usuario" }).fill("Ayudante0010");
  await page
    .locator("form div")
    .filter({ hasText: "Contraseña" })
    .locator("div")
    .click();
  await page
    .locator("form div")
    .filter({ hasText: "Contraseña" })
    .locator("div")
    .click();
  await page.getByRole("textbox", { name: "Contraseña" }).fill("cuautepec0010");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page
    .locator("div")
    .filter({ hasText: "📦 GESTIÓN DE PRODUCTOS" })
    .getByRole("link")
    .click();
  await page
    .getByRole("combobox", { name: "Buscar productos por ID o" })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar productos por ID o" })
    .fill("1");
  await page.getByRole("button", { name: "Buscar producto" }).click();
  await page.getByRole("textbox", { name: "Cantidad" }).click();
  await page.getByRole("textbox", { name: "Cantidad" }).fill("0");
  await page
    .getByRole("button", { name: "Ajustar cantidad manualmente" })
    .click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: " Actualizar Producto" }).click();
  await page.getByRole("button", { name: "OK" }).click();
  await page.getByRole("link", { name: "Inicio" }).click();
  await page.locator("#userProfile").getByText("Ayudante0010").click();
  await page.getByRole("link", { name: "Cerrar sesión" }).click();
});
