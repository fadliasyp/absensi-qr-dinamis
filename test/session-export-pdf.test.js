import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("session attendance PDF uses compact rows without changing its visual style", async () => {
  const api = await readFile("api/index.js", "utf8");
  const route = api.match(
    /^app\.get\("\/api\/sessions\/:sessionId\/export-pdf"[\s\S]*?^    doc\.end\(\);/m,
  )?.[0];

  assert.ok(route, "active session PDF route was not found");
  assert.match(route, /layout: "landscape"/);
  assert.match(route, /const rowHeight = 18/);
  assert.match(route, /const headerHeight = 28/);
  assert.match(route, /fontSize\(8\.5\)/);
  assert.match(route, /roundedRect\(x \+ 7, y \+ 2, col\.width - 14, 14, 999\)/);
  assert.match(route, /fill\("#f4f8ff"\)/);
});
