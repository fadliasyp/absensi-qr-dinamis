import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("QR attendance queries use parallel phases and minimum columns", async () => {
  const api = await readFile("api/index.js", "utf8");
  const qrEndpoint = api.slice(
    api.indexOf('app.get("/api/qr/:sessionId"'),
    api.indexOf('app.get("/api/participants"'),
  );
  const participantEndpoint = api.slice(
    api.indexOf('app.get("/api/participants"'),
    api.indexOf('app.post("/api/attendance"'),
  );
  const attendanceEndpoint = api.slice(
    api.indexOf('app.post("/api/attendance"'),
    api.indexOf('app.get("/api/attendance/:sessionId"'),
  );

  assert.equal(participantEndpoint.match(/Promise\.all\(/g)?.length, 1);
  assert.equal(attendanceEndpoint.match(/Promise\.all\(/g)?.length, 2);
  assert.doesNotMatch(qrEndpoint, /Promise\.all\(/);
  assert.match(
    qrEndpoint,
    /\.select\("id, judul, is_active, start_time, end_time"\)/,
  );
  assert.doesNotMatch(participantEndpoint, /\.select\("\*"\)/);
  assert.doesNotMatch(attendanceEndpoint, /\.select\("\*"\)/);
  assert.doesNotMatch(attendanceEndpoint, /\.select\(\)/);
  assert.match(attendanceEndpoint, /\.eq\("local_device_id", localDeviceId\)/);
  assert.match(attendanceEndpoint, /\.eq\("cookie_device_id", cookieDeviceId\)/);
});
