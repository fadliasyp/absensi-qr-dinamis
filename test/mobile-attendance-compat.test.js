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

test("public attendance form has no blocking third-party UI dependency", async () => {
  const html = await readFile("public/absen.html", "utf8");

  assert.doesNotMatch(html, /cdn\.jsdelivr|fonts\.googleapis|SweetAlert|Swal\./i);
  assert.match(html, /<select[^>]+id="kelompokSelect"/);
  assert.match(html, /<select[\s\S]*?id="participantSelect"/);
  assert.match(html, /id="messageBox"[\s\S]*?aria-live="polite"/);
});
