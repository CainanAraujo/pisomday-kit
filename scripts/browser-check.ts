import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.KIT_URL ?? "http://127.0.0.1:4173/";
const output = resolve(process.env.QA_OUTPUT_DIR ?? ".qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
});

try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(baseUrl);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("O método,");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(output, "mobile.png"), fullPage: true });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();

  await page.locator("#prompt-objective").fill("Organizar este exemplo sintético");
  await page.locator("#prompt-context").fill("Não publicar nem enviar nada");
  await page.locator("#prompt-format").fill("Uma lista");
  await page.locator("#prompt-criteria").fill("Conferir todos os itens");
  await page.getByRole("button", { name: "Copiar pedido" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Objetivo: Organizar este exemplo sintético",
  );
  await expect(page.locator("#copy-status")).toContainText("Pedido copiado");

  // All names below are synthetic test examples, never participant records.
  const name = "MÁRCIA D’ÁVILA GONÇALVES DE SOUZA E CONCEIÇÃO";
  await page.getByLabel("Seu nome no certificado").fill(name);
  await page.getByRole("button", { name: "Gerar certificado" }).click();
  await expect(page.locator("#certificate-preview")).toBeVisible();
  await expect(page.locator("#certificate-preview")).toHaveAttribute("alt", new RegExp(name));
  await expect(page.locator("#certificate-placeholder")).toBeHidden();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PNG" }).click();
  const download = await downloadPromise;
  await download.saveAs(resolve(output, "certificate.png"));
  expect((await readFile(resolve(output, "certificate.png"))).subarray(0, 8).toString("hex")).toBe(
    "89504e470d0a1a0a",
  );

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Imprimir / PDF" }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole("img")).toBeVisible();
  expect(
    await popup.getByRole("img").evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(1600);
  await expect(popup.getByRole("button", { name: "Imprimir ou salvar PDF" })).toBeVisible();
  await popup.close();

  await page.getByLabel("Seu nome no certificado").fill("<script>exemplo</script>");
  await expect(page.getByRole("button", { name: "Baixar PNG" })).toBeDisabled();
  await page.getByRole("button", { name: "Gerar certificado" }).click();
  await expect(page.locator("#certificate-error")).toContainText("Use somente letras");
  await expect(page.locator("#certificate-preview")).toBeHidden();
  await page.getByLabel("Seu nome no certificado").fill("W".repeat(120));
  await page.getByRole("button", { name: "Gerar certificado" }).click();
  await expect(page.locator("#certificate-preview")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl);
  await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });
  expect(errors).toEqual([]);
  expect(requests.every((url) => new URL(url).origin === new URL(baseUrl).origin)).toBe(true);
  await context.close();

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 800 },
  });
  const plain = await noJs.newPage();
  await plain.goto(baseUrl);
  await expect(plain.locator("#role-operation-content")).toBeVisible();
  await plain.locator('label[for="role-management"]').click();
  await expect(plain.locator("#role-management-content")).toBeVisible();
  await expect(plain.locator("#role-operation-content")).toBeHidden();
  await plain.locator("#role-management").focus();
  await plain.keyboard.press("ArrowRight");
  await expect(plain.locator("#role-development-content")).toBeVisible();
  await plain.getByRole("link", { name: "Pedido completo", exact: true }).click();
  await expect(plain.locator("#prompt-output")).toBeVisible();
  await plain.getByText("Atendimento e operação", { exact: true }).first().click();
  expect(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(plain.getByRole("button", { name: "Gerar certificado" })).toBeDisabled();
  await noJs.close();
  console.log(
    "Chrome: mobile/desktop, teclado, cópia, PNG, impressão, entrada inválida, nomes longos, sem JS e zero pedidos externos passaram.",
  );
} finally {
  await browser.close();
}
