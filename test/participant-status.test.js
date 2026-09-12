import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("inactive participants are excluded from attendance and WhatsApp flows", async () => {
  const [api, page, migration] = await Promise.all([
    readFile("api/index.js", "utf8"),
    readFile("public/peserta.html", "utf8"),
    readFile(
      "supabase/migrations/20260912000000_add_participant_is_active.sql",
      "utf8",
    ),
  ]);

  assert.match(migration, /is_active boolean not null default true/i);
  assert.ok((api.match(/\.eq\("is_active", true\)/g) || []).length >= 2);
  assert.ok((api.match(/participant\.is_active === false/g) || []).length >= 2);
  assert.match(api, /participants!inner/);
  assert.match(api, /\.eq\("participants\.is_active", true\)/);
  assert.match(page, /id="statusFilter"/);
  assert.match(page, /toggleParticipantStatus/);
});
