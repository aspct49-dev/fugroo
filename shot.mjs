import { chromium } from 'playwright';

const out = process.argv[2];
const port = process.argv[3] || '3480';
const base = `http://localhost:${port}`;

const shots = [
  ['home', '/', 1440, 900, true],
  ['home-hero', '/', 1440, 900, false],
  ['lb', '/leaderboard', 1440, 900, true],
  ['raffles', '/raffles', 1440, 800, false],
  ['mobile', '/', 390, 844, true],
];

const b = await chromium.launch();
for (const [name, path, w, h, full] of shots) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(base + path, { waitUntil: 'networkidle' });
  if (full) {
    // The card art is loading="lazy", and a fullPage capture stitches without
    // waiting for images below the fold — so walk the page first and let them
    // decode, or half the rack shoots empty.
    await p.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForLoadState('networkidle');
  }
  // Let the load sequence finish so the shot is the settled state.
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  await p.close();
  console.log('shot', name);
}

// The rack mid-burst: one card hovered, caught just after the particles clear
// the artwork.
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base, { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
const rack = p.locator('.rack').last();
await rack.scrollIntoViewIfNeeded();
await p.waitForTimeout(250);
await rack.locator('.rack-card').nth(1).hover();
await p.waitForTimeout(210);
await rack.screenshot({ path: `${out}/rack-burst.png` });
console.log('shot rack-burst');

await b.close();
