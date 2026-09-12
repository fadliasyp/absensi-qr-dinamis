import assert from "node:assert/strict";
import test from "node:test";

test("WA contact status is kept separately per session and message type", async () => {
  const values = new Map();
  const events = new EventTarget();

  class TestCustomEvent extends Event {
    constructor(type, options) {
      super(type);
      this.detail = options.detail;
    }
  }

  Object.defineProperties(globalThis, {
    localStorage: {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
      },
    },
    addEventListener: {
      configurable: true,
      value: events.addEventListener.bind(events),
    },
    removeEventListener: {
      configurable: true,
      value: events.removeEventListener.bind(events),
    },
    dispatchEvent: {
      configurable: true,
      value: events.dispatchEvent.bind(events),
    },
    CustomEvent: { configurable: true, value: TestCustomEvent },
  });

  await import(`../public/wa-contact-status.js?test=${Date.now()}`);

  const status = globalThis.WaContactStatus;
  let changes = 0;
  const unsubscribe = status.subscribe("alfa", "session-1", () => changes++);

  assert.equal(status.get("alfa", "session-1", "participant-1"), null);
  assert.equal(
    status.mark("alfa", "session-1", "participant-1"),
    true,
  );
  assert.ok(status.get("alfa", "session-1", "participant-1"));
  assert.equal(
    status.get("announcement", "session-1", "participant-1"),
    null,
  );
  assert.equal(
    status.get("alfa", "session-2", "participant-1"),
    null,
  );
  assert.equal(
    status.clear("alfa", "session-1", "participant-1"),
    true,
  );
  assert.equal(status.get("alfa", "session-1", "participant-1"), null);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(changes, 2);
  unsubscribe();

  delete globalThis.localStorage;
  delete globalThis.addEventListener;
  delete globalThis.removeEventListener;
  delete globalThis.dispatchEvent;
  delete globalThis.CustomEvent;
  delete globalThis.WaContactStatus;
});
