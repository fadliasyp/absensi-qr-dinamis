(function () {
  const prefix = "wa_contact_status";

  function storageKey(type, sessionId) {
    return `${prefix}:${type}:${sessionId}`;
  }

  function read(type, sessionId) {
    try {
      const value = JSON.parse(
        globalThis.localStorage.getItem(storageKey(type, sessionId)) || "{}",
      );

      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  }

  function write(type, sessionId, value) {
    const key = storageKey(type, sessionId);

    try {
      globalThis.localStorage.setItem(key, JSON.stringify(value));

      if (
        typeof globalThis.dispatchEvent === "function" &&
        typeof globalThis.CustomEvent === "function"
      ) {
        globalThis.setTimeout(() => {
          globalThis.dispatchEvent(
            new globalThis.CustomEvent("wa-contact-status-change", {
              detail: key,
            }),
          );
        }, 0);
      }

      return true;
    } catch {
      return false;
    }
  }

  function get(type, sessionId, participantId) {
    return read(type, sessionId)[String(participantId)] || null;
  }

  function mark(type, sessionId, participantId) {
    const value = read(type, sessionId);
    value[String(participantId)] = new Date().toISOString();
    return write(type, sessionId, value);
  }

  function clear(type, sessionId, participantId) {
    const value = read(type, sessionId);
    delete value[String(participantId)];
    return write(type, sessionId, value);
  }

  function subscribe(type, sessionId, callback) {
    const key = storageKey(type, sessionId);
    const onStorage = (event) => event.key === key && callback();
    const onLocalChange = (event) => event.detail === key && callback();

    globalThis.addEventListener("storage", onStorage);
    globalThis.addEventListener("wa-contact-status-change", onLocalChange);

    return function unsubscribe() {
      globalThis.removeEventListener("storage", onStorage);
      globalThis.removeEventListener(
        "wa-contact-status-change",
        onLocalChange,
      );
    };
  }

  globalThis.WaContactStatus = Object.freeze({
    read,
    get,
    mark,
    clear,
    subscribe,
  });
})();
