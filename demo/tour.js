/**
 * Guided walkthrough of Invasive Plant Tracker, driven by Playwright on a
 * mobile viewport, paced to look like a person actually using the app
 * (not a fast headless test run).
 *
 * This hits your REAL running app (default http://localhost:3000) and
 * creates real plant records so the flows look genuine end-to-end. To
 * avoid leaving fake data behind in your tracker, the script remembers
 * every plant it creates and deletes them again at the end — see the
 * cleanup summary printed when it finishes.
 *
 * Usage:
 *   npm install        # first time only
 *   npm run demo        # headed, mimics a person (needs a display)
 *   HEADLESS=true npm run demo   # for CI / no display available
 *
 * Env vars:
 *   BASE_URL   default http://localhost:3000
 *   HEADLESS   "true" to run headless (default: false, i.e. headed)
 *   SLOWMO     ms delay Playwright adds after every action (default 250)
 *
 * A screen recording is saved under demo/videos/ when the run finishes.
 */

const path = require("node:path");
const fs = require("node:fs");
const { chromium, devices } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS === "true";
const SLOWMO = Number(process.env.SLOWMO || 250);

// Somewhere in eastern Kansas — matches the app's default map center, so
// "locate me" / "drop pin" land somewhere sensible on screen.
const START_LAT = 39.061;
const START_LNG = -94.881;

const PHOTOS_DIR = path.join(__dirname, "..", "frontend", "public", "species-photos");
const VIDEOS_DIR = path.join(__dirname, "videos");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A pause with a bit of randomness so the pacing doesn't look robotic. */
async function beat(min = 900, max = 1800) {
  await sleep(min + Math.random() * (max - min));
}

/** Types like a person: one keystroke at a time, with a small delay. */
async function typeLikeAPerson(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 70 + Math.random() * 60 });
}

async function log(step) {
  console.log(`\n▶ ${step}`);
}

