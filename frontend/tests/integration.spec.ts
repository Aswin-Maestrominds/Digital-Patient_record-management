import { test, expect, Page } from "@playwright/test";
import { syntheticPdf } from "./pdf-fixture";
import { readFile } from "node:fs/promises";

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email Address").fill("browser@medivault.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic browser test password!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Good .*Browser Test Doctor/ }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .filter({ visible: true })
    .getByRole("button", { name, exact: true })
    .click();
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`complete patient/document workflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await login(page);
    await navigate(page, "Patients");
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await page
      .getByLabel("Search patient directory")
      .fill("Synthetic Directory 00");
    await expect(
      page.getByRole("button", {
        name: "Open record for Synthetic Directory 00",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Register Patient", exact: true })
      .click();
    const name = `Synthetic Browser Patient ${viewport.width}`;
    await page.getByLabel("Full name *", { exact: true }).fill(name);
    await page
      .getByLabel("Date of birth *", { exact: true })
      .fill("1995-04-12");
    await page
      .getByRole("combobox", { name: "Gender *", exact: true })
      .selectOption("Female");
    await page.getByLabel("Phone *", { exact: true }).fill("0000000000");
    await page.getByText("Additional details", { exact: true }).click();
    await page
      .getByRole("combobox", { name: "Blood group", exact: true })
      .selectOption("O+");
    await page.getByLabel("Contact phone", { exact: true }).fill("1111111111");
    await page
      .getByRole("button", { name: "Register Patient", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No documents uploaded yet.")).toBeVisible();
    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.getByText("Additional details", { exact: true }).click();
    await page
      .getByRole("combobox", { name: "Blood group", exact: true })
      .selectOption("");
    await page.getByLabel("Contact phone", { exact: true }).fill("");
    await page
      .getByLabel("Optional Notes", { exact: true })
      .fill("Synthetic integration note");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Synthetic integration note", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("1111111111", { exact: true })).toHaveCount(0);
    await page.getByText("Record actions", { exact: true }).click();
    await page
      .getByRole("button", { name: "Patient Card", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(name);
    await page.getByRole("button", { name: "Close patient card" }).click();

    await page
      .getByRole("button", { name: "Upload Document", exact: true })
      .click();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    await page.getByLabel("Document file", { exact: true }).setInputFiles({
      name: "synthetic-image.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page
      .getByLabel("Title *", { exact: true })
      .fill(`Synthetic Report ${viewport.width}`);
    await page
      .getByRole("combobox", { name: "Category *", exact: true })
      .selectOption("Pharmacy Bill");
    await page.getByLabel("Report date *", { exact: true }).fill("2020-05-12");
    await page.getByRole("button", { name: "Upload Document" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Synthetic Report ${viewport.width}`,
        exact: true,
      }),
    ).toBeVisible();
    const image = page.getByRole("img", {
      name: `Synthetic Report ${viewport.width}`,
      exact: true,
    });
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBe(1);
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Original" }).click();
    expect((await downloadEvent).suggestedFilename()).toBe(
      "synthetic-image.png",
    );
    await page.getByRole("button", { name: "Back to Patient Record" }).click();
    await expect(
      page.getByRole("tab", { name: "Medical Documents (1)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("synthetic-image.png", { exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Good .*Browser Test Doctor/ }),
    ).toBeVisible();
    await navigate(page, "Patients");
    await page.getByLabel("Search patient directory").fill(name);
    await page
      .getByRole("button", { name: `Open record for ${name}`, exact: true })
      .click();
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith("medivault")),
      ),
    ).toEqual([]);
    const docWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(docWidth).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({
      path: `test-results/patient-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("tab", { name: "Medical Documents (1)", exact: true })
      .click();
    const deleteReport = page.getByRole("button", {
      name: `Delete Synthetic Report ${viewport.width}`,
      exact: true,
    });
    page.once("dialog", (dialog) => dialog.dismiss());
    await deleteReport.click();
    await expect(deleteReport).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await deleteReport.click();
    await expect(
      page.getByRole("tab", { name: "Medical Documents (0)", exact: true }),
    ).toBeVisible();
    await expect(deleteReport).toHaveCount(0);
    await page.getByRole("tab", { name: "Overview", exact: true }).click();
    await page.getByText("Record actions", { exact: true }).click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: "Delete Patient", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Delete Patient", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Patient Directory", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Search patient directory").fill(name);
    await expect(
      page.getByText("No patients match this search."),
    ).toBeVisible();
    await navigate(page, "Audit Logs");
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("DOCUMENT_UPLOAD");
    await expect(
      page
        .getByRole("cell", { name: "Document uploaded", exact: true })
        .first(),
    ).toBeVisible();
    await navigate(page, "Settings");
    await page.getByRole("button", { name: "Sign Out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}

test("PDF upload previews original bytes and rejects oversize or unsupported files", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Patients");
  await page
    .getByLabel("Search patient directory")
    .fill("Synthetic Directory 00");
  await page
    .getByRole("button", {
      name: "Open record for Synthetic Directory 00",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Upload Document", exact: true })
    .click();
  await expect(page.getByText(/Maximum 1 MB/)).toBeVisible();
  await page.getByLabel("Document file", { exact: true }).setInputFiles({
    name: "not-supported.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a PDF, JPG or PNG",
  );
  await page.getByLabel("Document file", { exact: true }).setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("1 MB or smaller");
  const pdf = syntheticPdf();
  await page.getByLabel("Document file", { exact: true }).setInputFiles({
    name: "synthetic-report.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByLabel("Report date *", { exact: true }).fill("2020-05-12");
  await page.getByRole("button", { name: "Upload Document" }).click();
  await expect(page.getByTitle("Medical document PDF")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(page.getByTitle("Medical document PDF")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Original" }).click();
  const download = await downloadEvent;
  expect(await readFile((await download.path())!)).toEqual(pdf);
});

test("failed login, server failures and expired sessions are visible without exposing stale records", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByLabel("Email Address").fill("browser@medivault.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password",
  );
  await login(page);
  await page.route("**/api/patients?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Synthetic server failure" }),
    }),
  );
  await navigate(page, "Patients");
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic server failure",
  );
  await page.unroute("**/api/patients?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("button", { name: /^Open record for/ }).first(),
  ).toBeVisible();
  await context.clearCookies();
  await page.getByLabel("Search patient directory").fill("Directory 00");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("session has expired");
  await expect(
    page.getByRole("button", { name: /^Open record for/ }),
  ).toHaveCount(0);
});
