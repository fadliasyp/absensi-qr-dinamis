(function () {
  const prefix = "wa_message_template";

  function storageKey(type, sessionId) {
    return `${prefix}:${type}:${sessionId}`;
  }

  function get(type, sessionId) {
    try {
      return globalThis.localStorage.getItem(storageKey(type, sessionId)) || "";
    } catch {
      return "";
    }
  }

  function set(type, sessionId, template) {
    try {
      globalThis.localStorage.setItem(
        storageKey(type, sessionId),
        String(template),
      );
      return true;
    } catch {
      return false;
    }
  }

  function clear(type, sessionId) {
    try {
      globalThis.localStorage.removeItem(storageKey(type, sessionId));
      return true;
    } catch {
      return false;
    }
  }

  function render(template, values) {
    return Object.entries(values).reduce(
      (message, [name, value]) =>
        message.split(`{${name}}`).join(String(value ?? "")),
      String(template || ""),
    );
  }

  globalThis.WaMessageTemplate = Object.freeze({ get, set, clear, render });
})();
