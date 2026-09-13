import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function loadDeviceIdHelper(html, window) {
  const start = html.indexOf("let memoryDeviceId");
  const end = html.indexOf("async function loadParticipants");
  const helperSource = html.slice(start, end);

  return new Function(
    "window",
    `${helperSource}; return getLocalDeviceId;`,
  )(window);
}

function loadFetchTimeoutHelper(html, fetchImpl) {
  const start = html.indexOf("function fetchWithTimeout");
  const end = html.indexOf("async function readJsonResponse");
  const helperSource = html.slice(start, end);

  return new Function(
    "fetch",
    `${helperSource}; return fetchWithTimeout;`,
  )(fetchImpl);
}

test("attendance device ID works on older or storage-restricted browsers", async () => {
  const html = await readFile("public/absen.html", "utf8");
  const blockedStorage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {
      throw new Error("storage blocked");
    },
  };
  const getDeviceId = loadDeviceIdHelper(html, {
    localStorage: blockedStorage,
    crypto: {
      getRandomValues(values) {
        values.fill(123456789);
      },
    },
  });

  const firstId = getDeviceId();

  assert.ok(firstId);
  assert.equal(getDeviceId(), firstId);
  assert.doesNotMatch(html, /crypto\.randomUUID|\.replaceAll\(/);

  const getFallbackId = loadDeviceIdHelper(html, {
    localStorage: blockedStorage,
    crypto: {
      getRandomValues() {
        throw new Error("crypto unavailable");
      },
    },
  });

  assert.ok(getFallbackId());
});

test("public attendance form has a local styled picker without CDN", async () => {
  const html = await readFile("public/absen.html", "utf8");

  assert.doesNotMatch(html, /cdn\.jsdelivr|fonts\.googleapis|SweetAlert|Swal\./i);
  assert.match(html, /<button[\s\S]*?id="kelompokSelect"/);
  assert.match(html, /<button[\s\S]*?id="participantSelect"/);
  assert.match(html, /id="pickerSheet"[\s\S]*?role="dialog"/);
  assert.match(html, /id="pickerOptions"[\s\S]*?role="listbox"/);
  assert.doesNotMatch(html, /id="pickerSearch"|class="picker-search"/);
  assert.match(html, /\.picker-overlay\s*\{[\s\S]*?align-items: center/);
  assert.match(html, /container\.scrollTop = 0/);
  assert.match(html, /function openPicker\(type\)/);
  assert.match(html, /function selectPickerItem\(item\)/);
  assert.match(html, /id="messageOverlay"[\s\S]*?class="message-overlay"/);
  assert.match(html, /id="messageDialog"[\s\S]*?role="alertdialog"/);
  assert.doesNotMatch(html, /id="messageBox"/);
});

test("attendance form explains failures and offers a safe retry", async () => {
  const [html, api] = await Promise.all([
    readFile("public/absen.html", "utf8"),
    readFile("api/index.js", "utf8"),
  ]);
  const fetchWithTimeout = loadFetchTimeoutHelper(
    html,
    () => new Promise(() => {}),
  );
  const participantEndpoint = api.slice(
    api.indexOf('app.get("/api/participants"'),
    api.indexOf('app.post("/api/attendance"'),
  );
  const attendanceEndpoint = api.slice(
    api.indexOf('app.post("/api/attendance"'),
    api.indexOf('app.get("/api/attendance/:sessionId"'),
  );

  await assert.rejects(fetchWithTimeout("/api/test", undefined, 5), (error) => {
    return error.code === "REQUEST_TIMEOUT";
  });

  assert.match(html, /id="messageRetryBtn"[\s\S]*?Coba Lagi/);
  assert.match(html, /overlay\.className = `message-overlay \$\{type\}`/);
  assert.match(html, /const isLoading = type === "loading"/);
  assert.match(html, /QR Tidak Valid/);
  assert.match(html, /Waktu Tunggu Habis/);
  assert.match(html, /Koneksi Bermasalah/);
  assert.match(api, /code: "SESSION_NOT_STARTED"/);
  assert.match(api, /code: "SESSION_ENDED"/);
  assert.match(api, /code: "QR_EXPIRED"/);
  assert.match(api, /code: "PARTICIPANT_INACTIVE"/);
  assert.match(api, /code: "ATTENDANCE_SAVE_FAILED"/);
  assert.doesNotMatch(participantEndpoint, /error:\s*\w+\.message/);
  assert.doesNotMatch(attendanceEndpoint, /error:\s*\w+\.message/);
});

test("participant picker refreshes and hides names already present", async () => {
  const html = await readFile("public/absen.html", "utf8");
  const openPickerSource = html.slice(
    html.indexOf("async function openPicker"),
    html.indexOf("function closePicker"),
  );

  assert.match(
    openPickerSource,
    /type === "participant"[\s\S]*await refreshParticipantsForPicker\(\)/,
  );
  assert.match(html, /return !participant\.isPresent/);
  assert.match(html, /attendedParticipant\.isPresent = true/);
  assert.match(html, /participant\.isPresent = true/);
});
