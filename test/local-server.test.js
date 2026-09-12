import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

test("npm start entrypoint serves the public application", async (t) => {
  const port = 32000 + (process.pid % 10000);
  const child = spawn(process.execPath, ["api/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  t.after(() => child.kill());

  let response;
  let serverError = "";
  child.stderr.on("data", (data) => (serverError += String(data)));

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/login.html`);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  assert.ok(response, `Local server tidak siap. ${serverError}`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Login Admin Absensi<\/title>/);

  const unauthorizedDelete = await fetch(
    `http://127.0.0.1:${port}/api/admin-users/test-admin`,
    { method: "DELETE" },
  );
  const unauthorizedResult = await unauthorizedDelete.json();

  assert.equal(unauthorizedDelete.status, 401);
  assert.equal(unauthorizedResult.success, false);
});