async function main() {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    geolocation: { latitude: START_LAT, longitude: START_LNG, accuracy: 8 },
    permissions: ["geolocation"],
    recordVideo: { dir: VIDEOS_DIR, size: { width: 393, height: 851 } },
  });

  const page = await context.newPage();
  const createdPlantIds = [];

  /** Waits for a plant form save to land on its detail page, and remembers the id for cleanup. */
  async function waitForPlantSaved() {
    await page.waitForURL(/\/plants\/[^/]+$/, { timeout: 15000 });
    const id = page.url().split("/plants/")[1];
    if (id && !id.startsWith("local-")) createdPlantIds.push(id);
    return id;
  }

  try {
    // ---------------------------------------------------------------
    // 1. The map: the app's home screen
    // ---------------------------------------------------------------
    await log("Opening the map");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await beat(1500, 2200);

    await log("Showing my current location");
    await page.getByRole("button", { name: "Show my current location on the map" }).click();
    await beat(1200, 1800);

    // A gentle pan, like someone getting their bearings.
    const mapEl = page.locator(".leaflet-container");
    const mapBox = await mapEl.boundingBox();
    if (mapBox) {
      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBox.x + mapBox.width / 2 - 60, mapBox.y + mapBox.height / 2 - 40, { steps: 12 });
      await page.mouse.up();
    }
    await beat();

    // ---------------------------------------------------------------
    // 2. Drop a pin at the current GPS location and fill out the form
    // ---------------------------------------------------------------
    await log("Dropping a pin at the current GPS location");
    await page.getByRole("button", { name: "Drop pin at current GPS location" }).click();
    await page.waitForURL(/\/add\?/);
    await beat(1200, 1800);

    await log("Identifying the plant from a photo (Pl@ntNet)");
    const identifyButton = page.getByRole("button", { name: /Identify from photo/ });
    if (await identifyButton.isVisible()) {
      await identifyButton.click();
      await page.locator('input[type="file"]').setInputFiles(path.join(PHOTOS_DIR, "musk-thistle-habit.jpg"));
      await beat(2000, 3000);
      const suggestionChip = page.locator('button[class*="identifyChip"]:not([disabled])').first();
      if (await suggestionChip.count()) {
        await log("Tapping the top suggestion to select the species");
        await suggestionChip.click();
        await beat();
      } else {
        await log("No confident match — picking the species from the dropdown instead");
        await page.locator("#species").selectOption({ label: "Musk thistle" });
        await beat();
      }
    } else {
      await page.locator("#species").selectOption({ label: "Musk thistle" });
      await beat();
    }

    await log("Filling in notes and status");
    await typeLikeAPerson(page.locator("#notes"), "Small isolated clump near the creek trail, a few nodding flower heads just opening.");
    await beat();
    await page.locator("#status").selectOption({ label: "In progress" });
    await beat();
    await typeLikeAPerson(page.locator("#method"), "hand-pull");
    await beat();

    await log("Saving the plant");
    await page.getByRole("button", { name: "Save plant" }).click();
    await waitForPlantSaved();
    await beat(1500, 2000);

    // ---------------------------------------------------------------
    // 3. Plant detail: status change, a logged treatment, a photo
    // ---------------------------------------------------------------
    await log("Marking it removed from the detail page");
    await page.getByRole("button", { name: "Removed", exact: true }).click();
    await beat(1200, 1600);

    await log("Logging a treatment");
    await typeLikeAPerson(page.locator('input[placeholder^="Method"]'), "hand-pull");
    await typeLikeAPerson(page.locator('textarea[placeholder^="Outcome"]'), "Whole root removed, soil disturbed area tamped down.");
    await beat();
    await page.getByRole("button", { name: "Log treatment" }).click();
    await beat(1200, 1600);

    await log("Attaching a photo to the record");
    const photoInput = page.locator('input[type="file"]').first();
    if (await photoInput.count()) {
      await photoInput.setInputFiles(path.join(PHOTOS_DIR, "musk-thistle-habit.jpg"));
      await beat(1500, 2000);
    }

    // ---------------------------------------------------------------
    // 4. Plants list: sort and filter
    // ---------------------------------------------------------------
    await log("Opening the Plants list");
    await page.locator("nav").getByRole("link", { name: "Plants" }).click();
    await beat(1200, 1600);

    await log("Sorting by status");
    await page.getByRole("columnheader", { name: /Status/ }).click();
    await beat();

    await log("Filtering out planned plants");
    const plannedChip = page.locator("label").filter({ hasText: "Planned" }).first();
    if (await plannedChip.count()) {
      await plannedChip.locator('input[type="checkbox"]').click();
      await beat();
    }

    // ---------------------------------------------------------------
    // 5. Calendar
    // ---------------------------------------------------------------
    await log("Checking the calendar for today's activity");
    await page.locator("nav").getByRole("link", { name: "Calendar" }).click();
    await beat(1500, 2000);
    const todayCell = page.locator('[class*="today"]').first();
    if (await todayCell.count()) {
      await todayCell.click();
      await beat();
    }

    // ---------------------------------------------------------------
    // 6. Species guide
    // ---------------------------------------------------------------
    await log("Browsing the species guide");
    await page.locator("nav").getByRole("link", { name: "Guide" }).click();
    await beat(1200, 1600);
    await typeLikeAPerson(page.getByPlaceholder("Search species by name…"), "olive");
    await beat(1500, 2000);
    await page.getByPlaceholder("Search species by name…").fill("");
    await beat();

    // ---------------------------------------------------------------
    // 7. Draw a patch by tapping vertices on the map
    // ---------------------------------------------------------------
    await log("Back to the map to draw a patch by tapping");
    await page.locator("nav").getByRole("link", { name: "Map" }).click();
    await beat(1500, 2000);

    await page.getByRole("button", { name: "Draw a patch outline" }).click();
    await beat();
    const mapBox2 = await mapEl.boundingBox();
    if (mapBox2) {
      const points = [
        [0.32, 0.38],
        [0.62, 0.34],
        [0.68, 0.58],
        [0.4, 0.62],
      ];
      for (const [fx, fy] of points) {
        await mapEl.click({ position: { x: mapBox2.width * fx, y: mapBox2.height * fy } });
        await beat(500, 900);
      }
    }
    await log("Finishing the patch outline");
    await page.getByRole("button", { name: "Finish" }).click();
    await beat(1200, 1600);

    await page.locator("#species").selectOption({ label: "Sericea lespedeza (Chinese bush clover)" });
    await beat();
    await page.getByRole("button", { name: "Save plant" }).click();
    await waitForPlantSaved();
    await beat(1500, 2000);

    // ---------------------------------------------------------------
    // 8. Walk a patch outline live with GPS ("walk mode")
    // ---------------------------------------------------------------
    await log("Back to the map to walk a patch outline with GPS");
    await page.locator("nav").getByRole("link", { name: "Map" }).click();
    await beat(1500, 2000);

    await page.getByRole("button", { name: "Walk a patch outline using GPS" }).click();
    await beat();

    const walkedPath = [
      [START_LAT + 0.00006, START_LNG + 0.00004],
      [START_LAT + 0.00006, START_LNG - 0.00004],
      [START_LAT - 0.00002, START_LNG - 0.00006],
      [START_LAT - 0.00006, START_LNG - 0.00002],
      [START_LAT - 0.00004, START_LNG + 0.00005],
      [START_LAT + 0.00002, START_LNG + 0.00006],
    ];
    for (const [lat, lng] of walkedPath) {
      await context.setGeolocation({ latitude: lat, longitude: lng, accuracy: 5 });
      await beat(700, 1100);
    }

    await log("Finishing the walked patch outline");
    const finishWalk = page.getByRole("button", { name: "Finish" });
    if (await finishWalk.isEnabled().catch(() => false)) {
      await finishWalk.click();
      await beat(1200, 1600);
      await page.locator("#species").selectOption({ label: "Leafy spurge" });
      await beat();
      await page.getByRole("button", { name: "Save plant" }).click();
      await waitForPlantSaved();
      await beat(1500, 2000);
    } else {
      await log("Not enough walked points captured — cancelling this patch");
      await page.getByRole("button", { name: "Cancel" }).click();
      await beat();
    }

    // ---------------------------------------------------------------
    // 9. Filters panel
    // ---------------------------------------------------------------
    await log("Back on the map, opening the filters panel");
    await page.locator("nav").getByRole("link", { name: "Map" }).click();
    await beat(1200, 1600);
    await page.getByRole("button", { name: "Open filters" }).click();
    await beat();
    const removedChip = page.locator("label").filter({ hasText: "Removed" }).first();
    if (await removedChip.count()) {
      await removedChip.locator('input[type="checkbox"]').click();
      await beat();
    }
    await page.getByRole("button", { name: "Close filters" }).click();
    await beat(1500, 2000);

    console.log("\n✅ Tour finished.");
  } finally {
    await context.close();
    await browser.close();

    if (createdPlantIds.length > 0) {
      console.log(`\n🧹 Cleaning up ${createdPlantIds.length} demo plant(s) created during this run...`);
      for (const id of createdPlantIds) {
        try {
          const res = await fetch(`${BASE_URL}/api/plants/${id}`, { method: "DELETE" });
          console.log(`   ${res.ok ? "deleted" : `FAILED (${res.status})`} ${id}`);
        } catch (err) {
          console.log(`   FAILED ${id}: ${err.message}`);
        }
      }
    } else {
      console.log("\n(No demo plants were created, nothing to clean up.)");
    }

    const files = fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith(".webm"));
    const latest = files.sort().pop();
    if (latest) console.log(`\n🎥 Recording saved to demo/videos/${latest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
