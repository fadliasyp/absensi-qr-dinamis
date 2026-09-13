import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("attendance no longer uses geolocation but keeps one-device checks", async () => {
  const [api, attendancePage, sessionPage, migration] = await Promise.all([
    readFile("api/index.js", "utf8"),
    readFile("public/absen.html", "utf8"),
    readFile("public/admin-session.html", "utf8"),
    readFile(
      "supabase/migrations/20260913000000_remove_geolocation_requirements.sql",
      "utf8",
    ),
  ]);
  const activeFlow = `${api}\n${attendancePage}\n${sessionPage}`;

  for (const removed of [
    "navigator.geolocation",
    "userLatitude",
    "userLongitude",
    "distanceMeters",
    "radius_meters",
    "/api/locations",
  ]) {
    assert.doesNotMatch(activeFlow, new RegExp(removed.replace(".", "\\.")));
  }

  assert.match(api, /\.eq\("local_device_id", localDeviceId\)/);
  assert.match(api, /\.eq\("cookie_device_id", cookieDeviceId\)/);
  assert.ok((api.match(/code: "DEVICE_ALREADY_USED"/g) || []).length >= 2);
  assert.match(attendancePage, /getLocalDeviceId\(\)/);
  assert.match(attendancePage, /localDeviceId/);
  assert.match(sessionPage, /Nama Tempat \(Opsional\)/);
  assert.ok((migration.match(/drop not null/g) || []).length >= 6);
});
