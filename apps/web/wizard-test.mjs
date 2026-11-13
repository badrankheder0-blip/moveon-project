/**
 * Drives the booking planner through the real UI, against the live API.
 *
 * The point is to prove the whole path works — address search through our
 * geocoding endpoint, the room-by-room inventory built from the catalog, the
 * step gating, the step and the answers surviving a refresh, the server
 * pricing the plan, and the booking turning into orders plus a request for the
 * work the team prices by hand. A screenshot of the welcome screen proves none
 * of that.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
const check = (label, ok, detail = "") => {
  if (!ok) failures.push(label);
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
};

page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));

const step = () => new URL(page.url()).searchParams.get("step");

/** The rail's primary button, which every step carries. */
async function next() {
  const before = step();
  await page.locator("aside button.justify-between").click();
  await page.waitForTimeout(900);
  return before !== step();
}

/** Types an address and takes the first suggestion. */
async function address(selector, text) {
  await page.fill(selector, text);
  await page.waitForSelector('[role="listbox"] button', { timeout: 15_000 });
  await page.locator('[role="listbox"] button').first().click();
  await page.waitForTimeout(300);
}

console.log("\n— a move with a cleaning and a junk removal —\n");

await page.goto(`${WEB}/en/rechner`, { waitUntil: "networkidle" });
await page.evaluate(() => sessionStorage.clear());
await page.reload({ waitUntil: "networkidle" });

check("the welcome screen asks who is booking", (await page.locator("h1").textContent())?.includes("fresh start"));
await page.locator("main button").first().click();
await page.waitForTimeout(800);
check("private customers start at services", step() === "services");

check("services block an empty choice", !(await next()) && (await page.locator('[role="alert"]').count()) > 0);

await page.locator("[aria-pressed]").nth(0).click(); // moving
await page.locator("[aria-pressed]").nth(2).click(); // cleaning
await page.locator("[aria-pressed]").nth(3).click(); // junk removal
await next();
check("services lead to addresses", step() === "address");

await address("#address-from", "Berliner Allee 10 Düsseldorf");
await address("#address-to", "Königsallee 20 Düsseldorf");
check("both addresses come from the lookup", (await page.locator('[title="Address confirmed"]').count()) === 2);
await next();
check("addresses lead to access details", step() === "property");

for (const key of ["from", "to"]) {
  await page.selectOption(`#property-${key}-floor`, "2");
  await page.selectOption(`#property-${key}-parking`, "streetClose");
}
await page.locator('input[name="method"][value="items"]').check();
await next();
check("access details lead to the home", step() === "home");

// The inventory: one room, two catalog items found by search.
await page.locator("button:has-text('Add a room')").click();
await page.locator('[role="dialog"] button:has-text("Living room")').click();
for (const query of ["Sofa", "Bücher"]) {
  await page.fill('input[type="search"]', query);
  await page.locator("ul button").first().click();
}
const unanswered = await page.locator('select[aria-invalid="true"]').count();
for (let i = 0; i < unanswered; i += 1) {
  await page.locator('select[aria-invalid="true"]').first().selectOption("both");
}
check("items are added from the catalog", (await page.locator("li:has(button[aria-label^='Remove'])").count()) >= 2);
check("the home cannot be left without the extra-items note", !(await next()));
await page.check("#accept-extra");
await next();
check("the home leads to crew and extras", step() === "extras");
await next();

// Cleaning at the new home, junk removal at the old one — the defaults.
await page.locator("input[type='checkbox'][id$='-move']").check();
await page.locator("input[id$='-area']").fill("70");
await next();
check("cleaning leads to junk removal", step() === "disposal");
await page.locator("button[aria-label^='Increase Large furniture']").click();
await next();
await next(); // photos are optional

check("the step lives in the URL", step() === "schedule");
await page.reload({ waitUntil: "networkidle" });
const kept = await page.evaluate(() => JSON.parse(sessionStorage.getItem("mon.planner.v1") ?? "{}").moving?.rooms?.length ?? 0);
check("answers survive a refresh", kept === 1, `rooms=${kept}`);

// One date and window per job, on days the availability endpoint offers.
for (let job = 0; job < 3; job += 1) {
  const tasks = page.locator("button[aria-pressed]").filter({ hasText: /Moving|Cleaning|Junk/ });
  if ((await tasks.count()) > job) await tasks.nth(job).click();
  await page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: /^\d+$/ }).nth(job + 2).click();
  await page.locator('input[type="radio"]').nth(1).check();
}
await next();
check("the schedule leads to review", step() === "review");

await page.waitForSelector("text=/Cost breakdown/", { timeout: 25_000 });
// The subtotal waits for every priced job, so it is the last figure to arrive.
await page.waitForFunction(() => /\d/.test(document.querySelector("aside .tabular-nums")?.textContent ?? ""), null, {
  timeout: 25_000,
});
const total = await page.locator("aside .tabular-nums").first().textContent();
check("the server prices the move and the cleaning", /\d/.test(total ?? ""), total ?? "");
check("junk removal is left to the team", (await page.locator("text=Collection and disposal fees are confirmed by the team.").count()) > 0);

await next();
check("review leads to payment", step() === "payment");

await page.fill("#auth-name", "Alex Morgan");
await page.fill("#auth-phone", "+49 176 1234567");
await page.fill("#auth-email", `planner-${Date.now()}@example.com`);
await page.fill("#auth-password", "planner-test-123");
await page.fill("#auth-confirm", "planner-test-123");
await page.locator("form button[type=submit]").click();
await page.waitForSelector("text=Not you? Sign out", { timeout: 15_000 });
await page.fill("#contact-phone", "+49 176 1234567");
await page.check("#terms");
await page.locator("aside button.justify-between").click();

await page.waitForSelector("text=/Your booking is with us/", { timeout: 30_000 });
const references = await page.locator("main .font-mono").allTextContents();
check("two orders are booked", references.filter((ref) => !ref.startsWith("ANF")).length === 2, references.join(", "));
check("the junk removal goes to the team as a request", references.some((ref) => ref.startsWith("ANF")));

console.log(`\n${failures.length === 0 ? "the planner works end to end" : `${failures.length} failure(s)`}`);
if (failures.length) console.log("  " + failures.join("\n  "));

await browser.close();
process.exit(failures.length === 0 ? 0 : 1);
