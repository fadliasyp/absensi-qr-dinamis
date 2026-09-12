import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

for (const file of ["public/alfa-wa.html", "public/pengumuman-wa.html"]) {
  test(`${file} has valid inline JavaScript`, async () => {
    const html = await readFile(file, "utf8");
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];

    assert.ok(scripts.length > 0);
    scripts.forEach(([, source]) => new Function(source));
  });
}
