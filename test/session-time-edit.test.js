import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("session active period can be edited without replacing its QR token", async () => {
  const api = await readFile("api/index.js", "utf8");
  const admin = await readFile("public/admin-session.html", "utf8");
  const editEndpoint = api.slice(
    api.indexOf('app.put("/api/sessions/:sessionId"'),
    api.indexOf("// Endpoint untuk kirim WA ke yg ALFA"),
  );

  assert.match(api, /app\.put\("\/api\/sessions\/:sessionId"/);
  assert.match(api, /Masa aktif sesi yang sudah difinalisasi tidak dapat diubah/);
  assert.match(api, /\.update\(\{ expired_at: updatedTimes\.end_time \}\)/);
  assert.doesNotMatch(editEndpoint, /\.delete\(\)/);
  assert.match(admin, /class="action-link edit edit-session-btn"/);
  assert.match(admin, /method: "PUT"/);
});
