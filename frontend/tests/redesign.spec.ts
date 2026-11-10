import { test, expect, Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("browser@medivault.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic browser test password!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Good .*Browser Test Doctor/ }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation menu" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .filter({ visible: true })
    .getByRole("button", { name, exact: true })
    .click();
}
test("ARVI screens render at reference size and settings persist", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/arvi-login.png",
    fullPage: true,
  });
  await login(page);
  await expect(
    page.getByText("Recent Patients", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open record for/ }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/arvi-dashboard.png",
    fullPage: true,
  });
  for (const [nav, title, file] of [
    ["Patients", "Patient Directory", "patients"],
    ["Medical Documents", "Medical Document Library", "documents"],
    ["User Management", "User Management", "users"],
    ["Audit Logs", "Audit Logs", "audit"],
    ["Settings", "Settings", "settings"],
  ]) {
    await navigate(page, nav);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Loading records?")).toHaveCount(0);
    await page.screenshot({
      path: `test-results/arvi-${file}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1440);
  }
  await page.getByLabel("Phone Number", { exact: true }).fill("1234567890");
  await page.getByRole("button", { name: "Save Profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await page.getByLabel("Default Patient Directory View").selectOption("table");
  await page
    .getByRole("button", { name: "Save Preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await navigate(page, "Patients");
  await expect(page.getByRole("table")).toBeVisible();
  await navigate(page, "Settings");
  await page.getByLabel("Default Patient Directory View").selectOption("grid");
  await page
    .getByRole("button", { name: "Save Preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await navigate(page, "User Management");
  await page.getByRole("button", { name: "Add User", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Synthetic New Staff");
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("newstaff@example.test");
  await dialog.getByLabel("Initial password").fill("Synthetic password 123!");
  await dialog.getByRole("button", { name: "Save User" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit Synthetic New Staff", exact:true }),
  ).toBeVisible();
  await navigate(page, "Patients");
  await page
    .getByRole("button", { name: /Open record for/ })
    .first()
    .click();
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await page.screenshot({
    path: "test-results/arvi-profile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Activity History" }).click();
  await page.screenshot({
    path: "test-results/arvi-history.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Upload Document", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/arvi-upload.png",
    fullPage: true,
  });
});
