import assert from "node:assert/strict";
import test from "node:test";

test("WA message templates stay separate per session and message type", async () => {
  const values = new Map();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });

  await import(`../public/wa-message-template.js?test=${Date.now()}`);

  const templates = globalThis.WaMessageTemplate;
  assert.equal(templates.set("alfa", "session-1", "Halo {nama}, {nama}"), true);
  assert.equal(templates.get("alfa", "session-1"), "Halo {nama}, {nama}");
  assert.equal(templates.get("announcement", "session-1"), "");
  assert.equal(templates.get("alfa", "session-2"), "");
  assert.equal(
    templates.render(templates.get("alfa", "session-1"), { nama: "Fadli" }),
    "Halo Fadli, Fadli",
  );
  assert.equal(templates.clear("alfa", "session-1"), true);
  assert.equal(templates.get("alfa", "session-1"), "");

  delete globalThis.localStorage;
  delete globalThis.WaMessageTemplate;
});
